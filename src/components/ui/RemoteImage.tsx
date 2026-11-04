import React, { useEffect, useRef, useState } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { imageKey } from "@/utils/imageKey";

export interface RemoteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  /** Rendered when every attempt fails. */
  fallback?: React.ReactNode;
  /** Suppress the loading placeholder (for places that draw their own). */
  noPlaceholder?: boolean;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_200;

type Status = "loading" | "loaded" | "failed";

/**
 * A plain image with a loading sheen, a remount-based retry, and a fallback.
 * The browser owns caching and decoding. There is no custom failure cache, so
 * an image that failed once gets another chance on its next mount.
 */
export const RemoteImage: React.FC<RemoteImageProps> = ({
  src,
  fallback,
  onError,
  onLoad,
  className = "",
  noPlaceholder = false,
  style,
  ...props
}) => {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setAttempt(0);
    setStatus("loading");
  }, [src]);

  useEffect(() => {
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, []);

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
        key={`${imageKey(src)}:${attempt}`}
        src={src}
        draggable={false}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-300 ease-standard"
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
