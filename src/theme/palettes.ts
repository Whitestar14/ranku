/** Perceived brightness of `#rrggbb`, 0–255. */
const luminance = (hex: string): number => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000;
};

/**
 * Whether a swatch reads as light. Higher than `getContrastColor`'s threshold:
 * a checkmark sits on the colour and needs more headroom than text.
 */
export const isLightColor = (hex: string): boolean => luminance(hex) > 160;

export const getContrastColor = (hex: string) => {
  if (hex === "transparent") return "var(--color-text)";
  return luminance(hex) >= 128 ? "#000000" : "#ffffff";
};

export const accentForeground = (hex: string | undefined) => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  return luminance(hex) >= 186 ? "#000000" : "#ffffff";
};

/** The `auto` board sheet follows the appearance, nothing else. */
export const autoBoardBackground = (isDark: boolean): string =>
  isDark ? "#1c1c1e" : "#ffffff";
