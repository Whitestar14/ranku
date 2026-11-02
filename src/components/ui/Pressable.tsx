import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/utils";
import { motion as motionPreset } from "@/lib/motion";

/**
 * Deliberately narrower than `HTMLMotionProps<"button">`: motion redefines the
 * drag handlers (`onDrag`, `onPanStart`, …) to take gesture info, which
 * conflicts with the DOM signatures any component built on plain button props
 * is already passing down.
 */
export interface PressableProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "ref" | "children"
> {
  children?: React.ReactNode;
  /**
   * How far the control compresses on press. Defaults to a subtle 3%; pass a
   * larger value for large, isolated targets like a tile or a dock card.
   */
  scale?: number;
}

/** A button that compresses slightly while pressed. */
export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  ({ children, className, scale = 0.97, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale }}
      transition={motionPreset.snappy}
      className={cn(
        "outline-none focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...(props as unknown as HTMLMotionProps<"button">)}
    >
      {children}
    </motion.button>
  ),
);

Pressable.displayName = "Pressable";
