import React from "react";
import { motion } from "motion/react";
import { motion as motionPreset } from "@/lib/motion";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /**
   * Accessible name, required when `label` is a glyph rather than text — the
   * aspect-ratio picker shows proportional shapes, which convey the ratio
   * visually and nothing at all to a screen reader.
   */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Capsule shape, as used for search scope bars. */
  pill?: boolean;
  hug?: boolean;
  className?: string;
}

/** The floating selection pill, shared by both layout modes. */
const pillStyle: React.CSSProperties = {
  borderRadius: "inherit",
  boxShadow:
    "0 3px 8px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04), inset 0 0 0 0.5px var(--material-hairline)",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  pill = false,
  hug = false,
  className = "",
}: SegmentedControlProps<T>) {
  // Unique per instance so several `hug` controls on one screen do not animate
  // their pills into each other.
  const pillId = React.useId();

  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );

  const shape = pill ? "rounded-full" : "rounded-chip";

  return (
    <div
      role="radiogroup"
      className={`relative flex items-center p-[2px] squircle ${shape} ${className}`}
      style={{ backgroundColor: "var(--color-control-track)" }}
    >
      {/* Fill mode can measure its own width, so one pill serves every segment. */}
      {!hug && (
        <motion.span
          aria-hidden
          className={`absolute inset-y-[2px] left-[2px] pointer-events-none z-0 ${shape}`}
          style={{ width: `calc((100% - 4px) / ${options.length})` }}
          initial={false}
          animate={{ x: `${activeIndex * 100}%` }}
          transition={motionPreset.control}
        >
          <span
            className="block w-full h-full"
            style={{
              ...pillStyle,
              backgroundColor: "var(--color-control-thumb)",
            }}
          />
        </motion.span>
      )}

      {options.map((option, i) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.ariaLabel}
            title={option.ariaLabel}
            onClick={(e) => {
              e.stopPropagation();
              onChange(option.value);
            }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const delta = e.key === "ArrowRight" ? 1 : -1;
              const next =
                options[(i + delta + options.length) % options.length];
              onChange(next.value);
            }}
            /* `px-2` in fill mode rather than `px-3`: five segments in a 20rem
               rail left so little room that a large system font size truncated
               every label to an ellipsis ("9:16" rendered as "9..."). */
            className={`
              relative z-10 flex items-center justify-center gap-1.5
              py-1.5 text-footnote transition-colors duration-150
              outline-none focus-visible:focus-ring ${shape}
              ${hug ? "px-3" : "flex-1 min-w-0 px-2"}
              ${
                isActive
                  ? "font-semibold text-text"
                  : "font-medium text-muted hover:text-text"
              }
            `}
          >
            {/* Hug mode cannot pre-measure, so the pill lives in the segment
                that is active and motion animates it across. */}
            {hug && isActive && (
              <motion.span
                aria-hidden
                layoutId={pillId}
                className={`absolute inset-0 pointer-events-none ${shape}`}
                style={{
                  ...pillStyle,
                  backgroundColor: "var(--color-control-thumb)",
                }}
                transition={motionPreset.control}
              />
            )}
            {option.icon && (
              <span className="relative shrink-0 flex items-center">
                {option.icon}
              </span>
            )}
            <span className={hug ? "relative whitespace-nowrap" : "truncate"}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
