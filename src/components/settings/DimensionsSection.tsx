import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { NumberedSlider, SectionHeader, SettingsCard } from "./SettingsParts";
import { Input } from "@/components/ui/Input";
import { ProjectType } from "@/types";
import {
  CELL_WIDTH_MAX,
  CELL_WIDTH_MIN,
  DEFAULT_CELL_WIDTH,
  DEFAULT_TIER_ROW_HEIGHT,
} from "@/utils/boardStyle";
import { cn } from "@/utils";

interface DimensionsSectionProps {
  projectType: ProjectType;
  config: { rows: number; cols: number };
  cellWidth?: number | null;
  tierRowHeight?: number;
  onRowsChange: (v: number) => void;
  onColsChange: (v: number) => void;
  onCellWidthChange: (v: number) => void;
  onTierRowHeightChange: (v: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Stepper row                                                       */
/* ------------------------------------------------------------------ */

const StepperRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, onChange }) => {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const escapeRef = useRef(false);

  // Adopt external changes (stepper buttons, store updates from elsewhere).
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitValue = useCallback(
    (raw: number) => {
      const clamped = Math.max(min, Math.min(max, Math.round(raw)));
      onChange(clamped);
      setDraft(String(clamped));
    },
    [min, max, onChange],
  );

  const step = (delta: number) => {
    const draftNum = Number(draft);
    const base = Number.isFinite(draftNum) ? draftNum : value;
    commitValue(base + delta);
  };

  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5">
      <label
        htmlFor={id}
        className="flex-1 min-w-0 truncate text-footnote font-medium text-text"
      >
        {label}
      </label>

      <div className="w-12 shrink-0">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => {
            if (escapeRef.current) {
              escapeRef.current = false;
              setDraft(String(value));
              return;
            }
            const parsed = Number(e.currentTarget.value);
            if (Number.isFinite(parsed)) commitValue(parsed);
            else setDraft(String(value));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              escapeRef.current = true;
              e.currentTarget.blur();
            }
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          className={cn(
            "h-8 px-2 text-center",
            "text-subheadline font-semibold tabular-nums",
          )}
        />
      </div>

      <HoldButton
        label={`Decrease ${label.toLowerCase()}`}
        disabled={value <= min}
        onTick={() => step(-1)}
      >
        <Minus size={14} strokeWidth={2.4} />
      </HoldButton>
      <HoldButton
        label={`Increase ${label.toLowerCase()}`}
        disabled={value >= max}
        onTick={() => step(1)}
      >
        <Plus size={14} strokeWidth={2.4} />
      </HoldButton>
    </div>
  );
};

/** Circular stepper button */
const HoldButton: React.FC<{
  label: string;
  disabled?: boolean;
  onTick: () => void;
  children: React.ReactNode;
}> = ({ label, disabled, onTick, children }) => {
  const timeoutRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const stop = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    timeoutRef.current = undefined;
    intervalRef.current = undefined;
  }, []);

  useEffect(() => stop, [stop]);

  const start = () => {
    if (disabledRef.current) return;
    onTick();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        if (disabledRef.current) {
          stop();
          return;
        }
        onTick();
      }, 80);
    }, 400);
  };

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTick();
        }
      }}
      className={cn(
        "relative grid h-7 w-7 shrink-0 place-items-center rounded-full",
        "bg-surface-secondary text-text outline-none",
        "before:absolute before:-inset-2 before:content-[''] before:rounded-full",
        "transition-colors duration-150",
        "hover:bg-hover active:bg-surface-secondary",
        "focus-visible:focus-ring",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "disabled:hover:bg-surface-secondary",
      )}
    >
      {children}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export const DimensionsSection: React.FC<DimensionsSectionProps> = ({
  projectType,
  config,
  cellWidth,
  tierRowHeight,
  onRowsChange,
  onColsChange,
  onCellWidthChange,
  onTierRowHeightChange,
}) => {
  if (projectType === "tierlist") {
    return (
      <div className="flex flex-col gap-2.5">
        <SectionHeader>Dimensions</SectionHeader>
        <SettingsCard className="divide-y divide-hairline">
          <NumberedSlider
            label="Image Size"
            value={tierRowHeight ?? DEFAULT_TIER_ROW_HEIGHT}
            min={56}
            max={180}
            step={4}
            suffix="px"
            onChange={onTierRowHeightChange}
          />
        </SettingsCard>
      </div>
    );
  }

  const isRanking = projectType === "ranking";

  return (
    <div className="flex flex-col gap-2.5">
      <SectionHeader>Dimensions</SectionHeader>

      <SettingsCard className="divide-y divide-hairline">
        <StepperRow
          label={isRanking ? "Rows" : "Items"}
          value={config.rows}
          min={1}
          max={50}
          onChange={onRowsChange}
        />

        {isRanking && (
          <StepperRow
            label="Columns"
            value={config.cols}
            min={1}
            max={20}
            onChange={onColsChange}
          />
        )}

        {isRanking && (
          <NumberedSlider
            label="Cell Width"
            value={cellWidth ?? DEFAULT_CELL_WIDTH}
            min={CELL_WIDTH_MIN}
            max={CELL_WIDTH_MAX}
            step={5}
            suffix="px"
            onChange={onCellWidthChange}
          />
        )}
      </SettingsCard>
    </div>
  );
};
