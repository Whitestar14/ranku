import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  imageCandidates,
  originOf,
  originPreference,
  rememberOriginPreference,
  reportProxyFailure,
  reportProxySuccess,
} from "@/utils/imageProxy";
import { dominantColor, subscribeDominantColor } from "@/utils/dominantColor";
import { boundCache } from "@/utils/lru";
import { imageKey } from "@/utils/imageKey";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export interface RemoteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  /** Rendered when every candidate fails. */
  fallback?: React.ReactNode;
  /** Suppress the loading placeholder (for places that draw their own). */
  noPlaceholder?: boolean;
  /**
   * Sample the image and tint its loading sheen. Decoding a second copy for a
   * colour is only worth it on large board tiles, not dock or search thumbnails.
   */
  colorPlaceholder?: boolean;
}

const originIndex = originPreference;

/** How long a proxy gets before the CDN is asked directly. */
const PROXY_TIMEOUT_MS = 2_200;
const DIRECT_TIMEOUT_MS = 12_000;

const CACHE_LIMIT = 400;
const resolvedSrc = new Map<string, string>();
const loadedSrc = new Set<string>();
const failedSrc = new Map<string, number>();

/** A failure is a hint, not a verdict: remounting after this retries. */
const FAILURE_TTL = 20_000;
const RETRY_AFTER = 15_000;

const cacheCandidateUrl = (key: string, url: string) => {
  resolvedSrc.set(key, url);
  boundCache(resolvedSrc, CACHE_LIMIT);
};

const cacheLoaded = (key: string) => {
  loadedSrc.add(key);
  boundCache(loadedSrc, CACHE_LIMIT);
};

const cacheFailed = (key: string) => {
  failedSrc.set(key, Date.now());
  boundCache(failedSrc, CACHE_LIMIT);
};

const failedRecently = (key: string) => {
  const at = failedSrc.get(key);
  if (at === undefined) return false;
  if (Date.now() - at > FAILURE_TTL) {
    failedSrc.delete(key);
    return false;
  }
  return true;
};

const preferredIndex = (
  key: string,
  candidates: ReturnType<typeof imageCandidates>,
  origin: string | null,
) => {
  const cached = resolvedSrc.get(key);
  if (cached) {
    const found = candidates.findIndex((candidate) => candidate.url === cached);
    if (found >= 0) return found;
  }
  const remembered = origin ? originIndex.get(origin) : undefined;
  if (remembered) {
    const found = candidates.findIndex(
      (candidate) => candidate.key === remembered,
    );
    if (found >= 0) return found;
  }
  return 0;
};

export const RemoteImage: React.FC<RemoteImageProps> = ({
  src,
  fallback,
  onError,
  onLoad,
  className = "",
  noPlaceholder = false,
  colorPlaceholder = false,
  style,
  ...props
}) => {
  const key = useMemo(() => imageKey(src), [src]);
  const candidates = useMemo(() => imageCandidates(src), [src]);
  const origin = useMemo(() => (src ? originOf(src) : null), [src]);
  const startIndex = useMemo(
    () => preferredIndex(key, candidates, origin),
    [key, candidates, origin],
  );

  const [index, setIndex] = useState(startIndex);
  const [failed, setFailed] = useState(() => failedRecently(key));
  const [loaded, setLoaded] = useState(() => loadedSrc.has(key));
  const [placeholderColor, setPlaceholderColor] = useState<string | undefined>(
    () =>
      colorPlaceholder && !loadedSrc.has(key) ? dominantColor(src) : undefined,
  );
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIndex(startIndex);
    setFailed(failedRecently(key));
    setLoaded(loadedSrc.has(key));
  }, [key, startIndex]);

  useEffect(() => {
    if (!colorPlaceholder || !src || loadedSrc.has(key)) {
      setPlaceholderColor(undefined);
      return;
    }
    setPlaceholderColor(dominantColor(src));
    return subscribeDominantColor(src, setPlaceholderColor);
  }, [colorPlaceholder, key, src]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      cacheLoaded(key);
      setLoaded(true);
    }
  }, [key, candidates]);

  const candidate = candidates[index];

  const advance = useCallback(() => {
    if (index + 1 < candidates.length) setIndex(index + 1);
    else {
      cacheFailed(key);
      setFailed(true);
    }
  }, [index, candidates.length, key]);

  /* Give a transient failure a second chance without needing a reload. */
  useEffect(() => {
    if (!failed) return;
    const timer = window.setTimeout(() => {
      failedSrc.delete(key);
      setIndex(startIndex);
      setFailed(false);
    }, RETRY_AFTER);
    return () => window.clearTimeout(timer);
  }, [failed, key, startIndex]);

  /* A dead proxy answers only after the browser gives up, so give every
     candidate a deadline of its own and move on. */
  useEffect(() => {
    if (loaded || failed || !candidate) return;
    const timer = window.setTimeout(
      () => {
        if (candidate.viaProxy) reportProxyFailure(candidate.key);
        advance();
      },
      candidate.viaProxy ? PROXY_TIMEOUT_MS : DIRECT_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [candidate, index, candidates.length, key, loaded, failed, advance]);

  if (!src || failed || !candidate) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <span
        className={`@container relative grid place-items-center overflow-hidden bg-surface-secondary text-faint ${className}`}
        aria-label="Image unavailable"
        role="img"
      >
        <span className="flex flex-col items-center gap-1 px-1 text-center leading-none">
          <PixelIcon name="broken" size={16} className="shrink-0" />
          <span className="hidden text-caption-2 font-medium leading-none select-none @[64px]:block">
            No preview
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <img
        {...props}
        ref={imgRef}
        src={candidate.url}
        draggable={false}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-300 ease-standard"
        style={{
          ...style,
          opacity: loaded ? (style?.opacity ?? 1) : 0,
        }}
        onLoad={(event) => {
          if (origin) rememberOriginPreference(origin, candidate.key);
          if (candidate.viaProxy) reportProxySuccess(candidate.key);
          if (candidates.length > 1) cacheCandidateUrl(key, candidate.url);
          cacheLoaded(key);
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          if (candidate.viaProxy) reportProxyFailure(candidate.key);
          advance();
          onError?.(event);
        }}
      />
      {!loaded && !noPlaceholder && (
        <span
          aria-hidden
          data-export-hide=""
          className="img-sheen"
          style={
            placeholderColor ? { backgroundColor: placeholderColor } : undefined
          }
        />
      )}
    </span>
  );
};
