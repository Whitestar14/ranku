import React, { useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useShallow } from "zustand/react/shallow";
import { MoreHorizontal } from "lucide-react";
import { PixelText } from "@/components/pixel/PixelText";
import { useStore } from "@/store/useStore";
import { DEFAULT_ASPECT, aspectToCss } from "@/utils/ui";
import { UrlInputModal } from "@/components/ui/UrlInputModal";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { PopoverMenu } from "@/components/ui/PopoverMenu";
import { AdjustControls, AdjustOverlay } from "@/components/ui/AdjustOverlay";
import { TileEmptyState } from "./tile/TileEmptyState";
import { getContrastColor } from "@/theme/palettes";
import { useTile } from "./tile/useTile";
import {
  dropTint,
  resolveBoardBackground,
  restingTileShadow,
  selectActiveBoard,
  tileStateShadow,
} from "@/utils/boardStyle";

interface CellProps {
  index: number;
  cols: number;
  /** Total tiles, so the last row can draw the board's bottom rule. */
  count: number;
  tabbable: boolean;
  onFocusTile: (index: number) => void;
}

export const Cell = React.memo(function Cell({
  index,
  cols,
  count,
  tabbable,
  onFocusTile,
}: CellProps) {
  const cell = useStore((s) => s.ranks[s.activeRankId]?.cells[index]);
  const board = useStore(useShallow(selectActiveBoard));
  const title = useStore((s) => s.ranks[s.activeRankId]?.title ?? "");
  const isDark = useStore((s) => s.theme?.isDark);
  const sheetTextColor = getContrastColor(
    resolveBoardBackground(
      useStore(
        (s) => s.ranks[s.activeRankId]?.backgroundColor ?? "transparent",
      ),
      { isDark },
    ),
  );
  const isPlacing = useStore((s) => s.placement !== null);

  const handleUpdateCell = useStore((s) => s.handleUpdateCell);
  const handleItemTransfer = useStore((s) => s.handleItemTransfer);

  const tile = useTile({
    index,
    item: cell,
    aspectRatio: board?.aspectRatio ?? DEFAULT_ASPECT,
    update: (patch) => handleUpdateCell(index, patch),
    setImage: (src) => handleUpdateCell(index, { imageSrc: src }),
    importFromUrl: (url) =>
      handleItemTransfer(
        { type: "search", imageSrc: url },
        { type: "cell", index },
      ),
    returnToLibrary: () =>
      handleItemTransfer({ type: "cell", index }, { type: "inbox" }),
    filename: `${title.replace(/\s+/g, "-").toLowerCase() || "image"}-${
      index + 1
    }.jpg`,
  });

  const {
    setNodeRef: setDragNodeRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: tile.dragId,
    data: tile.dragData,
    disabled: tile.dragDisabled,
  });

  /* Destructured so the composed callback depends on the stable function rather
     than on the hook's result object, which is rebuilt every render. A changing
     ref callback would detach and re-attach the node on each one. */
  const { setNodeRef: setTileNodeRef } = tile;
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setTileNodeRef(node);
      setDragNodeRef(node);
    },
    [setTileNodeRef, setDragNodeRef],
  );

  if (!cell || !board) return null;

  const resting = restingTileShadow({
    borderless: board.borderless,
    gap: board.gap,
    index,
    cols,
    count,
  });

  return (
    <div
      ref={setRefs}
      /* dnd-kit's attributes set role="button" and its own tabIndex; they are
         spread first so the grid semantics below win. */
      {...attributes}
      {...listeners}
      role="gridcell"
      tabIndex={tabbable ? 0 : -1}
      aria-rowindex={Math.floor(index / cols) + 1}
      aria-colindex={(index % cols) + 1}
      aria-selected={tile.isSelected}
      /* dnd-kit marks a non-draggable cell aria-disabled, but an empty cell is
         still selectable and adjust mode puts cancel/save inside it, so the
         cell itself must stay enabled to assistive tech. */
      aria-disabled={false}
      aria-label={
        tile.hasImage
          ? `Position ${index + 1}, filled`
          : `Position ${index + 1}, empty`
      }
      data-cell-index={index}
      className={`tile item-enter group/tile relative select-none outline-none [container-type:inline-size] ${
        tile.hasImage ? "touch-none" : ""
      } ${isDragging ? "z-30 opacity-25" : tile.isAdjusting ? "z-30" : "z-0"}`}
      style={
        {
          aspectRatio: aspectToCss(board.aspectRatio),
          "--enter-delay": `${Math.min(index, 14) * 26}ms`,
        } as React.CSSProperties
      }
      onClick={tile.activate}
      onDoubleClick={tile.handleDoubleClick}
      onFocus={() => onFocusTile(index)}
      onContextMenu={tile.openMenu}
      onDragOver={tile.handleFileDragOver}
      onDragLeave={tile.handleFileDragLeave}
      onDrop={tile.handleFileDrop}
    >
      <div
        className="relative w-full h-full overflow-hidden squircle"
        style={{
          borderRadius: board.radius,
          boxShadow: tileStateShadow({
            isSelected: tile.isSelected,
            resting,
          }),
        }}
      >
        {tile.hasImage ? (
          <div ref={tile.imageRef} className="absolute inset-0">
            <RemoteImage
              src={cell.imageSrc!}
              alt=""
              decoding="async"
              loading="lazy"
              colorPlaceholder
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={tile.imageStyle}
            />
          </div>
        ) : (
          <TileEmptyState
            index={index}
            isDraggingAny={tile.isDraggingAny}
            isPlacementTarget={isPlacing}
            labelColor={sheetTextColor}
            onOpen={isPlacing ? tile.place : tile.openMenu}
          />
        )}

        {tile.hasImage && board.showNumbers && (
          <span aria-hidden className="tile-rank">
            <PixelText text={String(index + 1)} height={22} />
          </span>
        )}

        {tile.hasImage && !tile.isAdjusting && (
          <button
            type="button"
            data-export-hide=""
            aria-label="Tile actions"
            aria-haspopup="menu"
            aria-expanded={tile.isMenuOpen}
            onClick={(e) => tile.openMenu(e, e.currentTarget)}
            className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-[22px] h-[22px]
                       media-scrim squircle hover:brightness-125 active:scale-95
                       transition-transform duration-150 affordance touch-target"
            style={{ borderRadius: "var(--radius-mini)" }}
          >
            <MoreHorizontal size={14} strokeWidth={2.5} />
          </button>
        )}

        {tile.isAdjusting && (
          <AdjustOverlay
            onPointerDown={tile.adjust.handlePointerDown}
            onPointerMove={tile.adjust.handlePointerMove}
            onPointerUp={tile.adjust.handlePointerUp}
            onPointerCancel={tile.adjust.handlePointerCancel}
          />
        )}

        {(tile.isOver || tile.isFileDragOver) && (
          <div
            aria-hidden
            className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-150"
            style={{ background: dropTint() }}
          />
        )}

        {/* Landing pulse. Keyed on the drop sequence so it replays even when
            the same tile receives two drops in a row. */}
        {tile.dropPulse > 0 && (
          <span
            key={tile.dropPulse}
            aria-hidden
            className="drop-land absolute inset-0 z-30 pointer-events-none"
            style={{ borderRadius: board.radius }}
          />
        )}
      </div>

      {tile.isAdjusting && (
        <AdjustControls
          className="absolute left-1/2 -top-4 z-40 -translate-x-1/2"
          onCancel={tile.adjust.stop}
          onSave={() => {
            tile.adjust.save();
            tile.clearInteraction();
          }}
        />
      )}

      <input
        ref={tile.fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={tile.handleFileChange}
      />

      <PopoverMenu
        isOpen={tile.isMenuOpen}
        onClose={tile.closeMenu}
        actions={tile.actions}
        triggerPoint={tile.anchor}
        separators="explicit"
      />

      <UrlInputModal
        isOpen={tile.isUrlModalOpen}
        onClose={tile.closeUrlModal}
        onSubmit={tile.submitUrl}
      />
    </div>
  );
});
