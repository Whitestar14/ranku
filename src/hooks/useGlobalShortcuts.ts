import { useEffect, useRef, useState } from "react";
import { useStore, flushHistory } from "@/store/useStore";
import { useShortcutState } from "@/state/shortcutState";
import { useToast } from "@/context/ToastContext";
import {
  CELL_WIDTH_MAX,
  CELL_WIDTH_MIN,
  DEFAULT_CELL_WIDTH,
} from "@/utils/boardStyle";
import { useImageTransferActions } from "@/hooks/useImageTransferActions";

/** How far one press of ⌘+ / ⌘− moves the tile size. The range it clamps to is
 *  the rail slider's, so the two controls cannot drift apart. */
const TILE_STEP = 20;

export interface ShortcutOptions {
  setIsEditingTitle: (val: boolean) => void;
  /** ⌘B. Optional so the hook can be used without the rail. */
  onToggleSidebar?: () => void;
  /** ⌘E. */
  onExport?: () => void;
  /** ⌘D. The dock owns its own open state, so this is a window event. */
  onToggleDock?: () => void;
}

export function useGlobalShortcuts(options: ShortcutOptions) {
  const [internalClipboard, setInternalClipboard] = useState<string | null>(
    null,
  );
  const addToast = useToast();
  const { copyImage } = useImageTransferActions();

  /* Options are read through a ref. They are new closures every render, and
     putting them in the effect's deps would tear down and re-attach the window
     listeners on every keystroke-driven render. */
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      )
        return;

      const st = useStore.getState();
      const rank = st.ranks[st.activeRankId];
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      /* ── The cheat sheet ──────────────────────────────────────────────────
         Handled before anything else so it works from any surface. */
      if (mod && (e.key === "/" || e.key === "?")) {
        e.preventDefault();
        useShortcutState.getState().toggle();
        return;
      }
      if (mod && key === "b") {
        e.preventDefault();
        optionsRef.current.onToggleSidebar?.();
        return;
      }
      if (mod && key === "e") {
        e.preventDefault();
        optionsRef.current.onExport?.();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        optionsRef.current.onToggleDock?.();
        return;
      }

      if (e.key === "Escape") {
        st.setInteractionState(null);
        optionsRef.current.setIsEditingTitle(false);
        return;
      }

      if (mod && key === "z") {
        e.preventDefault();
        flushHistory();
        const temporal = useStore.temporal.getState();
        if (e.shiftKey) {
          if (!temporal.futureStates.length) {
            addToast("info", "Nothing to redo");
            return;
          }
          temporal.redo();
          addToast("success", "Redone");
        } else {
          if (!temporal.pastStates.length) {
            addToast("info", "Nothing to undo");
            return;
          }
          temporal.undo();
          addToast("success", "Undone");
        }
        return;
      }

      /* ── Tile size ────────────────────────────────────────────────────────
         The rail's slider is the discoverable path; this is the fast one, and it
         makes the board comfortable to survey without leaving the keyboard. */
      if (mod && (e.key === "+" || e.key === "=" || e.key === "-")) {
        if (rank?.type === "ranking") {
          e.preventDefault();
          const current = rank.cellWidth ?? DEFAULT_CELL_WIDTH;
          const delta = e.key === "-" ? -TILE_STEP : TILE_STEP;
          const next = Math.min(
            CELL_WIDTH_MAX,
            Math.max(CELL_WIDTH_MIN, current + delta),
          );
          if (next !== current) st.updateActiveRank({ cellWidth: next });
          return;
        }
      }

      // Arrow navigation for grid/list
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (st.interactionState?.type === "cell" && rank) {
          e.preventDefault();
          const maxCells = rank.cells.length;
          const cols = rank.type === "ranking" ? rank.config.cols : 1;
          let newIndex = st.interactionState.index;

          if (e.key === "ArrowRight") newIndex++;
          if (e.key === "ArrowLeft") newIndex--;
          if (e.key === "ArrowDown") newIndex += cols;
          if (e.key === "ArrowUp") newIndex -= cols;

          if (newIndex >= 0 && newIndex < maxCells) {
            st.setInteractionState({ type: "cell", index: newIndex });
          }
          return;
        }
      }

      /* ── Copy ──────────────────────────────────────────────────────────────
         The selection is copied to the system clipboard as a real image, not
         just held for an in-app paste: the shortcut is advertised as "copy
         image", and a shortcut that only fills an invisible buffer reads as
         broken next to the identical menu item. */
      if (mod && key === "c") {
        const selected = st.interactionState;
        let imageSrc: string | null = null;
        if (selected?.type === "cell") {
          imageSrc = rank?.cells[selected.index]?.imageSrc ?? null;
        } else if (selected?.type === "tier-item") {
          imageSrc =
            rank?.tierRows
              .find((row) => row.id === selected.rowId)
              ?.items.find((item) => item.id === selected.itemId)?.imageSrc ??
            null;
        }

        if (imageSrc) {
          e.preventDefault();
          setInternalClipboard(imageSrc);
          copyImage(imageSrc);
        }
      }
      if (mod && key === "v") {
        if (st.interactionState?.type === "cell" && rank && internalClipboard) {
          st.handleCellUpload(st.interactionState.index, internalClipboard);
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (st.interactionState?.type === "cell" && rank) {
          e.preventDefault();
          st.handleCellClear(st.interactionState.index);
          st.setInteractionState(null);
          return;
        }
        if (st.interactionState?.type === "tier-item" && rank) {
          e.preventDefault();
          st.handleTierItemRemove(
            st.interactionState.rowId,
            st.interactionState.itemId,
          );
          st.setInteractionState(null);
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [internalClipboard, addToast, copyImage]);
}
