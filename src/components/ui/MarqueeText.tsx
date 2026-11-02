import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/utils";
import { observeResize } from "@/utils/resizeObserver";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className,
}) => {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const next = Math.max(
        0,
        Math.ceil(inner.scrollWidth - outer.clientWidth),
      );
      setDistance(next > 2 ? next : 0);
    };

    measure();
    const stopOuter = observeResize(outer, measure);
    const stopInner = observeResize(inner, measure);
    return () => {
      stopOuter();
      stopInner();
    };
  }, [text]);

  return (
    <span
      ref={outerRef}
      title={text}
      className={cn("block min-w-0 overflow-hidden", className)}
      style={
        distance > 0
          ? {
              maskImage:
                "linear-gradient(to right, transparent 0, #000 10px, #000 calc(100% - 16px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0, #000 10px, #000 calc(100% - 16px), transparent 100%)",
            }
          : undefined
      }
    >
      <span
        ref={innerRef}
        className={cn(
          "block w-max max-w-none whitespace-nowrap",
          distance > 0 && "marquee-track",
        )}
        style={
          distance > 0
            ? ({
                "--marquee-distance": `-${distance}px`,
                "--marquee-duration": `${Math.min(
                  9,
                  Math.max(3.2, distance / 22),
                )}s`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </span>
  );
};
