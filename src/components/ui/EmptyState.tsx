import React from "react";
import { cn } from "@/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  /** One or two sentences on how to fill the surface. */
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2 px-6 py-8 text-center sm:gap-4 sm:py-16",
      className,
    )}
  >
    <span
      className="grid place-items-center w-11 h-11 rounded-card squircle sm:w-14 sm:h-14"
      style={{
        backgroundColor: "var(--color-surface-secondary)",
        color: "var(--color-muted)",
      }}
    >
      {icon}
    </span>

    <div className="flex flex-col gap-1">
      <span className="text-headline font-semibold text-text">{title}</span>
      {description && (
        <span className="text-subheadline text-muted max-w-xs">
          {description}
        </span>
      )}
    </div>

    {action}
  </div>
);
