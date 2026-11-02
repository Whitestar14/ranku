import React, { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  GripVertical,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Eraser,
  Trash2,
} from "lucide-react";
import { TierRow as TierRowData } from "@/types";
import { useStore } from "@/store/useStore";
import { PopoverMenu } from "./ui/PopoverMenu";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { ColorPicker, ColorWheelSwatch } from "./ui/ColorPicker";
import { TierItem, TierRail } from "./TierItem";
import { TierLabel } from "./tier/TierLabel";
import {
  DEFAULT_TIER_ROW_HEIGHT,
  DEFAULT_TIER_SPACING,
  DEFAULT_TIER_CORNERS,
  tierGapFor,
  type TierCorners,
  type TierSpacing,
} from "@/utils/boardStyle";
import { TIER_COLORS } from "@/constants/tierColors";
import { normalizeTierColor } from "@/utils/dominantColor";
import { getContrastColor } from "@/theme/palettes";
import { layoutMotion } from "@/lib/motion";

interface TierRowProps {
  row: TierRowData;
  index: number;
  aspectRatio: string;
  height?: number;
  spacing?: TierSpacing;
  corners?: TierCorners;
  justify?: "left" | "center" | "right";
  onUpdate: (rowId: string, updates: Partial<TierRowData>) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (index: number) => void;
}

