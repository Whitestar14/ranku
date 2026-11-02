import React from "react";
import { buildPixelText, isPixelText, PIXEL_ROWS } from "./pixelFont";

interface PixelTextProps {
  text: string;
  /**
   * Rendered height in px. Prefer a whole multiple of the 7px grid (7, 14, 21)
   * so every pixel lands on a whole device pixel and none look fatter than
   * their neighbours.
   */
  height?: number;
  className?: string;
  /** Overrides the readable label when the bitmap is decorative. */
  label?: string;
  /** Shrinks to the container instead of forcing the bitmap's natural width. */
  fit?: boolean;
}

/**
 * Sets a string in the app's bitmap alphabet.
 *
 * Glyphs are paths, not text: they survive export byte-for-byte and never rely
 * on a webfont being loaded. Uppercase only — the bitmap has no miniscules to
 * pretend otherwise.
 */
export const PixelText: React.FC<PixelTextProps> = ({
  text,
  height = 14,
  className,
  label,
  fit = false,
}) => {
  /* A title is user content, so a character the bitmap cannot draw must not
     vanish. Falling back to the interface face keeps every name readable while
     the alphabet grows. */
  if (!isPixelText(text)) {
    return (
      <span
        className={className}
        style={{ fontSize: height, lineHeight: 1.2 }}
        aria-label={label}
      >
        {text}
      </span>
    );
  }

  const { d, units } = buildPixelText(text);

  return (
    <svg
      viewBox={`0 0 ${units} ${PIXEL_ROWS}`}
      width={fit ? undefined : (units / PIXEL_ROWS) * height}
      height={height}
      preserveAspectRatio={fit ? "xMinYMid meet" : undefined}
      style={fit ? { maxWidth: "100%" } : undefined}
      role="img"
      aria-label={label ?? text}
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={d} />
    </svg>
  );
};
