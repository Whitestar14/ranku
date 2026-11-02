import { StateCreator } from "zustand";
import { AppState } from "../useStore";
import {
  TierRow,
  ProjectType,
  GridConfig,
  CellData,
  VisualToggleKey,
} from "@/types";
import {
  ensureCells,
  exclusiveProjectImages,
  newTierRowId,
  resizeCells,
  resolveActiveRankId,
  trackImage,
} from "@/utils/storeUtils";
import {
  createBlankRank,
  createRankLike,
  defaultBoardBackground,
} from "@/utils/storage";

export interface RankSlice {
  updateActiveRank: (updates: Partial<AppState["ranks"][string]>) => void;
  updateRankById: (
    id: string,
    updates: Partial<AppState["ranks"][string]>,
  ) => void;
  handleConfigChange: (newConfig: GridConfig) => void;

  handleVisualToggle: (key: VisualToggleKey) => void;
  handleCellUpload: (index: number, dataUrl: string) => void;
  handleUpdateCell: (index: number, data: Partial<CellData>) => void;
  handleCellClear: (index: number) => void;
  handleSwapCells: (fromIndex: number, toIndex: number) => void;
  handleReorderCells: (fromIndex: number, toIndex: number) => void;
  handleRecallFromBoard: (imageSrc: string) => void;
  handleUpdateTierItem: (
    rowId: string,
    itemId: string,
    data: Partial<CellData>,
  ) => void;
  handleUpdateTierRows: (rows: TierRow[]) => void;
  handleReorderTierRows: (fromIndex: number, toIndex: number) => void;
  handleTierItemRemove: (rowId: string, itemId: string) => void;

  handleNewRank: (type: ProjectType) => void;
  /** Blank project inheriting the active project's schema. Returns its id. */
  handleNewRankLikeCurrent: () => string | undefined;
  handleDeleteRank: (id: string) => void;
  /** Deletes several projects at once, optionally dropping their Library art. */
  handleDeleteRanks: (ids: string[], purgeLibrary?: boolean) => void;
  setActiveRankId: (id: string) => void;
}

const MAX_RANK_HISTORY = 30;

const rememberRank = (state: AppState, id: string) => {
  if (!id || !state.ranks[id]) return;
  state.rankHistory = (state.rankHistory ?? []).filter(
    (rankId) => rankId !== id,
  );
  state.rankHistory.push(id);
  if (state.rankHistory.length > MAX_RANK_HISTORY) state.rankHistory.shift();
};

export const createRankSlice: StateCreator<
  AppState,
  [["zustand/immer", never]],
  [],
  RankSlice
