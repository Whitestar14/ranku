import React from "react";
import { cn } from "@/utils";
import { motion } from "motion/react";
import { motion as motionPreset } from "@/lib/motion";

export interface ToggleProps extends Omit<
  React.ComponentProps<typeof motion.button>,
  "onChange" | "type" | "role" | "aria-checked" | "children"
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      checked,
      onCheckedChange,
      disabled,
      onClick,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => (
    <motion.button
      {...props}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange(!checked);
        onClick?.(e);
      }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={motionPreset.snappy}
      className={cn(
        "relative inline-flex h-7.75 w-12.75 shrink-0 items-center rounded-full",
        "touch-target",
        "transition-colors duration-200 ease-standard",
        "outline-none focus-visible:focus-ring",
        checked ? "bg-accent-green" : "bg-surface-secondary",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-6.75 w-6.75 rounded-full bg-white",
          "shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]",
          "transition-transform duration-200 ease-standard",
          checked ? "translate-x-5.5" : "translate-x-0.5",
          "rtl:-translate-x-5.5",
          !checked && "rtl:-translate-x-0.5",
        )}
      />
    </motion.button>
  ),
);
Toggle.displayName = "Toggle";
