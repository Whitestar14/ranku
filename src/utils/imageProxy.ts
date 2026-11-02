import { boundCache } from "./lru";

/** From `.env`; unset in a bare checkout. */
const CONFIGURED_PROXY = (
  (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_IMAGE_PROXY_URL ?? ""
).trim();

/** The deployed image proxy (see `render.yaml` / `backend/app.py`). */
const DEPLOYED_PROXY = "https://anigrid-api.onrender.com/proxy/image";

const isInline = (url: string) =>
  url.startsWith("data:") || url.startsWith("blob:");

export function proxyUrlFor(base: string, externalUrl: string) {
  return `${base}?url=${encodeURIComponent(externalUrl)}`;
}

export const getProxiedImageUrl = (
  externalUrl: string,
  base: string = CONFIGURED_PROXY || DEPLOYED_PROXY,
): string => {
  if (
    !externalUrl ||
    typeof externalUrl !== "string" ||
    isInline(externalUrl)
  ) {
    return externalUrl || "";
  }
  if (!base) return externalUrl;
  return proxyUrlFor(base, externalUrl);
};

export interface ImageCandidate {
  url: string;
  /** Identifies the strategy, for the per-origin preference cache. */
  key: string;
  /** True when the candidate goes through the image proxy. */
  viaProxy: boolean;
}

const proxyBases = (): string[] =>
  [CONFIGURED_PROXY, DEPLOYED_PROXY].filter(
    (base, i, all) => !!base && all.indexOf(base) === i,
  );

const PROXY_FAILURE_TTL = 60_000;
const PROXY_STRIKES = 2;
const proxyRetryAt = new Map<string, number>();
const proxyStrikes = new Map<string, number>();

const proxyIsReachable = (base: string) =>
  (proxyRetryAt.get(base) ?? 0) <= Date.now();

/** Records a failed proxy request; the second consecutive one pauses it. */
export function reportProxyFailure(base: string) {
  if (!base) return;
  const strikes = (proxyStrikes.get(base) ?? 0) + 1;
  if (strikes < PROXY_STRIKES) {
    proxyStrikes.set(base, strikes);
    return;
  }
  proxyStrikes.delete(base);
  proxyRetryAt.set(base, Date.now() + PROXY_FAILURE_TTL);
}

export function reportProxySuccess(base: string) {
  proxyStrikes.delete(base);
  proxyRetryAt.delete(base);
}

/** One background request at boot so the first image already knows the route. */
export function primeImageProxy() {
  const base = proxyBases()[0];
  if (!base) return;
  const probe =
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/bx1-CXtrrkMpJ8Zq.png";
  void fetch(proxyUrlFor(base, probe), {
    mode: "cors",
    credentials: "omit",
    signal: AbortSignal.timeout(2500),
  })
    .then((response) =>
      response.ok ? reportProxySuccess(base) : reportProxyFailure(base),
    )
    .catch(() => reportProxyFailure(base));
}

/**
 * Endpoints on each configured proxy host for a sibling route, e.g.
 * `/proxy/anilist`. Used to route metadata through the backend so it gets the
 * same server-side guards as images.
 */
export function proxyEndpointUrls(path: string): string[] {
  return proxyBases()
    .map((base) => {
      try {
        return new URL(base).origin + path;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function originOf(url: string): string | null {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return null;
  }
}

/** The ordered ways to try loading `src`. */
export function imageCandidates(src: string): ImageCandidate[] {
  if (!src) return [];
  if (isInline(src)) return [{ url: src, key: "inline", viaProxy: false }];

  // Same-origin and loopback files need no proxy, and routing them through one
  // adds a failing round trip in development.
  try {
    const { origin, hostname } = new URL(src, window.location.href);
    if (
      origin === window.location.origin ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    ) {
      return [{ url: src, key: "direct", viaProxy: false }];
    }
  } catch {
    return [];
  }

  const bases = proxyBases();
  const healthy = bases.filter(proxyIsReachable);
  const stale = bases.filter((base) => !proxyIsReachable(base));
  const proxies = (list: string[]): ImageCandidate[] =>
    list.map((base) => ({
      url: proxyUrlFor(base, src),
      key: base,
      viaProxy: true,
    }));

  return [
    ...proxies(healthy),
    { url: src, key: "direct", viaProxy: false },
    ...proxies(stale),
  ];
}

/** The candidate *strategy* that last worked for an origin (a proxy URL or
 *  "direct"), stored by key because the order changes as proxies go stale. */
export const originPreference = new Map<string, string>();
const ORIGIN_PREFERENCE_LIMIT = 50;

export const rememberOriginPreference = (origin: string, key: string) => {
  originPreference.set(origin, key);
  boundCache(originPreference, ORIGIN_PREFERENCE_LIMIT);
};

export async function fetchImageBlob(src: string): Promise<Blob | null> {
  if (!src) return null;
  if (isInline(src)) {
    try {
      return await (await fetch(src)).blob();
    } catch {
      return null;
    }
  }

  for (const candidate of imageCandidates(src)) {
    try {
      const response = await fetch(candidate.url, {
        mode: "cors",
        credentials: "omit",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        // A 4xx is about this file, not the proxy's health.
        if (candidate.viaProxy && response.status >= 500) {
          reportProxyFailure(candidate.key);
        }
        continue;
      }
      const blob = await response.blob();
      if (blob.size > 0) {
        if (candidate.viaProxy) reportProxySuccess(candidate.key);
        return blob;
      }
    } catch {
      if (candidate.viaProxy) reportProxyFailure(candidate.key);
    }
  }
  return null;
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
    // Revoke on the next frame since allowing revoking synchronously can cancel the download
    // in Safari.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  }

  window.open(getProxiedImageUrl(src), "_blank", "noopener,noreferrer");
  return false;
}
