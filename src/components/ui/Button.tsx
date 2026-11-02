import React from "react";
import { cn } from "@/utils";
import { Loader2 } from "lucide-react";
import { Pressable } from "@/components/ui/Pressable";

export type ButtonVariant =
  | "filled"
  | "tinted"
  | "gray"
  | "ghost"
  | "ghostPrimary"
  | "plain"
  | "danger"
  | "dangerTinted"
  | "dangerPlain"
  | "dangerFilled";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ButtonShape = "pill" | "rounded";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  iconOnly?: boolean;
  expandTap?: boolean;
  toggled?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "filled",
      size = "md",
      shape,
      iconOnly = false,
      expandTap,
      toggled = false,
      isLoading,
      children,
      disabled,
      icon,
      fullWidth,
      ...props
    },
    ref,
  ) => {
    /* ---------- Shape resolution ---------- */
    const resolvedShape: ButtonShape = shape ?? (iconOnly ? "pill" : "rounded");
    const shapeClass =
      resolvedShape === "pill" ? "rounded-full" : "rounded-control";

    /* ---------- Variant resolution ---------- */
    const variantClasses: Record<ButtonVariant, string> = {
      filled:
        "bg-primary text-on-accent hover:brightness-95 active:brightness-90",
      tinted:
        "bg-primary/15 text-primary hover:bg-primary/20 active:bg-primary/25",
      gray: "bg-surface-secondary text-text hover:bg-hover active:bg-hover/80",
      ghost: toggled
        ? "text-text bg-hover"
        : "text-muted hover:text-text hover:bg-hover active:opacity-70",
      ghostPrimary: toggled
        ? "text-primary bg-hover"
        : "text-primary hover:bg-hover active:bg-hover/80",
      plain: "text-primary hover:opacity-70 active:opacity-60",
      dangerTinted:
        "bg-destructive/15 text-destructive hover:bg-destructive/20 active:bg-destructive/25",
      dangerPlain:
        "text-destructive hover:bg-destructive/10 active:bg-destructive/15",
      dangerFilled:
        "bg-destructive text-on-accent hover:brightness-95 active:brightness-90",
      danger:
        "bg-destructive/15 text-destructive hover:bg-destructive/20 active:bg-destructive/25",
    };

    /* ---------- Sizes ---------- */
    const sizeHeights: Record<ButtonSize, string> = {
      xs: "h-7",
      sm: "h-8",
      md: "h-9",
      lg: "h-11",
      xl: "h-12",
    };
    const sizeWidths: Record<ButtonSize, string> = {
      xs: "w-7",
      sm: "w-8",
      md: "w-9",
      lg: "w-11",
      xl: "w-12",
    };
    const sizePaddings: Record<ButtonSize, string> = {
      xs: "px-2.5 text-caption-1 gap-1",
      sm: "px-3 text-footnote gap-1",
      md: "px-3.5 text-subheadline gap-1.5",
      lg: "px-4 text-subheadline gap-1.5",
      xl: "px-6 text-body gap-2",
    };

    /* ---------- Tap-target expansion ---------- */
    const shouldExpand =
      expandTap ?? (size === "xs" || size === "sm" || size === "md");
    const expandInsetClass =
      size === "xs"
        ? "before:-inset-2"
        : size === "sm"
          ? "before:-inset-1.5"
          : "before:-inset-1";
    const expandRadiusClass =
      resolvedShape === "pill"
        ? "before:rounded-full"
        : "before:rounded-control";
    const expandClass = shouldExpand
      ? `before:absolute before:content-[''] ${expandInsetClass} ${expandRadiusClass}`
      : "";

    const sizeClass = iconOnly
      ? `${sizeHeights[size]} ${sizeWidths[size]} p-0`
      : `${sizeHeights[size]} ${sizePaddings[size]}`;

    return (
      <Pressable
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center font-semibold",
          "transition-[background-color,color,opacity,filter] duration-150",
          variantClasses[variant],
          sizeClass,
          shapeClass,
          expandClass,
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          icon && <span className="shrink-0 flex items-center">{icon}</span>
        )}
        {children}
      </Pressable>
    );
  },
);
Button.displayName = "Button";