> = (set, get) => ({
  updateActiveRank: (updates) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current) {
        Object.assign(current, updates);
        current.updatedAt = Date.now();
      }
    }),
  updateRankById: (id, updates) =>
    set((state) => {
      const current = state.ranks[id];
      if (current) {
        Object.assign(current, updates);
        current.updatedAt = Date.now();
      }
    }),
  handleConfigChange: (newConfig) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (!current) return;

      const totalCells =
        current.type === "list"
          ? newConfig.rows
          : newConfig.rows * newConfig.cols;

      if (current.type === "list") {
        if (totalCells > current.cells.length) {
          ensureCells(current.cells, totalCells - 1);
        } else if (totalCells < current.cells.length) {
          current.cells = current.cells.slice(0, totalCells);
        }
      } else if (totalCells !== current.cells.length) {
        current.cells = resizeCells(
          current.cells,
          current.config.cols,
          newConfig.rows,
          newConfig.cols,
        );
      }
      current.config = newConfig;
      current.updatedAt = Date.now();
    }),

  handleVisualToggle: (key) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current) {
        const toggles = current as unknown as Record<
          VisualToggleKey,
          boolean | undefined
        >;
        toggles[key] = !toggles[key];
        current.updatedAt = Date.now();
      }
    }),
  handleCellUpload: (index, dataUrl) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current && current.cells[index]) {
        current.cells[index].imageSrc = dataUrl;
        trackImage(state.inbox, dataUrl);
        current.updatedAt = Date.now();
      }
    }),
  handleUpdateCell: (index, data) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current && current.cells[index]) {
        Object.assign(current.cells[index], data);
        if (typeof data.imageSrc === "string" && data.imageSrc) {
          trackImage(state.inbox, data.imageSrc);
        }
        current.updatedAt = Date.now();
      }
    }),
  handleCellClear: (index) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current && current.cells[index]) {
        current.cells[index].imageSrc = null;
        current.cells[index].textLabel = undefined;
        current.cells[index].rating = undefined;
        current.updatedAt = Date.now();
      }
    }),
  handleSwapCells: (fromIndex, toIndex) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current && current.cells[fromIndex] && current.cells[toIndex]) {
        const tempImage = current.cells[fromIndex].imageSrc;
        const tempLabel = current.cells[fromIndex].textLabel;
        const tempRating = current.cells[fromIndex].rating;

        current.cells[fromIndex].imageSrc = current.cells[toIndex].imageSrc;
        current.cells[fromIndex].textLabel = current.cells[toIndex].textLabel;
        current.cells[fromIndex].rating = current.cells[toIndex].rating;

        current.cells[toIndex].imageSrc = tempImage;
        current.cells[toIndex].textLabel = tempLabel;
        current.cells[toIndex].rating = tempRating;

        current.updatedAt = Date.now();
      }
    }),
  handleRecallFromBoard: (imageSrc) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (!current || !imageSrc) return;

      let cleared = false;

      current.cells.forEach((cell) => {
        if (cell.imageSrc !== imageSrc) return;
        cell.imageSrc = null;
        cell.textLabel = undefined;
        cell.rating = undefined;
        cell.zoom = undefined;
        cell.objectPosition = undefined;
        cleared = true;
      });

      current.tierRows.forEach((row) => {
        if (!row.items.some((i) => i.imageSrc === imageSrc)) return;
        row.items = row.items.filter((i) => i.imageSrc !== imageSrc);
        cleared = true;
      });

      if (!cleared) return;

      trackImage(state.inbox, imageSrc);

      current.updatedAt = Date.now();
    }),
  handleReorderCells: (fromIndex, toIndex) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current && fromIndex !== toIndex) {
        const [movedItem] = current.cells.splice(fromIndex, 1);
        current.cells.splice(toIndex, 0, movedItem);
        current.updatedAt = Date.now();
      }
    }),
  handleUpdateTierItem: (rowId, itemId, data) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current) {
        const row = current.tierRows.find((r) => r.id === rowId);
        if (row) {
          const item = row.items.find((i) => i.id === itemId);
          if (item) {
            Object.assign(item, data);
            if (typeof data.imageSrc === "string" && data.imageSrc) {
              trackImage(state.inbox, data.imageSrc);
            }
            current.updatedAt = Date.now();
          }
        }
      }
    }),
  handleUpdateTierRows: (rows) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (!current) return;
      current.tierRows = rows.map(ensureTierRowId);
      current.updatedAt = Date.now();
    }),
  handleReorderTierRows: (fromIndex, toIndex) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (!current) return;
      const rows = current.tierRows;
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= rows.length ||
        toIndex >= rows.length
      ) {
        return;
      }
      const [moved] = rows.splice(fromIndex, 1);
      rows.splice(toIndex, 0, moved);
      current.updatedAt = Date.now();
    }),
  handleTierItemRemove: (rowId, itemId) =>
    set((state) => {
      const current = state.ranks[state.activeRankId];
      if (current) {
        const row = current.tierRows.find((r) => r.id === rowId);
        if (row) {
          row.items = row.items.filter((i) => i.id !== itemId);
          current.updatedAt = Date.now();
        }
      }
    }),

  handleNewRank: (type) =>
    set((state) => {
      // A new project is created *into* the current appearance, so a board made
      // in light mode does not open as a black rectangle.
      const newRank = createBlankRank(
        type,
        defaultBoardBackground(state.theme?.isDark ?? true),
      );
      rememberRank(state, state.activeRankId);
      state.activeRankId = newRank.id;
      state.ranks[newRank.id] = newRank;
    }),
  handleNewRankLikeCurrent: () => {
    const source = get().ranks[get().activeRankId];
    if (!source) return undefined;
    const newRank = createRankLike(source);
    set((state) => {
      rememberRank(state, state.activeRankId);
      state.activeRankId = newRank.id;
      state.ranks[newRank.id] = newRank;
    });
    return newRank.id;
  },

  handleDeleteRank: (id) => get().handleDeleteRanks([id]),

  handleDeleteRanks: (ids, purgeLibrary = false) =>
    set((state) => {
      const doomed = new Set(ids.filter((id) => state.ranks[id]));
      if (doomed.size === 0) return;

      if (purgeLibrary) {
        const purgeable = new Set(
          exclusiveProjectImages(state.ranks, [...doomed]),
        );
        state.inbox.collections.forEach((collection) => {
          collection.items = collection.items.filter(
            (item) => !purgeable.has(item.imageSrc),
          );
        });
      }

      doomed.forEach((id) => {
        delete state.ranks[id];
      });
      state.rankHistory = (state.rankHistory ?? []).filter(
        (rankId) => !doomed.has(rankId),
      );

      if (Object.keys(state.ranks).length === 0) {
        const newRank = createBlankRank(
          "ranking",
          defaultBoardBackground(state.theme?.isDark ?? true),
        );
        state.activeRankId = newRank.id;
        state.ranks[newRank.id] = newRank;
        state.rankHistory = [];
      } else if (doomed.has(state.activeRankId)) {
        const previous = state.rankHistory[state.rankHistory.length - 1];
        state.activeRankId = previous ?? resolveActiveRankId(state.ranks, "");
      }
    }),
  setActiveRankId: (id) =>
    set((state) => {
      if (id === state.activeRankId || !state.ranks[id]) return;
      rememberRank(state, state.activeRankId);
      state.activeRankId = id;
    }),
});

/** Gives a row an id only if it arrived without one, so ids survive a save. */
const ensureTierRowId = (row: TierRow): TierRow =>
  row.id?.trim() ? row : { ...row, id: newTierRowId() };
