import React, { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { AnimatePresence } from "motion/react";
import { Plus, Layers } from "lucide-react";
import { TierRow as TierRowData } from "@/types";
import { useStore } from "@/store/useStore";
import { selectTierRows } from "@/store/selectors";
import { TierRow } from "@/components/TierRow";
import { selectActiveBoard } from "@/utils/boardStyle";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_TIER_COLORS,
  FALLBACK_TIER_COLOR,
} from "@/constants/tierColors";
import { normalizeTierColor } from "@/utils/dominantColor";
import { newTierRowId } from "@/utils/storeUtils";

/** Next unused single letter, so a new tier is named sensibly by default. */
function nextTierLabel(rows: TierRowData[]): string {
  const used = new Set(rows.map((r) => r.label.trim().toUpperCase()));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return "NEW";
}

export const TierListView = React.memo(function TierListView() {
  const board = useStore(useShallow(selectActiveBoard));
  const rows = useStore(selectTierRows);

  const handleUpdateRow = useCallback(
    (rowId: string, updates: Partial<TierRowData>) => {
      const { ranks, activeRankId, handleUpdateTierRows } = useStore.getState();
      const rank = ranks[activeRankId];
      if (!rank) return;
      handleUpdateTierRows(
        rank.tierRows.map((r) =>
          r.id === rowId ? { ...r, ...updates } : r
        )
      );
    },
    []
  );

  const handleMoveRow = useCallback(
    (index: number, direction: "up" | "down") => {
      const { ranks, activeRankId, handleUpdateTierRows } = useStore.getState();
      const rank = ranks[activeRankId];
      if (!rank) return;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= rank.tierRows.length) return;
      const next = [...rank.tierRows];
      [next[index], next[target]] = [next[target], next[index]];
      handleUpdateTierRows(next);
    },
    []
  );

  const handleDeleteRow = useCallback((index: number) => {
    const { ranks, activeRankId, handleUpdateTierRows } = useStore.getState();
    const rank = ranks[activeRankId];
    if (!rank) return;
    handleUpdateTierRows(rank.tierRows.filter((_, i) => i !== index));
  }, []);

  const handleAddRow = useCallback(() => {
    const { ranks, activeRankId, handleUpdateTierRows } = useStore.getState();
    const rank = ranks[activeRankId];
    if (!rank) return;
    const used = new Set(rank.tierRows.map((r) => r.color.toLowerCase()));
    const color =
      DEFAULT_TIER_COLORS.find((c) => !used.has(c)) ?? FALLBACK_TIER_COLOR;
    handleUpdateTierRows([
      ...rank.tierRows,
      {
        id: newTierRowId(),
        label: nextTierLabel(rank.tierRows),
        color: normalizeTierColor(color),
        items: [],
      },
    ]);
  }, []);

  if (!board) return null;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={24} strokeWidth={1.8} />}
        title="No tiers yet"
        description="Add a tier to start sorting. Drag items in from the Library, or tap an item and then tap a tier."
        action={
          <Button
            onClick={handleAddRow}
            icon={<Plus size={17} strokeWidth={2.5} />}
          >
            Add Tier
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div
        data-export-board=""
        className="border border-hairline overflow-hidden"
        style={{ borderRadius: board.tierRadius }}
      >
        <AnimatePresence initial={false}>
          {rows.map((row, index) => (
            <TierRow
              key={row.id}
              row={row}
              index={index}
              aspectRatio={board.aspectRatio}
              height={board.tierRowHeight}
              spacing={board.tierSpacing}
              corners={board.tierCorners}
              justify={board.justify}
              onUpdate={handleUpdateRow}
              onMove={handleMoveRow}
              onDelete={handleDeleteRow}
            />
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        data-export-hide=""
        onClick={handleAddRow}
        className="mt-3 flex w-full items-center justify-center gap-2 h-10 rounded-chip
                   border border-hairline bg-surface-secondary/30 text-muted
                   hover:text-text hover:bg-hover transition-colors duration-150"
      >
        <Plus size={17} strokeWidth={2.5} />
        <span className="text-subheadline font-medium">Add Tier</span>
      </button>
    </div>
  );
});
