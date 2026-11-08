export const DEFAULT_ASPECT = "3:4";

/** Numeric width ÷ height for a project ratio, e.g. "16:9" -> 1.777. */
export const ratioValue = (ratio?: string): number => {
  const [width, height] = (ratio || DEFAULT_ASPECT).split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 3 / 4;
};

/** CSS `aspect-ratio` value, e.g. "3 / 4". */
export const aspectToCss = (ratio?: string): string => {
  const [w, h] = (ratio || DEFAULT_ASPECT).split(":");
  const width = Number(w);
  const height = Number(h);
  return `${width > 0 ? width : 3} / ${height > 0 ? height : 4}`;
};

/**
 * The width a tile of `ratio` needs to stand `height` tall. Lets the tier rail
 * and list thumbnails align to a shared baseline height while still honouring
 * the user's chosen aspect ratio.
 */
export const widthForHeight = (ratio: string | undefined, height: number) =>
  Math.round(height * ratioValue(ratio));
