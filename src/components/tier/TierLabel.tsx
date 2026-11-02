import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { fitTierLabel, TIER_LABEL_LINE_HEIGHT } from "@/utils/tierLabel";

export const TierLabel: React.FC<{
  label: string;
  color: string;
  cap?: number;
  className?: string;
}> = ({ label, color, cap = 46, className = "" }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const read = () => {
      const next = { width: el.clientWidth, height: el.clientHeight };
      setBox((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };

    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    document.fonts?.ready.then(read).catch(() => {});
    return () => observer.disconnect();
  }, []);

  const fit = useMemo(
    () => fitTierLabel(label, box.width || 100, box.height || 88, cap),
    [label, box.width, box.height, cap],
  );

  return (
    <div
      ref={boxRef}
      aria-hidden
      className={`absolute inset-0 grid place-items-center pointer-events-none overflow-hidden ${className}`}
    >
      <span
        className="font-bold text-center"
        style={{
          color,
          fontSize: fit.fontSize,
          lineHeight: TIER_LABEL_LINE_HEIGHT,
          letterSpacing: "-0.02em",
          width: "100%",
          overflowWrap: fit.breaksWords ? "anywhere" : "normal",
          wordBreak: "normal",
          whiteSpace: "normal",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: fit.lines,
          overflow: "hidden",
        }}
      >
        {label}
      </span>
    </div>
  );
};
