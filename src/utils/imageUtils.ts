export type ImageFormat = "png" | "jpeg";

type ExportLib = typeof import("html-to-image");

/**
 * html-to-image is only needed once someone exports, so it is fetched on
 * demand instead of being parsed with the rest of the app at startup.
 */
let exportLib: Promise<ExportLib> | null = null;
const loadExportLib = () => (exportLib ??= import("html-to-image"));

/** Marks the element that is the board itself, inside the export sheet. */
export const EXPORT_BOARD_ATTR = "data-export-board";

const MAX_EXPORT_PIXELS = 24_000_000;

/* A transparent pixel placeholder to avoid aborting the whole project when hitting an unreadable poster. */
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

let fontEmbedCss: Promise<string> | null = null;

/** The webfont subset is the same every time, so it is fetched only once. */
const fontEmbed = () =>
  (fontEmbedCss ??= loadExportLib()
    .then(({ getFontEmbedCSS }) =>
      getFontEmbedCSS(document.body, { preferredFontFormat: "woff2" }),
    )
    .catch(() => ""));

export async function withBoardHuggingLayout<T>(
  sheet: HTMLElement,
  run: () => Promise<T>,
  trimPadding = false,
): Promise<T> {
  const previousWidth = sheet.style.width;
  const previousPadding = sheet.style.padding;
  const previousTransition = sheet.style.transition;
  const previousGrain = sheet.style.getPropertyValue("--material-grain");

  sheet.setAttribute("data-exporting", "");

  try {
    /* The grain tile is an SVG whose internal `url(#g)` filter looks like a
       fetchable resource to html-to-image, which then aborts the render. */
    sheet.style.setProperty("--material-grain", "none");
    sheet.style.transition = "none";
    if (trimPadding) sheet.style.padding = "0px";

    const board = sheet.querySelector<HTMLElement>(`[${EXPORT_BOARD_ATTR}]`);
    const target = board ?? sheet;
    const styles = getComputedStyle(sheet);
    const horizontalPadding =
      parseFloat(styles.paddingLeft || "0") +
      parseFloat(styles.paddingRight || "0");
    const boardWidth = Math.ceil(target.offsetWidth);

    if (boardWidth > 0) {
      sheet.style.width = `${boardWidth + horizontalPadding}px`;
    }

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    return await run();
  } finally {
    sheet.style.width = previousWidth;
    sheet.style.padding = previousPadding;
    sheet.style.transition = previousTransition;
    if (previousGrain)
      sheet.style.setProperty("--material-grain", previousGrain);
    else sheet.style.removeProperty("--material-grain");
    sheet.removeAttribute("data-exporting");
  }
}

const flattenOnWhite = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const flat = document.createElement("canvas");
  flat.width = source.width;
  flat.height = source.height;
  const ctx = flat.getContext("2d");
  if (!ctx) return source;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(source, 0, 0);
  return flat;
};

const pixelRatioFor = (node: HTMLElement, requested: number) => {
  const pixels = node.offsetWidth * node.offsetHeight;
  if (!pixels) return requested;
  const ceiling = Math.sqrt(MAX_EXPORT_PIXELS / pixels);
  return Math.max(1, Math.min(requested, Math.floor(ceiling * 10) / 10));
};

async function renderImage(
  node: HTMLElement,
  format: ImageFormat,
  qualityScale: number,
): Promise<Blob> {
  const { toCanvas } = await loadExportLib();
  const canvas = await toCanvas(node, {
    pixelRatio: pixelRatioFor(node, qualityScale),
    /* Posters are already in the browser cache from the board. A plain fetch
       can reuse the wrong (uncors) entry, which shows up as a blank or stale
       tile in the export, so every resource is asked for fresh. */
    cacheBust: true,
    includeQueryParams: true,
    skipAutoScale: false,
    imagePlaceholder: TRANSPARENT_PIXEL,
    /* html-to-image rejects the whole render when a poster cannot be inlined;
       a blank tile is the better failure mode. */
    onImageErrorHandler: () => undefined,
    preferredFontFormat: "woff2",
    fontEmbedCSS: await fontEmbed(),
  });

  /* JPG has no alpha, so a transparent board would otherwise turn black. */
  const target = format === "jpeg" ? flattenOnWhite(canvas) : canvas;

  const blob = await new Promise<Blob>((resolve, reject) => {
    target.toBlob(
      (encoded) =>
        encoded ? resolve(encoded) : reject(new Error("Empty export")),
      format === "jpeg" ? "image/jpeg" : "image/png",
      format === "jpeg" ? 0.92 : undefined,
    );
  });

  // Free the backing store without waiting for the GC.
  canvas.width = 0;
  canvas.height = 0;
  if (target !== canvas) {
    target.width = 0;
    target.height = 0;
  }
  return blob;
}

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

const safeName = (title: string) =>
  (title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "board").slice(0, 80);

export const downloadGrid = async (
  element: HTMLElement,
  title: string,
  format: ImageFormat = "png",
  qualityScale: number = 2,
  trimPadding: boolean = false,
) => {
  try {
    const blob = await withBoardHuggingLayout(
      element,
      () => renderImage(element, format, qualityScale),
      trimPadding,
    );
    saveBlob(blob, `${safeName(title)}.${format}`);
  } catch {
    throw new Error(
      "Export failed. External images cannot be embedded due to CORS restrictions.",
    );
  }
};

export const copyGrid = async (
  element: HTMLElement,
  qualityScale: number = 2,
  trimPadding: boolean = false,
) => {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Clipboard images are not supported here.");
    }
    /* Safari only accepts a ClipboardItem created inside the gesture, so the
       render is handed over as a promise instead of being awaited first. */
    const png = withBoardHuggingLayout(
      element,
      () => renderImage(element, "png", qualityScale),
      trimPadding,
    );
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
  } catch {
    throw new Error(
      "Copy failed. Your browser might not support clipboard operations or external images cannot be embedded.",
    );
  }
};


