import React, { useCallback, useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { CellData } from "@/types";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store/useStore";
import { UrlInputModal } from "@/components/ui/UrlInputModal";
import { PopoverMenu } from "@/components/ui/PopoverMenu";
import { Slider } from "@/components/ui/Slider";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { AdjustControls, AdjustOverlay } from "@/components/ui/AdjustOverlay";
import { widthForHeight } from "@/utils/ui";
import { useTile } from "./tile/useTile";
import { selectActiveBoard, tileStateShadow } from "@/utils/boardStyle";

const THUMB_HEIGHT = 56;
const THUMB_RADIUS = 12;

export interface ListRowProps {
  index: number;
  data: CellData;
}

export const ListRow = React.memo(function ListRow({
  index,
  data,
}: ListRowProps) {
  const board = useStore(useShallow(selectActiveBoard));
  const title = useStore((s) => s.ranks[s.activeRankId]?.title ?? "");
  const handleUpdateCell = useStore((s) => s.handleUpdateCell);
  const handleItemTransfer = useStore((s) => s.handleItemTransfer);
  const handleCellUpload = useStore((s) => s.handleCellUpload);

  const tile = useTile({
    index,
    item: data,
    isRow: true,
    draggableWhenEmpty: true,
    /* `useSortable` registers the droppable for this row and forwards its own
       payload, so the hook must not register a second one — the drop would
       resolve to whichever node registered last and stop being recognised. */
    ownDroppable: true,
    dropId: data?.id || `cell-${index}`,
    aspectRatio: board?.aspectRatio ?? "3:4",
    update: (patch) => handleUpdateCell(index, patch),
    setImage: (src) => handleCellUpload(index, src),
    returnToLibrary: () =>
      handleItemTransfer({ type: "cell", index }, { type: "inbox" }),
    filename: `${title.replace(/\s+/g, "-").toLowerCase() || "image"}-${
      index + 1
    }.jpg`,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    /* A sortable row registers one node that is both its draggable and its
       droppable, so this id is also the id a drop reports — which is why the
       hook is told to key its landing pulse on the same value. */
    id: tile.dropId,
    data: tile.dragData,
    disabled: tile.dragDisabled,
  });

  const [localText, setLocalText] = useState(data?.textLabel || "");
  useEffect(() => {
    setLocalText(data?.textLabel || "");
  }, [data?.textLabel]);

  /* Destructured so the composed callback depends on the stable function rather
     than on the hook's result object, which is rebuilt every render. */
  const { setNodeRef: setTileNodeRef } = tile;
  const setRowRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setTileNodeRef(node);
      setNodeRef(node);
    },
    [setTileNodeRef, setNodeRef],
  );

  if (!data || !board) return null;

  const thumbWidth = widthForHeight(board.aspectRatio, THUMB_HEIGHT);
  const thumbRadius = board.isCard ? board.radius : THUMB_RADIUS;
  const radius = board.isCard ? board.radius : 0;

  return (
    <div
      ref={setRowRefs}
      {...attributes}
      {...listeners}
      style={
        {
          transform: CSS.Transform.toString(transform),
          transition,
          borderRadius: board.isCard ? radius : undefined,
          // Capped so a long list still finishes settling promptly.
          "--enter-delay": `${Math.min(index, 14) * 26}ms`,
        } as React.CSSProperties
      }
      onClick={tile.activate}
      onContextMenu={tile.openMenu}
      onDoubleClick={tile.handleDoubleClick}
      onDragOver={tile.handleFileDragOver}
      onDragLeave={tile.handleFileDragLeave}
      onDrop={tile.handleFileDrop}
      className={`group item-enter relative flex items-center gap-3 px-3 py-2.5
        ${board.isCard ? "bg-surface" : `bg-surface ${index > 0 ? "border-t border-border" : ""}`}
        ${!board.isCard && board.borderless ? "border-t-0" : ""}
        ${isDragging ? "opacity-25 z-0" : tile.isAdjusting ? "z-30" : "z-10"}
        ${isOver ? "z-20" : ""}
        transition-colors duration-150
      `}
    >
      {/* Selection and drop indication drawn as an inset ring so the row never
          reflows when it lights up. */}
      {(tile.isSelected || isOver) && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            boxShadow: `inset 0 0 0 ${
              isOver ? 2 : 1.5
            }px color-mix(in srgb, var(--color-primary) ${
              isOver ? 100 : 55
            }%, transparent)`,
            borderRadius: board.isCard ? radius : undefined,
          }}
        />
      )}

      {tile.dropPulse > 0 && (
        <span
          key={tile.dropPulse}
          aria-hidden
          className="drop-land pointer-events-none absolute inset-0 z-30"
          style={{ borderRadius: board.isCard ? radius : undefined }}
        />
      )}

      {/* ── Drag handle ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical
          data-export-hide=""
          size={16}
          className="text-faint group-hover:text-muted transition-colors"
        />
        {board.showNumbers && (
          <span className="hidden sm:block w-6 text-center text-footnote font-semibold text-muted tabular-nums select-none">
            {index + 1}
          </span>
        )}
      </div>

      {/* ── Thumbnail ───────────────────────────────────────────────── */}
      <div
        className="relative shrink-0"
        style={{ width: thumbWidth, height: THUMB_HEIGHT }}
      >
        {tile.hasImage ? (
          <div
            className="w-full h-full relative overflow-hidden cursor-pointer squircle"
            style={{
              borderRadius: thumbRadius,
              boxShadow: tileStateShadow({
                isSelected: tile.isSelected,
                resting: tile.isAdjusting
                  ? "0 0 0 2px var(--color-primary)"
                  : "inset 0 0 0 0.5px var(--material-hairline)",
              }),
            }}
          >
            <div ref={tile.imageRef} className="absolute inset-0">
              <RemoteImage
                src={data.imageSrc!}
                alt=""
                decoding="async"
                className="w-full h-full object-cover pointer-events-none"
                style={tile.imageStyle}
              />
            </div>

            {tile.isAdjusting && (
              <AdjustOverlay
                onPointerDown={tile.adjust.handlePointerDown}
                onPointerMove={tile.adjust.handlePointerMove}
                onPointerUp={tile.adjust.handlePointerUp}
                onPointerCancel={tile.adjust.handlePointerCancel}
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            data-export-hide=""
            aria-label={`Add image to row ${index + 1}`}
            onClick={(e) => tile.openMenu(e, e.currentTarget)}
            className="w-full h-full flex items-center justify-center squircle
                       bg-surface-secondary text-muted hover:text-text hover:bg-hover
                       transition-colors duration-150"
            style={{ borderRadius: thumbRadius }}
          >
            <PixelIcon name="upload" size={16} />
          </button>
        )}

        {tile.isAdjusting && (
          <AdjustControls
            compact
            className="absolute left-1/2 -top-3 z-40 -translate-x-1/2"
            onCancel={tile.adjust.stop}
            onSave={() => {
              tile.adjust.save();
              tile.clearInteraction();
            }}
          />
        )}
      </div>

      {/* ── Title ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <input
          type="text"
          aria-label={`Title for row ${index + 1}`}
          placeholder="Untitled"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => {
            if (localText !== (data.textLabel || "")) {
              handleUpdateCell(index, { textLabel: localText });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-callout font-medium text-text truncate
                     placeholder:text-faint outline-none border-none p-0"
        />
      </div>

      {/* ── Score ─────────────────────────────────────────────────────*/}
      <div className="shrink-0 flex items-center gap-2">
        <div data-export-hide="" className="w-20 sm:w-36">
          <Slider
            aria-label={`Score for row ${index + 1}`}
            min={0}
            max={10}
            step={1}
            value={data.rating || 0}
            onChange={(v) => handleUpdateCell(index, { rating: v })}
          />
        </div>
        <span
          className={`w-7 sm:w-9 text-right text-caption-1 font-semibold tabular-nums ${
            data.rating ? "text-text" : "text-faint"
          }`}
        >
          {data.rating ? data.rating : "—"}
        </span>
      </div>

      {/* ── Row menu ────────────────────────────────────────────────── */}
      {!tile.isAdjusting && (
        <button
          type="button"
          data-export-hide=""
          aria-label={`Row ${index + 1} options`}
          aria-haspopup="menu"
          aria-expanded={tile.isMenuOpen}
          onClick={(e) => tile.openMenu(e, e.currentTarget)}
          /* No `.affordance`: this sits on the row's own surface, not over
             artwork, and the class's rest opacity multiplied by `text-muted`
             made the row's only menu nearly invisible. */
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full
                     text-muted hover:text-text hover:bg-hover transition-colors
                     touch-target"
        >
          <MoreHorizontal size={17} />
        </button>
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
