import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils";

interface AdjustOverlayProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

/** The dimmed, draggable area over the artwork. Controls live outside it. */
export const AdjustOverlay: React.FC<AdjustOverlayProps> = ({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) => (
  <div
    className="absolute inset-0 z-20 cursor-move select-none touch-none"
    style={{ background: "rgba(0,0,0,0.45)" }}
    onMouseDown={(e) => e.stopPropagation()}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerCancel}
  />
);

interface AdjustControlsProps {
  onCancel: () => void;
  onSave: () => void;
  /** Smaller buttons for list rows and tier items. */
  compact?: boolean;
  className?: string;
}

export const AdjustControls: React.FC<AdjustControlsProps> = ({
  onCancel,
  onSave,
  compact = false,
  className,
}) => {
  const size = compact ? "h-6 w-6" : "h-8 w-8";
  const icon = compact ? 12 : 15;

  return (
    <div
      data-export-hide=""
      className={cn(
        "flex items-center gap-0.5 rounded-full p-0.5 material-thick",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="gray"
        size="xs"
        shape="pill"
        iconOnly
        expandTap={false}
        aria-label="Cancel adjustments"
        icon={<X size={icon} strokeWidth={2.4} />}
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className={cn(size, "shadow-none")}
      />
      <Button
        variant="filled"
        size="xs"
        shape="pill"
        iconOnly
        expandTap={false}
        aria-label="Save adjustments"
        icon={<Check size={icon} strokeWidth={2.6} />}
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        className={cn(size, "shadow-none")}
      />
    </div>
  );
};
