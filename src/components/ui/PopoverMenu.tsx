import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { motion as motionPreset } from "@/lib/motion";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export type PopoverIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

export interface PopoverAction {
  label: string;
  icon: PopoverIcon;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  /** Shown under the label; use for the reason an item is disabled. */
  hint?: string;
  /** Only honored when `separators="explicit"`. */
  separator?: boolean;
  /** Marks the current choice, for menus that act as a picker. */
  selected?: boolean;
}

interface PopoverMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: PopoverAction[];
  className?: string;
  /** Parent-relative placement, used only when `triggerPoint` is null. */
  align?: "center" | "top" | "bottom";
  triggerPoint?: {
    x: number;
    y: number;
    /** Which edge of the menu touches the trigger point. Default "center". */
    anchor?: "center" | "left" | "right";
    /** Preferred side. Falls back to the other side if it has no room. */
    prefer?: "above" | "below";
  } | null;
  /** Focused on Escape / item select. Also treated as the trigger, so clicks
      on it don't count as "outside". */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  ariaLabel?: string;
  /** "every" (legacy default), "explicit" (only flagged items), or "none". */
  separators?: "every" | "explicit" | "none";
}

const GAP = 12;
const PADDING = 12;

export const PopoverMenu: React.FC<PopoverMenuProps> = ({
  isOpen,
  onClose,
  actions,
  className = "",
  align = "center",
  triggerPoint = null,
  returnFocusRef,
  ariaLabel,
  separators = "every",
}) => {
  const isFixed = !!triggerPoint;
  const menuRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const shouldRefocusRef = React.useRef(true);
  const [coords, setCoords] = React.useState<{
    left: number;
    top: number;
  } | null>(null);

  /* ---------- Positioning ---------- */
  React.useLayoutEffect(() => {
    if (!isOpen || !triggerPoint || !menuRef.current) {
      if (!isOpen) setCoords(null);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.visualViewport?.height ?? window.innerHeight;

    // Horizontal: pre-clamped `left`, no translate needed.
    const anchor = triggerPoint.anchor ?? "center";
    let left = triggerPoint.x;
    if (anchor === "right") left -= rect.width;
    else if (anchor === "center") left -= rect.width / 2;
    left = Math.max(PADDING, Math.min(left, winW - rect.width - PADDING));

    // Vertical: prefer the requested side, fall back to whichever has room.
    const prefer = triggerPoint.prefer ?? "above";
    const roomAbove = triggerPoint.y - PADDING >= rect.height + GAP;
    const roomBelow = winH - triggerPoint.y - PADDING >= rect.height + GAP;
    let openUp: boolean;
    if (prefer === "above" && roomAbove) openUp = true;
    else if (prefer === "below" && roomBelow) openUp = false;
    else if (roomAbove) openUp = true;
    else if (roomBelow) openUp = false;
    else openUp = triggerPoint.y > winH / 2;
    const top = openUp
      ? Math.max(PADDING, triggerPoint.y - GAP - rect.height)
      : Math.min(triggerPoint.y + GAP, winH - rect.height - PADDING);

    setCoords({ left, top });
  }, [isOpen, triggerPoint]);

  /* ---------- Reset refocus intent on every open ---------- */
  React.useEffect(() => {
    if (isOpen) shouldRefocusRef.current = true;
  }, [isOpen]);

  /* ---------- Return focus on close ---------- */
  React.useEffect(() => {
    if (isOpen) return;
    if (!shouldRefocusRef.current) return;
    returnFocusRef?.current?.focus();
  }, [isOpen, returnFocusRef]);

  /* ---------- Click-outside ---------- */
  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      // The trigger is "inside" for the purpose of closing.
      if (returnFocusRef?.current?.contains(target)) return;
      shouldRefocusRef.current = false;
      onClose();
    };
    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
    };
  }, [isOpen, onClose, returnFocusRef]);

  /* ---------- Focus first enabled item on open ---------- */
  React.useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      const first = itemRefs.current.find(
        (el): el is HTMLButtonElement => !!el && !el.disabled,
      );
      first?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  /* ---------- Keyboard ---------- */
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      shouldRefocusRef.current = true;
      onClose();
      return;
    }

    const enabled = itemRefs.current.filter(
      (el): el is HTMLButtonElement => !!el && !el.disabled,
    );
    if (enabled.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const idx = enabled.indexOf(active as HTMLButtonElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      enabled[(idx + 1) % enabled.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      enabled[(idx - 1 + enabled.length) % enabled.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      enabled[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      enabled[enabled.length - 1]?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  const renderSeparator = (i: number, action: PopoverAction) => {
    if (separators === "none") return false;
    if (i === 0) return false;
    if (separators === "every") return true;
    return !!action.separator;
  };

  const style: React.CSSProperties = isFixed
    ? {
        position: "fixed",
        left: coords?.left ?? triggerPoint?.x,
        top: coords?.top ?? triggerPoint?.y,
        opacity: coords ? 1 : 0,
        pointerEvents: coords ? "auto" : "none",
        zIndex: 150,
      }
    : {};

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          aria-label={ariaLabel}
          initial={{ opacity: 0, scale: 0.9, y: 4 }}
          animate={{ opacity: coords ? 1 : 0, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={motionPreset.sheet}
          style={style}
          onKeyDown={onMenuKeyDown}
          className={`popover-menu w-max min-w-[200px] material-popover squircle rounded-tile
            flex flex-col p-1 outline-none ${
              isFixed
                ? ""
                : "absolute left-1/2 -translate-x-1/2 " +
                  (align === "top"
                    ? "bottom-full mb-2"
                    : align === "bottom"
                      ? "top-full mt-2"
                      : "top-1/2 -translate-y-1/2")
            } ${className}`}
        >
          {actions.map((action, i) => (
            /* Labels are not unique — two collections can share a name — so the
               index is part of the key. */
            <React.Fragment key={`${action.label}-${i}`}>
              {renderSeparator(i, action) && (
                <div
                  aria-hidden
                  className="h-[0.5px] mx-3 my-0.5"
                  style={{ backgroundColor: "var(--material-hairline)" }}
                />
              )}
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role={
                  action.selected === undefined ? "menuitem" : "menuitemradio"
                }
                aria-checked={action.selected}
                disabled={action.disabled}
                onClick={(e) => {
                  if (action.disabled) return;
                  e.stopPropagation();
                  shouldRefocusRef.current = true;
                  action.onClick(e);
                  onClose();
                }}
                className={`flex items-center justify-between gap-4 min-h-11 px-3.5 rounded-control
                  text-subheadline font-normal transition-colors duration-100 outline-none
                  focus-visible:outline-none
                  ${
                    action.variant === "danger"
                      ? "text-destructive hover:bg-destructive/12 focus-visible:bg-destructive/12 active:bg-destructive/20"
                      : "text-text hover:bg-hover focus-visible:bg-hover active:bg-hover"
                  }
                  ${
                    action.disabled
                      ? "cursor-not-allowed opacity-40 hover:bg-transparent focus-visible:bg-transparent"
                      : ""
                  }`}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="block truncate">{action.label}</span>
                  {action.hint && (
                    <span className="block truncate text-caption-1 text-muted">
                      {action.hint}
                    </span>
                  )}
                </span>
                {action.selected ? (
                  <PixelIcon
                    name="check"
                    size={16}
                    className="shrink-0 text-primary"
                  />
                ) : (
                  <action.icon
                    size={17}
                    strokeWidth={1.8}
                    className={
                      action.variant === "danger"
                        ? "shrink-0 text-destructive"
                        : "shrink-0 text-muted"
                    }
                  />
                )}
              </button>
            </React.Fragment>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isFixed) return createPortal(content, document.body);
  return content;
};