export const TierRow = React.memo(function TierRow({
  row,
  index,
  aspectRatio,
  height = DEFAULT_TIER_ROW_HEIGHT,
  spacing = DEFAULT_TIER_SPACING,
  corners = DEFAULT_TIER_CORNERS,
  justify,
  onUpdate,
  onMove,
  onDelete,
}: TierRowProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [draftLabel, setDraftLabel] = useState(row.label);

  const labelRef = useRef<HTMLButtonElement>(null);
  const textColor = getContrastColor(row.color);
  const isPlacing = useStore((s) => s.placement !== null);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `tier-row-drop-${row.id}`,
    data: { type: "tier-row", index },
  });

  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: `tier-row-drag-${row.id}`,
    data: {
      type: "tier-row",
      index,
      label: row.label,
      color: row.color,
      textColor,
    },
  });

  const setLabelRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      (labelRef as React.MutableRefObject<HTMLButtonElement | null>).current =
        node;
      setDroppableRef(node);
      setDraggableRef(node);
    },
    [setDroppableRef, setDraggableRef],
  );

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
    setIsMenuOpen(true);
  }, []);

  const railInset = tierGapFor(spacing);
  const labelCap = Math.min(46, Math.round(height * 0.46));

  const saveLabel = () => {
    onUpdate(row.id, { label: (draftLabel || "?").trim() || "?" });
    setIsEditorOpen(false);
  };

  return (
    <motion.div
      layout="position"
      transition={layoutMotion}
      exit={{ opacity: 0, height: 0 }}
      className="item-enter group/tier relative flex items-stretch overflow-hidden bg-surface
                 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-hairline"
      style={
        {
          "--enter-delay": `${Math.min(index, 14) * 26}ms`,
        } as React.CSSProperties
      }
    >
      <button
        ref={setLabelRefs}
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          if (isPlacing) {
            const store = useStore.getState();
            const image = store.placement;
            if (image) {
              store.handleItemTransfer(
                {
                  type: "inbox",
                  collectionId: image.collectionId,
                  itemId: image.itemId,
                },
                { type: "tier", rowId: row.id, targetIndex: -1 },
              );
              store.setPlacement(null);
            }
            return;
          }
          setDraftLabel(row.label);
          setIsEditorOpen(true);
        }}
        aria-label={`Edit tier ${row.label}`}
        className="relative w-[72px] sm:w-[100px] shrink-0 grid place-items-center
                   cursor-grab active:cursor-grabbing touch-none outline-none
                   focus-visible:focus-ring
                   transition-[filter,min-height,background-color]
                   duration-200 ease-emphasized
                   hover:brightness-110"
        style={{
          backgroundColor: row.color,
          minHeight: height + railInset * 2,
          opacity: isDragging ? 0.4 : 1,
        }}
      >
        {isOver && (
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 2px var(--color-primary)" }}
          />
        )}

        <span
          aria-hidden
          data-export-hide=""
          className="absolute left-1 top-1 opacity-0 group-hover/tier:opacity-45 transition-opacity duration-150"
          style={{ color: textColor }}
        >
          <GripVertical size={13} />
        </span>

        <TierLabel label={row.label} color={textColor} cap={labelCap} />
      </button>

      <TierRail
        rowId={row.id}
        height={height}
        gap={railInset}
        justify={justify}
      >
        {row.items.map((item, idx) => (
          <TierItem
            key={item.id}
            rowId={row.id}
            idx={idx}
            item={item}
            aspectRatio={aspectRatio}
            height={height}
            corners={corners}
          />
        ))}
      </TierRail>

      <div
        data-export-hide=""
        className="relative w-[34px] shrink-0 flex items-center justify-center"
      >
        <button
          type="button"
          aria-label={`Tier ${row.label} options`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={openMenu}
          className="flex items-center justify-center w-7 h-7 rounded-full text-muted
                     hover:text-text hover:bg-hover transition-colors touch-target"
        >
          <MoreHorizontal size={17} />
        </button>
      </div>

      <PopoverMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        actions={[
          {
            label: "Move Up",
            icon: ChevronUp,
            onClick: () => onMove(index, "up"),
          },
          {
            label: "Move Down",
            icon: ChevronDown,
            onClick: () => onMove(index, "down"),
          },
          {
            label: "Clear Items",
            icon: Eraser,
            onClick: () => onUpdate(row.id, { items: [] }),
          },
          {
            label: "Delete Tier",
            icon: Trash2,
            variant: "danger",
            onClick: () => onDelete(index),
          },
        ]}
        triggerPoint={anchor}
      />

      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="Edit Tier"
        className="max-w-sm"
        contentClassName="flex flex-col gap-5"
        footer={
          <>
            <Button fullWidth size="lg" onClick={saveLabel}>
              Save
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="gray"
              onClick={() => setIsEditorOpen(false)}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3">
          <div
            className="relative w-16 h-16 shrink-0 overflow-hidden rounded-chip"
            style={{ backgroundColor: row.color }}
          >
            <TierLabel label={draftLabel || "?"} color={textColor} cap={28} />
          </div>
          <div className="flex-1 min-w-0">
            <label
              htmlFor={`tier-label-${row.id}`}
              className="block text-caption-2 font-semibold text-muted uppercase tracking-[0.04em] mb-1.5"
            >
              Tier Name
            </label>
            <Input
              id={`tier-label-${row.id}`}
              value={draftLabel}
              maxLength={24}
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveLabel();
              }}
              placeholder="S"
            />
          </div>
        </div>

        <div>
          <span className="block text-caption-2 font-semibold text-muted uppercase tracking-[0.04em] mb-2">
            Colour
          </span>
          <div className="flex flex-wrap gap-2.5">
            {TIER_COLORS.map((color) => {
              const active = row.color.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Set tier colour ${color}`}
                  aria-pressed={active}
                  onClick={() =>
                    onUpdate(row.id, { color: normalizeTierColor(color) })
                  }
                  className="w-8 h-8 rounded-full transition-transform duration-150 active:scale-90"
                  style={{
                    backgroundColor: color,
                    boxShadow: active
                      ? "0 0 0 2px var(--color-background), 0 0 0 4px var(--color-text)"
                      : "inset 0 0 0 0.5px var(--material-hairline)",
                  }}
                />
              );
            })}

            <ColorPicker
              label="Custom tier colour"
              value={row.color}
              onChange={(v) =>
                onUpdate(row.id, { color: normalizeTierColor(v) })
              }
              className="w-8 h-8 rounded-full"
              trigger={
                <ColorWheelSwatch
                  size={32}
                  value={row.color}
                  active={
                    !TIER_COLORS.some(
                      (c) => c.toLowerCase() === row.color.toLowerCase(),
                    )
                  }
                />
              }
            />
          </div>
        </div>
      </Modal>
    </motion.div>
  );
});
