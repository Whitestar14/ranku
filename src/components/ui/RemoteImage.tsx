import React, { useEffect, useRef, useState } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { imageKey } from "@/utils/imageKey";

export interface RemoteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  /** Rendered when every attempt fails. */
  fallback?: React.ReactNode;
  /** Suppress the loading placeholder (for places that draw their own). */
  noPlaceholder?: boolean;
  /** How the artwork fills its box. Previews that must show the whole image
   *  ask for `contain`; tiles and thumbnails keep the default. */
  fit?: "cover" | "contain";
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_200;

type Status = "loading" | "loaded" | "failed";

/**
 * A plain image with a loading sheen, a remount-based retry, and a fallback.
 * The browser owns caching and decoding. There is no custom failure cache, so
 * an image that failed once gets another chance on its next mount.
 *
 * The sheen is tied to the image element's own state, never to the load event
 * alone: a cached or inline image can finish decoding before React is able to
 * listen, and waiting for an event that already happened leaves the sheen
 * spinning forever — which is exactly what every poster did after a reload.
 */
export const RemoteImage: React.FC<RemoteImageProps> = ({
  src,
  fallback,
  onError,
  onLoad,
  className = "",
  noPlaceholder = false,
  fit = "cover",
  style,
  ...props
}) => {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [trackedSrc, setTrackedSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const timer = useRef<number | undefined>(undefined);

  /* Derived during render rather than in an effect. An effect runs after the
     browser may already have fired `load`, and writing "loading" back on top
     of it would undo the one update that mattered. */
  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setAttempt(0);
    setStatus("loading");
  }

  useEffect(() => {
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, []);

  /* Settle against the element on every commit. `complete` covers the case the
     load event misses; `naturalWidth` separates pixels from a silent failure. */
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;

    if (img.naturalWidth > 0) {
      setStatus("loaded");
      return;
    }

    // It finished without pixels, so it errored before a handler could run.
    if (attempt + 1 >= MAX_ATTEMPTS) {
      setStatus("failed");
      return;
    }
    const id = window.setTimeout(() => {
      setAttempt((value) => value + 1);
      setStatus("loading");
    }, RETRY_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [src, attempt]);

  const retry = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    if (attempt + 1 >= MAX_ATTEMPTS) {
      setStatus("failed");
      return;
    }
    timer.current = window.setTimeout(() => {
      setAttempt((value) => value + 1);
      setStatus("loading");
    }, RETRY_DELAY_MS);
  };

  if (!src || status === "failed") {
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
        key={`${imageKey(src)}:${attempt}`}
        src={src}
        draggable={false}
        referrerPolicy="no-referrer"
        className={`absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-300 ease-standard ${
          fit === "contain" ? "object-contain" : "object-cover"
        }`}
        style={{
          ...style,
          opacity: status === "loaded" ? (style?.opacity ?? 1) : 0,
        }}
        onLoad={(event) => {
          setStatus("loaded");
          onLoad?.(event);
        }}
        onError={(event) => {
          retry();
          if (attempt + 1 >= MAX_ATTEMPTS) onError?.(event);
        }}
      />
      {status !== "loaded" && !noPlaceholder && (
        <span aria-hidden data-export-hide="" className="img-sheen" />
      )}
    </span>
  );
};
