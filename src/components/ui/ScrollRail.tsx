import React, { useCallback, useEffect, useRef, useState } from "react";
import { observeResize } from "@/utils/resizeObserver";

export interface ScrollRailProps {
  children: React.ReactNode;
  className?: string;
  scrollerClassName?: string;
  contentClassName?: string;
  /** Vertical alignment of the row within the rail. */
  align?: "start" | "center";
  /** Width of the trailing space that keeps the last item clear of the edge. */
  trailingSpace?: string;
}

const EDGE_FADE = 34;

export const ScrollRail: React.FC<ScrollRailProps> = ({
  children,
  className,
  scrollerClassName,
  contentClassName,
  align = "start",
  trailingSpace = "pr-10",
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const childCount = React.Children.count(children);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const next = {
      start: scrollLeft > 8,
      end: scrollLeft < scrollWidth - clientWidth - 8,
    };
    setEdges((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  }, []);

  useEffect(() => {
    measure();
    const el = scrollerRef.current;
    if (!el) return;
    const stops = [
      observeResize(el, measure),
      ...Array.from(el.children).map((child) => observeResize(child, measure)),
    ];
    return () => stops.forEach((stop) => stop());
  }, [measure, childCount]);

  const stops = [
    edges.start ? `transparent 0, #000 ${EDGE_FADE}px` : `#000 0`,
    edges.end
      ? `#000 calc(100% - ${EDGE_FADE}px), transparent 100%`
      : `#000 100%`,
  ].join(", ");
  const edgeMask =
    edges.start || edges.end
      ? {
          maskImage: `linear-gradient(to right, ${stops})`,
          WebkitMaskImage: `linear-gradient(to right, ${stops})`,
        }
      : undefined;

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={scrollerRef}
        onScroll={measure}
        className={`w-full overflow-x-auto overflow-y-hidden overscroll-x-contain
                    scrollbar-none touch-pan-x ${scrollerClassName ?? ""}`}
        style={edgeMask}
      >
        <div
          className={`flex w-max gap-2 ${trailingSpace} ${
            align === "center" ? "h-full items-center" : "items-start"
          } ${contentClassName ?? ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
