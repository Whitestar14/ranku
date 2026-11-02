import React from "react";
import { cn } from "@/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, trailing, ...props }, ref) => (
    <div className="relative flex items-center w-full">
      {icon && (
        <div className="absolute left-3 text-muted pointer-events-none flex items-center">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-chip px-3 text-body text-text",
          "bg-surface-secondary placeholder:text-faint",
          "outline-none ring-0 border border-transparent",
          "transition-[background-color,border-color] duration-150",
          "focus:bg-surface-elevated focus:border-border",
          "disabled:cursor-not-allowed disabled:opacity-50",
          icon && "pl-9",
          trailing && "pr-22",
          className,
        )}
        {...props}
      />
      {trailing && (
        <div className="absolute right-1.5 flex items-center gap-1">
          {trailing}
        </div>
      )}
    </div>
  ),
);
Input.displayName = "Input";
