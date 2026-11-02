import React from "react";
import { Maximize2, Grid, SquareDashedKanban, Square } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ColorPicker, ColorWheelSwatch } from "@/components/ui/ColorPicker";
import {
  Field,
  NumberedSlider,
  SectionHeader,
  SettingsCard,
} from "./SettingsParts";
import { ProjectType, Rank } from "@/types";
import {
  DEFAULT_CARD_GAP,
  DEFAULT_CARD_RADIUS,
  DEFAULT_TIER_CORNERS,
  DEFAULT_TIER_SPACING,
  type TierCorners,
  type TierSpacing,
} from "@/utils/boardStyle";
import { DEFAULT_ASPECT } from "@/utils/ui";

const GRID_BG_COLORS = [
  "transparent",
  "#ffffff",
  "#f2f2f7",
  "#e5e5ea",
  "#1c1c1e",
  "#0f1115",
  "#181b21",
  "#1a202c",
  "#2d3748",
  "#000000",
];

const TRANSPARENT_SWATCH: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  backgroundImage:
    "repeating-conic-gradient(var(--material-hairline) 0% 25%, transparent 0% 50%)",
  backgroundSize: "8px 8px",
};

const swatchStyle = (color: string): React.CSSProperties =>
  color === "transparent" ? TRANSPARENT_SWATCH : { backgroundColor: color };

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16"] as const;
type AspectRatio = (typeof ASPECT_RATIOS)[number];

/** Longest edge of the glyph drawn for a ratio, in px. */
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

interface AppearanceSectionProps {
  projectType: ProjectType;
  aspectRatio: string;
  style: "card" | "seamless";
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
  style,
  borderless,
  gap,
  borderRadius,
  gridJustify,
  tierSpacing = DEFAULT_TIER_SPACING,
  tierCorners = DEFAULT_TIER_CORNERS,
  rankBackgroundColor,
  onUpdateRank,
}) => {
  const supportsTileStyle = projectType === "ranking" || projectType === "list";

  const showsBorders =
    projectType === "ranking" ||
    (projectType === "list" && style === "seamless");
  const showsGap =
    projectType === "ranking" || (projectType === "list" && style === "card");

  const radius =
    borderRadius && borderRadius > 0 ? borderRadius : DEFAULT_CARD_RADIUS;
  const aspect = aspectRatio || DEFAULT_ASPECT;

  const isCustomColor = !GRID_BG_COLORS.includes(rankBackgroundColor);

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

        {supportsTileStyle && (
          <>
            <Field label={projectType === "list" ? "List Style" : "Grid Style"}>
              <SegmentedControl
                value={style}
                onChange={(val) =>
                  val === "seamless"
                    ? onUpdateRank({ style: "seamless" })
                    : onUpdateRank({
                        style: "card",
                        borderRadius: radius,
                        gap: gap || DEFAULT_CARD_GAP,
                      })
                }
                options={[
                  {
                    value: "seamless",
                    label: "Seamless",
                    icon: <Maximize2 size={14} />,
                  },
                  { value: "card", label: "Card", icon: <Grid size={14} /> },
                ]}
              />
            </Field>

            {style === "card" && (
              <NumberedSlider
                label="Corner Radius"
                value={radius}
                min={0}
                max={32}
                step={2}
                onChange={(v) => onUpdateRank({ borderRadius: v })}
              />
            )}

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
                      icon: <SquareDashedKanban size={14} />,
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

            {showsGap && (
              <NumberedSlider
                label="Gap"
                value={gap}
                min={0}
                max={32}
                step={2}
                onChange={(v) => onUpdateRank({ gap: v })}
              />
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

        {/* Background colour picker */}
        <div className="px-4 py-3.5 flex flex-col gap-3">
          <span className="text-footnote font-semibold text-text">
            Background
          </span>
          <div className="flex flex-wrap gap-2.5">
            {GRID_BG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onUpdateRank({ backgroundColor: color })}
                className="relative w-7 h-7 rounded-full transition-transform duration-150"
                style={{
                  ...swatchStyle(color),
                  boxShadow:
                    rankBackgroundColor === color
                      ? `0 0 0 2px var(--color-background), 0 0 0 3.5px var(--color-primary)`
                      : `inset 0 0 0 1px var(--material-hairline)`,
                  transform:
                    rankBackgroundColor === color ? "scale(1.1)" : "scale(1)",
                }}
                title={color === "transparent" ? "Transparent" : color}
              />
            ))}

            <ColorPicker
              label="Custom background colour"
              value={isCustomColor ? rankBackgroundColor : "#000000"}
              onChange={(v) => onUpdateRank({ backgroundColor: v })}
              className="w-7 h-7 rounded-full transition-transform duration-150"
              trigger={
                <ColorWheelSwatch
                  size={28}
                  active={isCustomColor}
                  value={isCustomColor ? rankBackgroundColor : undefined}
                />
              }
            />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};
