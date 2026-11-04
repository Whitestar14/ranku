import React from "react";

/**
 * The small label above a group of controls. Every panel and modal uses this
 * one, Title Case, so the same kind of heading never renders two ways.
 */
export const SectionLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: "span" | "h3";
}> = ({ children, className = "", as: Tag = "span" }) => (
  <Tag
    className={`block text-caption-1 font-semibold text-muted ${className}`.trim()}
  >
    {children}
  </Tag>
);
