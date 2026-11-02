import type { ProjectType, Rank } from "@/types";
import { autoBoardBackground } from "@/theme/palettes";
import { DEFAULT_ASPECT } from "./ui";

const HAIRLINE = "var(--material-hairline)";

/** Card tiles are individually rounded; this is the default when none is set. */
export const DEFAULT_CARD_RADIUS = 16;
/** The width a grid tile opens at before the user narrows it. */
export const DEFAULT_CELL_WIDTH = 240;
/** The range every control that resizes a grid tile shares. */
export const CELL_WIDTH_MIN = 60;
export const CELL_WIDTH_MAX = 300;
/** How tall one tier row's item rail stands. */
export const DEFAULT_TIER_ROW_HEIGHT = 88;

export const TIER_SPACING = { spaced: 8, tight: 0 } as const;
export type TierSpacing = keyof typeof TIER_SPACING;
export const DEFAULT_TIER_SPACING: TierSpacing = "tight";

export const tierGapFor = (spacing: TierSpacing) => TIER_SPACING[spacing];

/** Corner treatment for tier artwork. Labels and the sheet itself stay square. */
export type TierCorners = "rounded" | "square";
export const DEFAULT_TIER_CORNERS: TierCorners = "square";

export const tierRadiusFor = (corners: TierCorners) =>
  corners === "square" ? 0 : DEFAULT_CARD_RADIUS;

export const tierItemRadius = (height: number, corners: TierCorners) =>
  corners === "square" ? 0 : Math.min(12, Math.round(height / 7));
/** Gutter a board seeds when the Card style is first chosen. */
export const DEFAULT_CARD_GAP = 8;

export interface BoardStyle {
  isCard: boolean;
  /** Corner radius in px. A seamless board is square so it reads as one collage. */
  radius: number;
  /** Gutter between positions or rows, in px. */
  gap: number;
  borderless: boolean;
  showNumbers: boolean;
  showTitle: boolean;
  showDate: boolean;
  showWatermark: boolean;
  /** Aspect ratio in `w:h` form. */
  aspectRatio: string;
  /** Horizontal placement of tier rail contents. */
  justify: "left" | "center" | "right";
  /** Tile edge length for a grid board, in px. */
  cellWidth: number;
  /** Item rail height for a tier list row, in px. */
  tierRowHeight: number;
  /** The resolved tier spacing preset. */
  tierSpacing: TierSpacing;
  /** Whether the tier sheet and its artwork are rounded or square. */
  tierCorners: TierCorners;
  tierRadius: number;
  /** Gutter and inset around a tier row's items, in px. Derived from spacing. */
  tierGap: number;
}

export const SHEET_WIDTH: Record<ProjectType, string> = {
  ranking: "w-fit max-w-full",
  list: "w-full max-w-3xl",
  tierlist: "w-full max-w-6xl",
};

export const selectActiveBoard = (state: {
  activeRankId: string;
  ranks: Record<string, Rank>;
}): BoardStyle | null => {
  const rank = state.ranks[state.activeRankId];
  return rank ? resolveBoardStyle(rank) : null;
};

export const resolveBoardStyle = (rank: Rank): BoardStyle => {
  const legacyCard = rank.style === "card";
  const radius = rank.borderRadius ?? (legacyCard ? DEFAULT_CARD_RADIUS : 0);
  const gap = rank.gap ?? 0;
  const isCard = radius > 0 || gap > 0;
  return {
    isCard,
    radius,
    gap,
    borderless: rank.borderless ?? false,
    showNumbers: rank.showNumbers ?? true,
    showTitle: rank.showTitle !== false,
    showDate: rank.showDate !== false,
    showWatermark: rank.showWatermark !== false,
    aspectRatio: rank.aspectRatio || DEFAULT_ASPECT,
    justify: rank.gridJustify ?? (rank.type === "tierlist" ? "left" : "center"),
    cellWidth: rank.cellWidth ?? DEFAULT_CELL_WIDTH,
    tierRowHeight: rank.tierRowHeight ?? DEFAULT_TIER_ROW_HEIGHT,
    tierSpacing: rank.tierSpacing ?? DEFAULT_TIER_SPACING,
    tierGap: tierGapFor(rank.tierSpacing ?? DEFAULT_TIER_SPACING),
    tierCorners: rank.tierCorners ?? DEFAULT_TIER_CORNERS,
    tierRadius: tierRadiusFor(rank.tierCorners ?? DEFAULT_TIER_CORNERS),
  };
};

/** Resolves `auto` at paint time so the sheet follows appearance changes. */
export const resolveBoardBackground = (
  color: string,
  theme: { isDark?: boolean },
): string => {
  if (color !== "auto") return color;
  return autoBoardBackground(theme.isDark ?? true);
};

export const restingTileShadow = ({
  borderless,
  gap,
  index,
  cols,
  count,
}: {
  borderless: boolean;
  gap: number;
  index: number;
  cols: number;
  count: number;
}): string | undefined => {
  if (borderless) return undefined;
  if (gap > 0) return `0 0 0 0.5px ${HAIRLINE}`;
  return [
    `0 -0.5px 0 0 ${HAIRLINE}`,
    `-0.5px 0 0 0 ${HAIRLINE}`,
    index % cols === cols - 1 ? `0.5px 0 0 0 ${HAIRLINE}` : null,
    index + cols >= count ? `0 0.5px 0 0 ${HAIRLINE}` : null,
  ]
    .filter(Boolean)
    .join(", ");
};

export const tileStateShadow = ({
  isSelected,
  resting,
}: {
  isSelected: boolean;
  resting: string | undefined;
}): string | undefined =>
  isSelected ? "0 0 0 2px var(--color-primary)" : resting;

/** The wash a drop target takes on while something hovers over it. */
export const dropTint = (amount = 20) =>
  `color-mix(in srgb, var(--color-primary) ${amount}%, transparent)`;
