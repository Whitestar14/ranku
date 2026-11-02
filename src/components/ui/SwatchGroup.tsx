import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { ColorPicker, ColorWheelSwatch } from "./ColorPicker";
import { isLightColor } from "@/theme/palettes";

export interface SwatchOption {
  value: string;
  label: string;
  style?: React.CSSProperties;
  checkColor?: string;
}

export const SwatchGroup: React.FC<{
  options: readonly SwatchOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  /** Adds the colour-wheel trigger for values outside `options`. */
  custom?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  };
  size?: number;
  className?: string;
}> = ({
  options,
  value,
  onChange,
  ariaLabel,
  custom,
  size = 28,
  className = "",
}) => {
  const activeIndex = options.findIndex(
    (option) => option.value.toLowerCase() === value.toLowerCase(),
  );
  const [focusIndex, setFocusIndex] = useState(
    activeIndex >= 0 ? activeIndex : 0,
  );
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (activeIndex >= 0) setFocusIndex(activeIndex);
  }, [activeIndex]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = options.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`flex flex-wrap items-center gap-2.5 ${className}`}
    >
      {options.map((option, index) => {
        const active = option.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => {
              setFocusIndex(index);
              onChange(option.value);
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            className="relative grid shrink-0 place-items-center rounded-full
                       transition-transform duration-150
                       hover:scale-110 active:scale-95
                       outline-none focus-visible:focus-ring"
            style={{
              width: size,
              height: size,
              backgroundColor: option.style ? undefined : option.value,
              ...option.style,
              boxShadow: active
                ? "0 0 0 2px var(--color-background), 0 0 0 3.5px var(--color-primary)"
                : "inset 0 0 0 0.5px var(--material-hairline)",
            }}
          >
            {active && (
              <Check
                size={14}
                strokeWidth={3.2}
                aria-hidden
                style={{
                  color:
                    option.checkColor ??
                    (isLightColor(option.value) ? "#000" : "#fff"),
                }}
              />
            )}
          </button>
        );
      })}

      {custom && (
        <ColorPicker
          label={custom.label}
          value={custom.value}
          onChange={custom.onChange}
          className="w-fit"
          trigger={
            <ColorWheelSwatch
              size={size}
              active={activeIndex < 0}
              value={activeIndex < 0 ? custom.value : undefined}
            />
          }
        />
      )}
    </div>
  );
};
