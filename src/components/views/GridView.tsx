import React, { useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store/useStore";
import { selectCells } from "@/store/selectors";
import { Cell } from "@/components/Cell";
import {
  DEFAULT_CELL_WIDTH,
  resolveBoardBackground,
  selectActiveBoard,
} from "@/utils/boardStyle";
import { getContrastColor } from "@/theme/palettes";

export const GridView = React.memo(function GridView() {
  const board = useStore(useShallow(selectActiveBoard));
  const cells = useStore(selectCells);
  const cols = useStore((s) => s.ranks[s.activeRankId]?.config.cols ?? 3);
  const title = useStore((s) => s.ranks[s.activeRankId]?.title ?? "");
  const backgroundColor = useStore(
    (s) => s.ranks[s.activeRankId]?.backgroundColor ?? "transparent"
  );
  const isDark = useStore((s) => s.theme?.isDark);
  const isPlacing = useStore((s) => s.placement !== null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const count = cells.length;
  const gap = board?.gap ?? 0;

  /* One contrast colour for every empty tile instead of one per tile. */
  const labelColor = useMemo(
    () => getContrastColor(resolveBoardBackground(backgroundColor, { isDark })),
    [backgroundColor, isDark]
  );

  const boardStyle = useMemo<React.CSSProperties>(() => {
    const tile = board?.cellWidth ?? DEFAULT_CELL_WIDTH;
    return {
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: `${gap}px`,
      width: `${cols * tile + (cols - 1) * gap}px`,
      // Never wider than the space actually available.
      maxWidth: "100%",
    };
  }, [cols, gap, board?.cellWidth]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-cell-index]"
      );
      if (!el) return;
      const i = Number(el.dataset.cellIndex);
      let next: number | null = null;

      switch (e.key) {
        case "ArrowRight":
          next = Math.min(i + 1, count - 1);
          break;
        case "ArrowLeft":
          next = Math.max(i - 1, 0);
          break;
        case "ArrowDown":
          next = Math.min(i + cols, count - 1);
          break;
        case "ArrowUp":
          next = Math.max(i - cols, 0);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = count - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      setFocusIndex(next);
      containerRef.current
        ?.querySelector<HTMLElement>(`[data-cell-index="${next}"]`)
        ?.focus();
    },
    [cols, count]
  );

  if (!board) return null;

  return (
    <div
      ref={containerRef}
      role="grid"
      data-export-board=""
      aria-label={`${title} ranking board`}
      aria-rowcount={Math.ceil(count / cols)}
      aria-colcount={cols}
      onKeyDown={handleKeyDown}
      className="grid w-full mx-auto"
      style={boardStyle}
    >
      {cells.map((cell, index) => (
        <Cell
          key={cell.id}
          index={index}
          cols={cols}
          count={count}
          tabbable={index === Math.min(focusIndex, count - 1)}
          board={board}
          title={title}
          labelColor={labelColor}
          isPlacing={isPlacing}
          onFocusTile={setFocusIndex}
        />
      ))}
    </div>
  );
});
