import React from "react";
import { SquareDashed, Square } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SwatchGroup, type SwatchOption } from "@/components/ui/SwatchGroup";
import {
  Field,
  NumberedSlider,
  SectionHeader,
  SettingsCard,
} from "./SettingsParts";
import { ProjectType, Rank } from "@/types";
import {
  DEFAULT_CARD_RADIUS,
  DEFAULT_TIER_CORNERS,
  DEFAULT_TIER_SPACING,
  type TierCorners,
  type TierSpacing,
} from "@/utils/boardStyle";
import { DEFAULT_ASPECT } from "@/utils/ui";

const GRID_BG_COLORS = [
  { value: "auto", name: "Auto — matches light or dark mode" },
  { value: "transparent", name: "Transparent" },
  { value: "#ffffff", name: "White" },
  { value: "#f2f2f7", name: "Light Gray" },
  { value: "#e5e5ea", name: "Gray" },
  { value: "#1c1c1e", name: "Charcoal" },
  { value: "#0f1115", name: "Midnight" },
  { value: "#181b21", name: "Dark Gray" },
  { value: "#1a202c", name: "Navy" },
  { value: "#2d3748", name: "Slate" },
  { value: "#000000", name: "Black" },
] as const;

const TRANSPARENT_SWATCH: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  backgroundImage:
    "repeating-conic-gradient(var(--material-hairline) 0% 25%, transparent 0% 50%)",
  backgroundSize: "8px 8px",
};

const AUTO_SWATCH: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(135deg, #1c1c1e 0%, #1c1c1e 49%, #ffffff 51%, #ffffff 100%)",
};

const swatchStyle = (color: string): React.CSSProperties =>
  color === "transparent"
    ? TRANSPARENT_SWATCH
    : color === "auto"
      ? AUTO_SWATCH
      : { backgroundColor: color };

/* ------------------------------------------------------------------ */
/*  Background colour swatch grid                                     */
/* ------------------------------------------------------------------ */

const BACKGROUND_OPTIONS: readonly SwatchOption[] = GRID_BG_COLORS.map(
  (color) => ({
    value: color.value,
    label: color.name,
    style: swatchStyle(color.value),
    checkColor:
      color.value === "transparent" || color.value === "auto"
        ? "var(--color-text)"
        : undefined,
  }),
);

const BackgroundColorRow: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <SwatchGroup
    ariaLabel="Background colour"
    options={BACKGROUND_OPTIONS}
    value={value}
    onChange={onChange}
    custom={{
      label: "Custom background colour",
      value: GRID_BG_COLORS.some((color) => color.value === value)
        ? "#000000"
        : value,
      onChange,
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  Aspect glyph                                                      */
/* ------------------------------------------------------------------ */

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16"] as const;
type AspectRatio = (typeof ASPECT_RATIOS)[number];
const GLYPH_MAX = 22;

const AspectGlyph: React.FC<{ ratio: AspectRatio; active: boolean }> = ({
  ratio,
  active,
}) => {
  const [w, h] = ratio.split(":").map(Number);
  const scale = GLYPH_MAX / Math.max(w, h);
  return (
    <span
      aria-hidden
      className="block squircle"
      style={{
        width: Math.max(9, Math.round(w * scale)),
        height: Math.max(9, Math.round(h * scale)),
        borderRadius: 4,
        border: `1.5px solid ${
          active ? "var(--color-primary)" : "var(--color-faint)"
        }`,
        backgroundColor: active
          ? "color-mix(in srgb, var(--color-primary) 22%, transparent)"
          : "transparent",
        transition:
          "border-color var(--duration-quick) var(--ease-standard), background-color var(--duration-quick) var(--ease-standard)",
      }}
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

interface AppearanceSectionProps {
  projectType: ProjectType;
  aspectRatio: string;
  borderless: boolean;
  gap: number;
  borderRadius?: number;
  gridJustify?: "left" | "center" | "right";
  tierSpacing?: TierSpacing;
  tierCorners?: TierCorners;
  rankBackgroundColor: string;
  onUpdateRank: (updates: Partial<Rank>) => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  projectType,
  aspectRatio,
  borderless,
  gap,
  borderRadius,
  gridJustify,
  tierSpacing = DEFAULT_TIER_SPACING,
  tierCorners = DEFAULT_TIER_CORNERS,
  rankBackgroundColor,
  onUpdateRank,
}) => {
  const showsBorders = projectType === "ranking" || projectType === "list";

  const radius = borderRadius ?? DEFAULT_CARD_RADIUS;
  const aspect = aspectRatio || DEFAULT_ASPECT;

  return (
    <div className="flex flex-col gap-2.5">
      <SectionHeader>Appearance</SectionHeader>

      <SettingsCard className="divide-y divide-hairline">
        <Field label="Aspect Ratio" value={aspect}>
          <SegmentedControl
            value={aspect as AspectRatio}
            onChange={(val) => onUpdateRank({ aspectRatio: val })}
            options={ASPECT_RATIOS.map((ratio) => ({
              value: ratio,
              label: <AspectGlyph ratio={ratio} active={aspect === ratio} />,
              ariaLabel: `${ratio} aspect ratio`,
            }))}
          />
        </Field>

        {(projectType === "ranking" || projectType === "list") && (
          <>
            <NumberedSlider
              label="Corner Radius"
              value={radius}
              min={0}
              max={32}
              step={2}
              suffix="px"
              onChange={(v) => onUpdateRank({ borderRadius: v })}
            />

            <NumberedSlider
              label="Gap"
              value={gap}
              min={0}
              max={32}
              step={2}
              suffix="px"
              onChange={(v) => onUpdateRank({ gap: v })}
            />

            {showsBorders && (
              <Field label="Borders">
                <SegmentedControl
                  value={borderless ? "true" : "false"}
                  onChange={(val) =>
                    onUpdateRank({ borderless: val === "true" })
                  }
                  options={[
                    {
                      value: "false",
                      label: "Visible",
                      icon: <SquareDashed size={14} />,
                    },
                    {
                      value: "true",
                      label: "Hidden",
                      icon: <Square size={14} />,
                    },
                  ]}
                />
              </Field>
            )}
          </>
        )}

        {projectType === "tierlist" && (
          <>
            <Field label="Alignment">
              <SegmentedControl
                value={gridJustify || "left"}
                onChange={(val) => onUpdateRank({ gridJustify: val })}
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                  { value: "right", label: "Right" },
                ]}
              />
            </Field>

            <Field label="Image Spacing">
              <SegmentedControl
                value={tierSpacing}
                onChange={(val) =>
                  onUpdateRank({ tierSpacing: val as TierSpacing })
                }
                options={[
                  { value: "tight", label: "No Gap" },
                  { value: "spaced", label: "Padded" },
                ]}
              />
            </Field>

            <Field label="Tier Corners">
              <SegmentedControl
                value={tierCorners}
                onChange={(val) =>
                  onUpdateRank({ tierCorners: val as TierCorners })
                }
                options={[
                  { value: "rounded", label: "Rounded" },
                  { value: "square", label: "Square" },
                ]}
              />
            </Field>
          </>
        )}

        <Field label="Background">
          <BackgroundColorRow
            value={rankBackgroundColor}
            onChange={(v) => onUpdateRank({ backgroundColor: v })}
          />
        </Field>
      </SettingsCard>
    </div>
  );
};
