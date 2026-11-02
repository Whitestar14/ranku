import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils";
import { Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { motion as motionPreset } from "@/lib/motion";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | React.ReactNode;
  className?: string;
  hideChevron?: boolean;
  dropdownClassName?: string;
  customTrigger?: React.ReactNode;
}

const MENU_GAP = 6;
const VIEWPORT_PAD = 12;
/** Height of one option including its padding, used only for the first frame. */
const OPTION_ESTIMATE = 44;
const MENU_CHROME = 8;

interface MenuCoords {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  className,
  hideChevron,
  dropdownClassName,
  customTrigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  const selectedOption = options.find((opt) => opt.value === value);

  const measure = useCallback(() => {
    const trigger = triggerRef.current ?? wrapperRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;

    const availableAbove = rect.top - VIEWPORT_PAD - MENU_GAP;
    const availableBelow =
      viewportHeight - rect.bottom - VIEWPORT_PAD - MENU_GAP;

    const measured = menuRef.current?.offsetHeight ?? 0;
    const estimated =
      options.length * OPTION_ESTIMATE + MENU_CHROME + VIEWPORT_PAD;
    const maxHeight = Math.max(
      96,
      Math.min(measured || estimated, viewportHeight - VIEWPORT_PAD * 2),
    );

    const openUp =
      availableBelow < maxHeight && availableAbove > availableBelow;

    const width = Math.min(
      Math.max(rect.width, 168),
      viewportWidth - VIEWPORT_PAD * 2,
    );
    const left = Math.max(
      VIEWPORT_PAD,
      Math.min(rect.left, viewportWidth - width - VIEWPORT_PAD),
    );
    const desiredTop = openUp
      ? rect.top - MENU_GAP - maxHeight
      : rect.bottom + MENU_GAP;
    const top = Math.max(
      VIEWPORT_PAD,
      Math.min(desiredTop, viewportHeight - maxHeight - VIEWPORT_PAD),
    );

    setCoords((prev) =>
      prev &&
      prev.left === left &&
      prev.top === top &&
      prev.width === width &&
      prev.maxHeight === maxHeight &&
      prev.openUp === openUp
        ? prev
        : { left, top, width, maxHeight, openUp },
    );
  }, [options.length]);

  const open = useCallback(() => {
    const el = triggerRef.current ?? wrapperRef.current;
    const rect = el?.getBoundingClientRect();
    if (rect) {
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      setCoords({
        left: Math.max(VIEWPORT_PAD, rect.left),
        top: rect.bottom + MENU_GAP,
        width: Math.max(rect.width, 168),
        maxHeight: Math.min(
          options.length * OPTION_ESTIMATE + MENU_CHROME,
          viewportHeight - VIEWPORT_PAD * 2,
        ),
        openUp: false,
      });
    }
    setIsOpen(true);
  }, [options.length]);

  const close = useCallback((refocus = true) => {
    setIsOpen(false);
    setCoords(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    measure();
  }, [isOpen, measure]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        wrapperRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const onViewportChange = () => measure();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isOpen, close, measure]);

  useEffect(() => {
    if (!isOpen) return;
    const index = options.findIndex((opt) => opt.value === value);
    setActiveIndex(index >= 0 ? index : 0);
    // Focus stays on the listbox; aria-activedescendant announces the option.
    menuRef.current?.focus({ preventScroll: true });
  }, [isOpen, options, value]);

  const choose = (next: string) => {
    onChange(next);
    close();
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      open();
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (prev) => (prev + delta + options.length) % Math.max(1, options.length),
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option.value);
    } else if (e.key === "Tab") {
      // Focus must not walk out while the menu is open.
      e.preventDefault();
      close();
    }
  };

  const menu = (
    <AnimatePresence>
      {isOpen && coords && (
        <motion.div
          ref={menuRef}
          role="listbox"
          id={listboxId}
          tabIndex={-1}
          aria-activedescendant={
            activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          initial={{
            opacity: 0,
            y: coords.openUp ? 4 : -4,
            scale: 0.9,
          }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
          transition={motionPreset.sheet}
          onKeyDown={onMenuKeyDown}
          style={{
            position: "fixed",
            left: coords.left,
            top: coords.top,
            width: coords.width,
            maxHeight: coords.maxHeight,
            zIndex: 150,
          }}
          className={cn(
            "flex flex-col overflow-hidden p-1 outline-none",
            "material-thick squircle rounded-tile",
            dropdownClassName,
          )}
        >
          <ul
            role="presentation"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-ios"
          >
            {options.map((option, i) => {
              const isSelected = value === option.value;
              return (
                <li
                  key={option.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActiveIndex(i)}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center justify-between gap-4",
                    "rounded-control px-3.5 text-subheadline text-text",
                    "cursor-pointer transition-colors duration-100",
                    i === activeIndex && "bg-hover",
                  )}
                >
                  <span className="block truncate">{option.label}</span>
                  {isSelected && (
                    <Check
                      size={17}
                      strokeWidth={1.8}
                      aria-hidden
                      className="shrink-0 text-primary"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {customTrigger ? (
        <div
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (isOpen) close();
              else open();
            } else {
              onTriggerKeyDown(e);
            }
          }}
          className="flex cursor-pointer items-center justify-center rounded-control
                     outline-none focus-visible:focus-ring"
        >
          {customTrigger}
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 px-3.5 text-left text-subheadline",
            "material-thin squircle rounded-control text-text",
            "transition-colors duration-150 hover:bg-hover active:opacity-80",
            "outline-none focus-visible:focus-ring",
          )}
        >
          <span
            className={cn("block truncate", !selectedOption && "text-muted")}
          >
            {selectedOption ? selectedOption.label : placeholder || "Select..."}
          </span>
          {!hideChevron && (
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={cn(
                "shrink-0 text-muted transition-transform duration-150",
                isOpen && "rotate-180",
              )}
            />
          )}
        </button>
      )}

      {createPortal(menu, document.body)}
    </div>
  );
};
