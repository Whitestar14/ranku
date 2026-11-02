import { StateCreator } from "zustand";
import { AppState } from "../useStore";
import {
  checkAndRescueImages,
  resolveActiveRankId,
  targetCollectionId,
} from "@/utils/storeUtils";
import { GlobalState, InteractionState, Placement } from "@/types";

export interface GlobalSlice {
  /** Recently active project ids, oldest first. */
  rankHistory: string[];
  interactionState: InteractionState;
  /**
   * True while an item from the dock is in flight.
   */
  isDraggingFromDock: boolean;
  setIsDraggingFromDock: (value: boolean) => void;
  placement: Placement | null;
  setPlacement: (placement: Placement | null) => void;
  duplicateModalConfig: {
    isOpen: boolean;
    imageSrc: string | null;
    actionToExecute: (() => void) | null;
  };
  setInteractionState: (state: InteractionState) => void;
  setDuplicateModalConfig: (
    config: Partial<AppState["duplicateModalConfig"]>,
  ) => void;
  handleDuplicateConfirm: (dontAskAgain: boolean) => void;
  checkDuplicateAndProceed: (imageSrc: string, action: () => void) => void;
  updateGlobalTheme: (themeUpdates: Partial<GlobalState["theme"]>) => void;
  handleClearAll: () => void;
  importState: (newState: GlobalState, mode: "merge" | "overwrite") => void;
  setSkipDuplicateWarning: (skip: boolean) => void;
  updatePreferences: (p: Partial<GlobalState["preferences"]>) => void;
}

export const createGlobalSlice: StateCreator<
  AppState,
  [["zustand/immer", never]],
  [],
  GlobalSlice
> = (set, get) => ({
  rankHistory: [],
  interactionState: null,
  isDraggingFromDock: false,
  setIsDraggingFromDock: (value) => set({ isDraggingFromDock: value }),
  placement: null,
  setPlacement: (placement) =>
    set({
      placement,
      interactionState: placement ? null : get().interactionState,
    }),
  duplicateModalConfig: {
    isOpen: false,
    imageSrc: null,
    actionToExecute: null,
  },
  setInteractionState: (state) => set({ interactionState: state }),
  setDuplicateModalConfig: (config) =>
    set((state: AppState) => {
      Object.assign(state.duplicateModalConfig, config);
    }),
  checkDuplicateAndProceed: (imageSrc, action) => {
    const state = get();
    const activeRank = state.ranks[state.activeRankId];
    if (!activeRank) return;

    if (state.preferences.skipDuplicateWarning) {
      action();
      return;
    }

    let isDuplicate = false;
    if (activeRank.type === "ranking") {
      isDuplicate = activeRank.cells.some((c) => c.imageSrc === imageSrc);
    } else if (activeRank.type === "tierlist") {
      isDuplicate = activeRank.tierRows.some((row) =>
        row.items.some((item) => item.imageSrc === imageSrc),
      );
    }

    if (isDuplicate) {
      set((draft: AppState) => {
        draft.duplicateModalConfig.isOpen = true;
        draft.duplicateModalConfig.imageSrc = imageSrc;
        draft.duplicateModalConfig.actionToExecute = action;
      });
    } else {
      action();
    }
  },

  handleDuplicateConfirm: (dontAskAgain) => {
    const state = get() as AppState;
    const action = state.duplicateModalConfig.actionToExecute;
    if (action) {
      action();
    }

    set((draft: AppState) => {
      if (dontAskAgain) {
        draft.preferences.skipDuplicateWarning = true;
      }
      draft.duplicateModalConfig.isOpen = false;
      draft.duplicateModalConfig.imageSrc = null;
      draft.duplicateModalConfig.actionToExecute = null;
    });
  },

  updateGlobalTheme: (themeUpdates) =>
    set((state: AppState) => {
      if (state.theme) Object.assign(state.theme, themeUpdates);
    }),

  handleClearAll: () =>
    set((state: AppState) => {
      const activeRank = state.ranks[state.activeRankId];
      if (!activeRank) return;

      const targetColId = targetCollectionId(state.inbox);
      const col = state.inbox.collections.find((c) => c.id === targetColId);

      if (activeRank.type === "tierlist") {
        const allItems = activeRank.tierRows.flatMap((r) => r.items);
        const rescued = checkAndRescueImages(allItems, state);
        if (col && rescued.length > 0) {
          col.items.push(...rescued);
        }
        activeRank.tierRows.forEach((r) => {
          r.items = [];
        });
      } else {
        const cellsWithImages = activeRank.cells.filter((c) => c.imageSrc);
        const rescued = checkAndRescueImages(cellsWithImages, state);
        if (col && rescued.length > 0) {
          col.items.push(...rescued);
        }
        activeRank.cells.forEach((c) => {
          c.imageSrc = null;
          c.textLabel = undefined;
          c.rating = undefined;
        });
      }
      activeRank.updatedAt = Date.now();
    }),

  importState: (newState, mode) =>
    set((state: AppState) => {
      /* A backup can be hand-edited or come from an older build. Rebuilding the
         shape here means a missing `inbox` or `preferences` block cannot leave
         the store in a half-valid state that crashes on the next read. */
      const ranks = newState.ranks ?? {};
      const collections = newState.inbox?.collections ?? [];
      const restoredInbox = {
        collections,
        activeCollectionId:
          newState.inbox?.activeCollectionId ??
          collections[0]?.id ??
          "all-images",
        lastTargetCollectionId: newState.inbox?.lastTargetCollectionId,
      };

      if (mode === "overwrite") {
        return {
          ...newState,
          ranks,
          inbox: restoredInbox,
          preferences: { ...state.preferences, ...newState.preferences },
          activeRankId: resolveActiveRankId(ranks, newState.activeRankId),
          rankHistory: [],
          interactionState: null,
          placement: null,
          isDraggingFromDock: false,
          duplicateModalConfig: {
            isOpen: false,
            imageSrc: null,
            actionToExecute: null,
          },
        } as unknown as AppState;
      }

      Object.entries(ranks).forEach(([id, rank]) => {
        let targetId = id;
        if (state.ranks[id]) {
          targetId = `${id}-${Math.random().toString(36).slice(2, 7)}`;
        }
        state.ranks[targetId] = { ...rank, id: targetId };
      });

      collections.forEach((newCol) => {
        const existing = state.inbox.collections.find(
          (c) => c.name.toLowerCase() === newCol.name.toLowerCase(),
        );
        if (existing) {
          const existingSrcs = new Set(existing.items.map((i) => i.imageSrc));
          newCol.items.forEach((item) => {
            if (!existingSrcs.has(item.imageSrc)) {
              existing.items.push(item);
            }
          });
        } else {
          let targetColId = newCol.id;
          if (state.inbox.collections.some((c) => c.id === targetColId)) {
            targetColId = `${newCol.id}-${Math.random().toString(36).slice(2, 7)}`;
          }
          state.inbox.collections.push({ ...newCol, id: targetColId });
        }
      });
    }),

  updatePreferences: (p) =>
    set((state: AppState) => {
      Object.assign(state.preferences, p);
    }),

  setSkipDuplicateWarning: (skip) =>
    set((state: AppState) => {
      state.preferences.skipDuplicateWarning = skip;
    }),
});
