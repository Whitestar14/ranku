const isInline = (url: string) =>
  url.startsWith("data:") || url.startsWith("blob:");

/**
 * Reads an image into a blob for the clipboard or a file. Both poster CDNs
 * send permissive CORS headers, so a direct fetch is enough. A URL that
 * refuses CORS returns null and the caller falls back to opening it.
 */
export async function fetchImageBlob(src: string): Promise<Blob | null> {
  if (!src) return null;
  try {
    const response = await fetch(src, {
      mode: "cors",
      credentials: "omit",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

const asPngBlob = async (blob: Blob): Promise<Blob> => {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (png) => (png ? resolve(png) : reject(new Error("PNG encoding failed"))),
      "image/png",
    ),
  );
};

export async function copyImageToClipboard(src: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      return false;
    }
    const blob = await fetchImageBlob(src);
    if (!blob) return false;
    const png = await asPngBlob(blob);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;
  } catch {
    return false;
  }
}

export async function downloadImage(
  src: string,
  filename: string,
): Promise<boolean> {
  const blob = await fetchImageBlob(src);
  if (blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    /* Safari can cancel the download when the URL is revoked in the same turn. */
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  }

  if (isInline(src)) return false;
  window.open(src, "_blank", "noopener,noreferrer");
  return false;
}
