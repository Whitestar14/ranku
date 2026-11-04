import React, { useCallback } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { MoreHorizontal } from "lucide-react";
import { CellData } from "@/types";
import { PopoverMenu } from "./ui/PopoverMenu";
import { RemoteImage } from "./ui/RemoteImage";
import { AdjustControls, AdjustOverlay } from "./ui/AdjustOverlay";
import { UrlInputModal } from "./ui/UrlInputModal";
import { useCellInteraction } from "@/hooks/useCellInteraction";
import { useStore } from "@/store/useStore";
import { widthForHeight } from "@/utils/ui";
import { useTile } from "./tile/useTile";
import {
  DEFAULT_TIER_ROW_HEIGHT,
  DEFAULT_TIER_CORNERS,
  dropTint,
  tierItemRadius,
  tileStateShadow,
  type TierCorners,
} from "@/utils/boardStyle";

interface TierItemProps {
  rowId: string;
  idx: number;
  item: CellData;
  aspectRatio: string;
  /** Item rail height, so every tier row lines up. */
  height?: number;
  corners?: TierCorners;
}

export const TierItem = React.memo(function TierItem({
  rowId,
  idx,
  item,
  aspectRatio,
  height = DEFAULT_TIER_ROW_HEIGHT,
  corners = DEFAULT_TIER_CORNERS,
}: TierItemProps) {
  const handleItemTransfer = useStore((s) => s.handleItemTransfer);
  const handleUpdateTierItem = useStore((s) => s.handleUpdateTierItem);

  const tile = useTile({
    index: idx,
    item,
    rowId,
    aspectRatio,
    update: (patch) => handleUpdateTierItem(rowId, item.id, patch),
    setImage: (src) => handleUpdateTierItem(rowId, item.id, { imageSrc: src }),
    returnToLibrary: () =>
      handleItemTransfer(
        { type: "tier", rowId, itemId: item.id },
        { type: "inbox" },
      ),
    filename: `tier-${idx + 1}.jpg`,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging,
  } = useDraggable({
    id: tile.dragId,
    data: tile.dragData,
    disabled: tile.dragDisabled,
  });

  const { setNodeRef: setTileNodeRef } = tile;
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setTileNodeRef(node);
      setDragNodeRef(node);
    },
    [setTileNodeRef, setDragNodeRef],
  );

  const width = widthForHeight(aspectRatio, height);
  const radius = tierItemRadius(height, corners);

  return (
    <div
      ref={setRefs}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Tier item, position ${idx + 1}`}
      onClick={tile.activate}
      onContextMenu={tile.openMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          tile.openMenu(e as unknown as React.MouseEvent);
        }
      }}
      /* Draggable, so the touch sensor needs to own the gesture; without
         `touch-none` a phone treats the drag as a scroll. */
      className={`relative shrink-0 group/tile outline-none touch-none
                  transition-[width,height,opacity] duration-240 ease-emphasized ${
                    isDragging ? "opacity-25" : ""
                  }`}
      style={{ width, height }}
    >
      <div
        className="relative w-full h-full overflow-hidden squircle transition-[border-radius] duration-240 ease-emphasized"
        style={{
          borderRadius: radius,
          boxShadow: tileStateShadow({
            isSelected: tile.isSelected,
            resting: "inset 0 0 0 0.5px var(--material-hairline)",
          }),
        }}
      >
        {tile.hasImage && (
          <div ref={tile.imageRef} className="absolute inset-0">
            <RemoteImage
              src={item.imageSrc!}
              alt=""
              decoding="async"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={tile.imageStyle}
            />
          </div>
        )}

        {!tile.isAdjusting && (
          <button
            type="button"
            data-export-hide=""
            aria-label="Item actions"
            aria-haspopup="menu"
            aria-expanded={tile.isMenuOpen}
            onClick={(e) => tile.openMenu(e, e.currentTarget)}
            className="absolute top-1 right-1 z-10 flex items-center justify-center w-6 h-6
                       media-scrim squircle hover:brightness-125 active:scale-95
                       transition-transform duration-150 affordance touch-target"
            style={{ borderRadius: "var(--radius-mini)" }}
          >
            <MoreHorizontal size={13} strokeWidth={2.5} />
          </button>
        )}

        {(tile.isOver || tile.isFileDragOver) && (
          <span
            aria-hidden
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: dropTint(), borderRadius: radius }}
          />
        )}

        {tile.dropPulse > 0 && (
          <span
            key={tile.dropPulse}
            aria-hidden
            className="drop-land absolute inset-0 z-30 pointer-events-none"
            style={{ borderRadius: radius }}
          />
        )}

        {tile.isAdjusting && (
          <>
            <AdjustOverlay
              onPointerDown={tile.adjust.handlePointerDown}
              onPointerMove={tile.adjust.handlePointerMove}
              onPointerUp={tile.adjust.handlePointerUp}
              onPointerCancel={tile.adjust.handlePointerCancel}
            />
            <AdjustControls
              compact
              className="absolute inset-x-0 bottom-1 z-40 mx-auto w-max"
              onCancel={tile.adjust.stop}
              onSave={() => {
                tile.adjust.save();
                tile.clearInteraction();
              }}
            />
          </>
        )}
      </div>

      <PopoverMenu
        isOpen={tile.isMenuOpen}
        onClose={tile.closeMenu}
        actions={tile.actions}
        triggerPoint={tile.anchor}
        separators="explicit"
      />

      <input
        ref={tile.fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={tile.handleFileChange}
      />

      <UrlInputModal
        isOpen={tile.isUrlModalOpen}
        onClose={tile.closeUrlModal}
        onSubmit={tile.submitUrl}
      />
    </div>
  );
});

/**
 * The droppable lane a tier row's items sit in. Dropping anywhere in the lane
 * appends to that tier (`index: -1`).
 */
export const TierRail: React.FC<{
  rowId: string;
  height: number;
  gap: number;
  children: React.ReactNode;
  justify?: "left" | "center" | "right";
}> = ({ rowId, height, gap, children, justify }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `tier-row-body-${rowId}`,
    data: { type: "tier-cell", rowId, index: -1 },
  });
  const isPlacing = useStore((s) => s.placement !== null);

  const { handleInteraction } = useCellInteraction({
    type: "tier-item",
    index: -1,
    rowId,
  });

  const justifyClass =
    justify === "left"
      ? "justify-start"
      : justify === "right"
        ? "justify-end"
        : "justify-center";

  return (
    <div
      ref={setNodeRef}
      onClick={(e) =>
        handleInteraction(e.clientX, e.clientY, e.target as HTMLElement)
      }
      className={`relative flex-1 min-w-0 flex flex-wrap content-start items-start ${justifyClass} ${
        isPlacing ? "cursor-crosshair" : ""
      }`}
      style={{
        gap,
        padding: gap,
        minHeight: height + gap * 2,
        backgroundColor: isOver
          ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
          : isPlacing
            ? "color-mix(in srgb, var(--color-primary) 4%, transparent)"
            : undefined,
        transition:
          "gap 240ms var(--ease-emphasized), padding 240ms var(--ease-emphasized), min-height 240ms var(--ease-emphasized), background-color 150ms var(--ease-standard)",
      }}
    >
      {children}
    </div>
  );
};
