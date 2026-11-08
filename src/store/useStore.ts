import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import {
  idbStorage,
  createDefaultState,
  migratePersistedState,
} from "@/utils/storage";
import { GlobalState } from "@/types";
import { resolveActiveRankId } from "@/utils/storeUtils";
import { createGlobalSlice, GlobalSlice } from "./slices/globalSlice";
import { createRankSlice, RankSlice } from "./slices/rankSlice";
import { createInboxSlice, InboxSlice } from "./slices/inboxSlice";
import { createTransferSlice, TransferSlice } from "./slices/transferSlice";

export interface AppState
  extends GlobalState, GlobalSlice, RankSlice, InboxSlice, TransferSlice {}

const initialDefaultState = createDefaultState();

/** Undo owns durable state only, never transient UI state. */
type HistoryState = Pick<GlobalState, "activeRankId" | "ranks" | "inbox">;

const sameHistory = (
  past?: Partial<HistoryState>,
  current?: Partial<HistoryState>,
) =>
  !!past &&
  !!current &&
  past.activeRankId === current.activeRankId &&
  past.ranks === current.ranks &&
  past.inbox === current.inbox;

type HistoryCommit = (past: HistoryState, current: HistoryState) => void;

let commitHistory: HistoryCommit | null = null;
let pendingHistory: { past: HistoryState; current: HistoryState } | null = null;
let flushQueued = false;

/** Batches multi-write gestures into one undo entry. */
export const flushHistory = () => {
  if (!pendingHistory) return;
  const { past, current } = pendingHistory;
  pendingHistory = null;
  commitHistory?.(past, current);
};

/** Drops both the committed and the still-queued history entry. */
const resetHistory = () => {
  pendingHistory = null;
  useStore.temporal.getState().clear();
};

const queueHistoryFlush = () => {
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(() => {
    flushQueued = false;
    flushHistory();
  });
};

export const useStore = create<AppState>()(
  temporal(
    persist(
      immer((set, get, api) => ({
        ...initialDefaultState,
        ...createGlobalSlice(set, get, api),
        ...createRankSlice(set, get, api),
        ...createInboxSlice(set, get, api),
        ...createTransferSlice(set, get, api),
      })),
      {
        name: "anime-ranker-state",
        storage: createJSONStorage(() => idbStorage),
        version: 5,
        partialize: (state) => ({
          version: state.version,
          activeRankId: state.activeRankId,
          ranks: state.ranks,
          inbox: state.inbox,
          theme: state.theme,
          preferences: state.preferences,
          rankHistory: state.rankHistory,
        }),
        migrate: (persistedState: unknown) =>
          migratePersistedState(persistedState) as AppState,
        merge: (persistedState: unknown, currentState: AppState) => {
          const persisted = (persistedState ?? {}) as Partial<AppState>;
          const merged = {
            ...currentState,
            ...persisted,
          } as AppState;

          if (Object.keys(merged.ranks ?? {}).length === 0) {
            merged.ranks = currentState.ranks;
          }
          merged.activeRankId = resolveActiveRankId(
            merged.ranks,
            merged.activeRankId,
          );
          merged.rankHistory = Array.isArray(merged.rankHistory)
            ? merged.rankHistory.filter((id: string) => !!merged.ranks[id])
            : [];
          merged.isDraggingFromDock = false;
          merged.interactionState = null;
          merged.placement = null;
          merged.duplicateModalConfig = {
            isOpen: false,
            imageSrc: null,
            actionToExecute: null,
          };
          return merged;
        },
      },
    ),
    {
      partialize: (state) => ({
        activeRankId: state.activeRankId,
        ranks: state.ranks,
        inbox: state.inbox,
      }),
      equality: sameHistory,
      /* Every entry pins the images that were on screen at that step. Fifty
         was more history than anyone reaches for and kept whole boards of
         base64 posters alive. */
      limit: 25,
      handleSet: (handleSet) => (pastState, _replace, currentState) => {
        const past = pastState as HistoryState;
        const current = currentState as HistoryState;
        commitHistory = (p) => handleSet(p as AppState);
        if (pendingHistory) {
          pendingHistory.current = current;
        } else {
          pendingHistory = { past, current };
        }
        queueHistoryFlush();
      },
    },
  ),
);

/**
 * Project deletion is final: it also drops the undo trail so a deleted board
 * cannot come back from history along with every image it held.
 */
export const deleteProjects = (ids: string[], purgeLibrary = false) => {
  useStore.getState().handleDeleteRanks(ids, purgeLibrary);
  resetHistory();
};
