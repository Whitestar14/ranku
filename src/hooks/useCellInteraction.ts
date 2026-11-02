import { useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";

export interface CellInteractionConfig {
  type: "cell" | "tier-item";
  index: number;
  rowId?: string;
  itemId?: string;
}

/**
 * Target-first tap placement.
 */
export function useCellInteraction(config: CellInteractionConfig) {
  const lastInteractRef = useRef(0);
  const interactionState = useStore((s) => s.interactionState);

  const isSelected =
    config.type === "cell"
      ? interactionState?.type === "cell" &&
        interactionState.index === config.index
      : interactionState?.type === "tier-item" &&
        interactionState.itemId === config.itemId;

  /** Drop the image that is explicitly being placed onto this surface. */
  const place = useCallback(() => {
    const store = useStore.getState();
    const image = store.placement;
    if (!image) return;

    if (config.type === "cell") {
      store.handleItemTransfer(
        {
          type: "inbox",
          collectionId: image.collectionId,
          itemId: image.itemId,
        },
        { type: "cell", index: config.index },
      );
    } else if (config.rowId) {
      store.handleItemTransfer(
        {
          type: "inbox",
          collectionId: image.collectionId,
          itemId: image.itemId,
        },
        { type: "tier", rowId: config.rowId, targetIndex: config.index },
      );
    }

    store.setPlacement(null);
    store.setInteractionState(null);
  }, [config.type, config.index, config.rowId]);

  const handleInteraction = useCallback(
    (clientX: number, clientY: number, target: HTMLElement) => {
      // Nested controls own their own click.
      if (
        target.closest(".popover-menu") ||
        target.closest(".adjust-controls") ||
        target.closest("button") ||
        target.closest("select") ||
        target.closest("input")
      )
        return;

      // Dual tap/click events arrive together; keep one.
      const now = Date.now();
      if (now - lastInteractRef.current < 200) return;
      lastInteractRef.current = now;

      const store = useStore.getState();
      if (store.placement) {
        place();
        return;
      }
      const current = store.interactionState;

      if (config.type === "cell") {
        if (current?.type === "cell") {
          if (current.index !== config.index) {
            store.handleSwapCells(current.index, config.index);
          }
          store.setInteractionState(null);
          return;
        }
        if (current?.type === "tier-item") {
          store.handleItemTransfer(
            { type: "tier", rowId: current.rowId, itemId: current.itemId },
            { type: "cell", index: config.index },
          );
          store.setInteractionState(null);
          return;
        }
        store.setInteractionState({ type: "cell", index: config.index });
        return;
      }

      if (config.type !== "tier-item" || !config.rowId) return;

      if (current?.type === "tier-item") {
        if (current.itemId !== config.itemId || config.itemId === undefined) {
          store.handleItemTransfer(
            { type: "tier", rowId: current.rowId, itemId: current.itemId },
            {
              type: "tier",
              rowId: config.rowId,
              targetIndex: config.index,
            },
          );
        }
        store.setInteractionState(null);
        return;
      }

      if (current?.type === "cell") {
        store.handleItemTransfer(
          { type: "cell", index: current.index },
          { type: "tier", rowId: config.rowId, targetIndex: config.index },
        );
        store.setInteractionState(null);
        return;
      }

      if (config.itemId !== undefined) {
        store.setInteractionState({
          type: "tier-item",
          rowId: config.rowId,
          itemId: config.itemId,
        });
      }
    },
    [config.type, config.index, config.rowId, config.itemId, place],
  );

  const clearInteraction = useCallback(() => {
    useStore.getState().setInteractionState(null);
  }, []);

  return { isSelected, handleInteraction, clearInteraction, place };
}
