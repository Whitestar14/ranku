export const DEFAULT_TIER_COLORS = [
  "#ff6b6b",
  "#ffa94d",
  "#ffd43b",
  "#69db7c",
  "#4dabf7",
  "#adb5bd",
] as const;

/** The defaults, plus the extra hues offered for tiers beyond the first six. */
export const TIER_COLORS = [
  ...DEFAULT_TIER_COLORS,
  "#9775fa",
  "#f783ac",
  "#38d9a9",
  "#e599f7",
] as const;

/** The neutral a tier falls back to when every palette hue is taken. */
export const FALLBACK_TIER_COLOR = "#adb5bd";

/** A usable six-digit hex colour, or the fallback when the value is malformed. */
export const normalizeTierColor = (
  value: string,
  fallback = FALLBACK_TIER_COLOR,
): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return fallback;
};
