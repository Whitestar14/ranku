import React from "react";

export const SettingButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = "", style }) => {
  const childrenArray = React.Children.toArray(children).filter(Boolean);
  return (
    <div className={`flex flex-col shrink-0 ${className}`} style={style}>
      {childrenArray.map((child, idx) => (
        <React.Fragment key={idx}>
          {child}
          {idx < childrenArray.length - 1 && (
            <div
              className="h-[0.5px]"
              style={{ backgroundColor: "var(--color-divider)" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const SettingRow: React.FC<{
  icon?: React.ReactNode;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  iconBg?: string;
  onClick?: (e: React.MouseEvent | React.KeyboardEvent) => void;
  right?: React.ReactNode;
  destructive?: boolean;
  className?: string;
  asLabel?: boolean;
  as?: "div" | "button" | "label" | "a";
  href?: string;
  target?: string;
  rel?: string;
}> = ({
  icon,
  label,
  sublabel,
  iconBg = "bg-primary/20 text-primary",
  onClick,
  right,
  destructive,
  className = "",
  asLabel,
  as,
  href,
  target,
  rel,
  ...rest
}) => {
  const Component = as || (asLabel ? "label" : onClick ? "button" : "div");
  const isBtn = Component === "button";
  const isAnchor = Component === "a";
  const hasHref = isAnchor && typeof href === "string" && href.length > 0;

  const syntheticButton = !isBtn && !hasHref && !!onClick;
  const isClickable = !!onClick || asLabel || isAnchor;

  return (
    <Component
      type={isBtn ? "button" : undefined}
      onClick={onClick}
      role={syntheticButton ? "button" : undefined}
      tabIndex={syntheticButton ? 0 : undefined}
      onKeyDown={
        syntheticButton
          ? (e: React.KeyboardEvent) => {
              // If a focusable child (e.g. the Toggle) owns the key, let it.
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.(e);
              }
            }
          : undefined
      }
      {...(isAnchor ? { href, target, rel } : {})}
      className={`relative flex items-center gap-3.5 px-4 py-2 min-h-[3rem] w-full text-left transition-colors ${
        isClickable
          ? "hover:bg-hover active:bg-black/5 dark:active:bg-white/5 cursor-pointer"
          : ""
      } ${destructive ? "text-red-500" : "text-text"} ${className}`}
      {...rest}
    >
      {icon && (
        <div
          className={`w-7 h-7 rounded-chip flex items-center justify-center shrink-0 ${iconBg} shadow-sm`}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 pr-2">
        <div
          className={`text-subheadline font-medium truncate ${
            destructive ? "text-red-500" : ""
          }`}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className={`text-footnote leading-snug mt-0.5 line-clamp-2 ${
              destructive ? "text-red-500/60" : "text-muted"
            }`}
          >
            {sublabel}
          </div>
        )}
      </div>
      {right && <div className="shrink-0 flex items-center">{right}</div>}
    </Component>
  );
};
