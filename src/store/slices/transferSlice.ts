import { StateCreator } from "zustand";
import { AppState } from "../useStore";
import { TransferSource, TransferTarget, CellData } from "@/types";
import {
  createId,
  createInboxItem,
  findInboxItem,
  findInboxItems,
  targetCollectionId,
} from "@/utils/storeUtils";

export interface TransferSlice {
  handleItemTransfer: (
    source: TransferSource,
    target: TransferTarget,
    itemIds?: string[]
  ) => void;
}

export const createTransferSlice: StateCreator<
  AppState,
  [["zustand/immer", never]],
  [],
  TransferSlice
> = (set, get) => ({
  handleItemTransfer: (source, target, itemIds) => {
    const state = get();
    const activeRank = state.ranks[state.activeRankId];
    if (!activeRank) return;

    let imagesToTransfer: string[] = [];
    const itemsToRemoveFromSource: (() => void)[] = [];
    let itemsAreFromInbox = false;

    // 1. Gather Images & Prepare Source Deletions
    if (source.type === "cell") {
      const cell = activeRank.cells[source.index];
      if (cell && cell.imageSrc) {
        imagesToTransfer.push(cell.imageSrc);
        itemsToRemoveFromSource.push(() => {
          set((draft) => {
            const c = draft.ranks[draft.activeRankId].cells[source.index];
            if (c) {
              c.imageSrc = null;
              c.textLabel = undefined;
              c.rating = undefined;
            }
          });
        });
      }
    } else if (source.type === "tier") {
      const row = activeRank.tierRows.find((r) => r.id === source.rowId);
      if (row) {
        const item = row.items.find((i) => i.id === source.itemId);
        if (item && item.imageSrc) {
          imagesToTransfer.push(item.imageSrc);
          itemsToRemoveFromSource.push(() => {
            set((draft) => {
              const r = draft.ranks[draft.activeRankId].tierRows.find(
                (tr) => tr.id === source.rowId
              );
              if (r) r.items = r.items.filter((i) => i.id !== source.itemId);
            });
          });
        }
      }
    } else if (source.type === "search") {
      imagesToTransfer.push(source.imageSrc);
      set((draft) => {
        const col = draft.inbox.collections.find(
          (c) => c.id === targetCollectionId(draft.inbox),
        );
        if (col && !col.items.some((i) => i.imageSrc === source.imageSrc)) {
          col.items.push(createInboxItem(source.imageSrc));
        }
      });
    } else if (source.type === "inbox") {
      itemsAreFromInbox = true;
      if (itemIds && itemIds.length > 0) {
        // Multi
        const validItems = findInboxItems(state.inbox, itemIds, source.collectionId);
        imagesToTransfer = validItems.map((i) => i.imageSrc);
      } else if (source.itemId) {
        // Single
        const item = findInboxItem(state.inbox, source.itemId, source.collectionId);
        if (item) imagesToTransfer.push(item.imageSrc);
      } else {
        return;
      }
    }

    if (imagesToTransfer.length === 0) return;

    // 2. Perform Drops based on Target
    // To cleanly execute, we process the first image for single-targets, or all for multi-targets.
    const imageSrc = imagesToTransfer[0];

    const executeTransfer = () => {
      // Remove from source if applicable
      itemsToRemoveFromSource.forEach((remove) => remove());

      set((draft) => {
        const dRank = draft.ranks[draft.activeRankId];

        if (target.type === "inbox") {
          // Push to inbox (if not already from inbox/search)
          if (!itemsAreFromInbox && source.type !== "search") {
            const col = draft.inbox.collections.find(
              (c) => c.id === targetCollectionId(draft.inbox),
            );
            if (col) {
              // Never re-add an image the library already holds.
              const tracked = new Set<string>();
              draft.inbox.collections.forEach((c) =>
                c.items.forEach((i) => tracked.add(i.imageSrc))
              );
              imagesToTransfer.forEach((img) => {
                if (tracked.has(img)) return;
                tracked.add(img);
                col.items.push(createInboxItem(img));
              });
            }
          }
        } else if (target.type === "cell") {
          const c = dRank.cells[target.index];
          if (c) {
            c.imageSrc = imageSrc;
          }
        } else if (target.type === "tier") {
          const row = dRank.tierRows.find((r) => r.id === target.rowId);
          if (row) {
            const itemsToAdd: CellData[] = imagesToTransfer.map((img) => ({
              id: createId("cell"),
              imageSrc: img,
              position: 0,
            }));

            let insertIdx = target.targetIndex;
            // Adjust index if dragging within the same row
            if (
              source.type === "tier" &&
              source.rowId === target.rowId &&
              insertIdx !== -1
            ) {
              const sRow = activeRank.tierRows.find((r) => r.id === source.rowId);
              const originalIdx = sRow?.items.findIndex((i) => i.id === source.itemId);
              if (originalIdx !== undefined && originalIdx < insertIdx) {
                insertIdx -= 1;
              }
            }

            if (insertIdx === -1 || insertIdx >= row.items.length) {
              row.items.push(...itemsToAdd);
            } else {
              row.items.splice(insertIdx, 0, ...itemsToAdd);
            }
          }
        }
        dRank.updatedAt = Date.now();
      });
    };

    const cameFromBoard = source.type === "cell" || source.type === "tier";
    if (!cameFromBoard && (target.type === "tier" || target.type === "cell")) {
      state.checkDuplicateAndProceed(imageSrc, executeTransfer);
    } else {
      executeTransfer();
    }
  },
});
