export interface GridConfig {
  rows: number;
  cols: number;
}

export interface CellData {
  id: string;
  imageSrc: string | null;
  position: number;
  textLabel?: string;
  rating?: number;
  alignment?: "top" | "center" | "bottom";
  objectPosition?: string;
  zoom?: number;
}

export interface InboxItem {
  id: string;
  imageSrc: string;
  createdAt: number;
}

export interface InboxCollection {
  id: string;
  name: string;
  items: InboxItem[];
}

export type GridStyle = "seamless" | "card";
export type ProjectType = "ranking" | "list" | "tierlist";

export type VisualToggleKey =
  | "showNumbers"
  | "showTitle"
  | "showDate"
  | "showTiers"
  | "showWatermark"
  | "borderless";

export interface TierRow {
  id: string;
  label: string;
  color: string;
  items: CellData[];
}

export interface Rank {
  id: string;
  title: string;
  type: ProjectType;
  config: GridConfig;
  cells: CellData[];
  style: GridStyle;

  showNumbers: boolean;
  showTitle: boolean;
  showDate: boolean;
  showWatermark?: boolean;
  showTiers?: boolean;
  borderless?: boolean;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  cellWidth?: number;
  tierRowHeight?: number;
  tierSpacing?: "spaced" | "tight";
  tierCorners?: "rounded" | "square";
  borderRadius?: number;
  gap: number;
  gridJustify?: "left" | "center" | "right";
  backgroundColor: string;

  tierRows: TierRow[];

  createdAt: number;
  updatedAt: number;
}

export interface GlobalTheme {
  accentColor: string;
  isDark: boolean;
  /** Ignored legacy field from older backups. */
  paletteId?: string;
}

export type ImageSourcePreference = "auto" | "myanimelist" | "anilist";

export interface GlobalState {
  version: number;
  activeRankId: string;
  theme?: GlobalTheme;
  ranks: Record<string, Rank>;
  inbox: {
    collections: InboxCollection[];
    activeCollectionId: string;
    lastTargetCollectionId?: string;
  };
  preferences: {
    skipDuplicateWarning: boolean;
    reduceGlassEffects: boolean;
    /** Disables the SVG noise layer while keeping specular highlights. */
    disableGrain?: boolean;
    autoCloseDockOnDragDesktop: boolean;
    exportTrimmed?: boolean;
    /** Last image format chosen in the export sheet. */
    exportFormat?: "png" | "jpeg";
    /** Last scale chosen in the export sheet (1x, 2x, 3x). */
    exportQuality?: number;
    /** Persisted width of the project settings rail, in px. */
    railWidth?: number;
    /** Last explicit open/closed choice for the project rail. */
    sidebarOpen?: boolean;
    imageSource?: ImageSourcePreference;
  };
}

export type TransferSource =
  | { type: "cell"; index: number }
  | { type: "inbox"; collectionId: string; itemId?: string }
  | { type: "search"; imageSrc: string }
  | { type: "tier"; rowId: string; itemId: string };

export type TransferTarget =
  | { type: "inbox" }
  | { type: "cell"; index: number }
  | { type: "tier"; rowId: string; targetIndex: number };

/**
 * The one board surface the next dock tap will fill. Selection in the library
 * is deliberately not part of this: a card can be selected for bulk actions
 * without arming a drop anywhere.
 */
export type InteractionState =
  | { type: "cell"; index: number }
  | { type: "tier-item"; rowId: string; itemId: string }
  | null;

/** An image explicitly picked up from the dock, waiting for a board tap. */
export interface Placement {
  itemId: string;
  collectionId: string;
  imageSrc: string;
}
