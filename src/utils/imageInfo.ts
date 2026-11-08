/**
 * Everything the UI can say about an image without asking a provider. The
 * library stores only the source and when it arrived, so these helpers turn
 * that into the facts someone needs while debugging a poster.
 */

/** CDN hosts worth naming; anything else is shown as its hostname. */
const KNOWN_HOSTS: Record<string, string> = {
  "anilist.co": "AniList",
  "s4.anilist.co": "AniList",
  "myanimelist.net": "MyAnimeList",
  "cdn.myanimelist.net": "MyAnimeList",
  "imgur.com": "Imgur",
  "i.imgur.com": "Imgur",
  "discordapp.com": "Discord",
  "cdn.discordapp.com": "Discord",
  "media.discordapp.net": "Discord",
};

export const isInlineImage = (src: string): boolean =>
  src.startsWith("data:") || src.startsWith("blob:");

/** The host the artwork came from, or null for an inline image. */
export function imageHost(src: string): string | null {
  if (isInlineImage(src)) return null;
  try {
    return new URL(src).hostname || null;
  } catch {
    return null;
  }
}

/** A human source label: provider name, hostname, or how it was added. */
export function imageSourceLabel(src: string): string {
  if (src.startsWith("data:")) return "Local upload";
  if (src.startsWith("blob:")) return "Local paste";
  const host = imageHost(src);
  if (!host) return "Unknown source";
  return KNOWN_HOSTS[host] ?? host;
}

/** A display name derived from the URL; providers rarely expose one. */
export function imageFileName(src: string): string {
  if (src.startsWith("data:")) return "Inline image";
  if (src.startsWith("blob:")) return "Pasted image";

  try {
    const path = new URL(src).pathname;
    const last = path.split("/").filter(Boolean).pop() ?? "";
    let decoded = last;
    try {
      decoded = decodeURIComponent(last);
    } catch {
      /* A malformed escape is still more useful than an empty name. */
    }
    return decoded || "Remote image";
  } catch {
    return "Remote image";
  }
}

/** `JPEG`, `PNG`, ... — from the data URL's mime type or the file extension. */
export function imageFormatLabel(src: string): string {
  if (src.startsWith("data:")) {
    const mime = /^data:([^;,]+)/i.exec(src)?.[1]?.toLowerCase();
    const subtype = mime?.split("/")[1];
    return subtype ? subtype.toUpperCase() : "Unknown";
  }
  const extension = /\.([a-z0-9]{2,5})$/i.exec(imageFileName(src))?.[1];
  return extension ? extension.toUpperCase() : "Unknown";
}

/** Byte count of an inline base64 image, or null when it cannot be computed. */
export function inlineImageBytes(src: string): number | null {
  const comma = src.indexOf(",");
  if (comma === -1) return null;
  if (!/;base64$/i.test(src.slice(0, comma))) return null;

  const payload = src.slice(comma + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

/** A stable, readable timestamp for the info sheet. */
export function formatAdded(at: number | undefined): string {
  if (!at || !Number.isFinite(at)) return "Unknown";
  return new Date(at).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
