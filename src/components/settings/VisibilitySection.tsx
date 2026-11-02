import React from "react";
import { Hash, Type, Calendar, Droplets } from "lucide-react";
import { SettingButtonGroup, SettingRow } from "@/components/ui/SettingCard";
import { Toggle } from "@/components/ui/Toggle";
import { SectionHeader, settingsCardStyle } from "./SettingsParts";
import { ProjectType, VisualToggleKey } from "@/types";

interface VisibilitySectionProps {
  projectType: ProjectType;
  showNumbers: boolean;
  showTitle: boolean;
  showDate: boolean;
  showWatermark: boolean;
  onVisualToggle: (key: VisualToggleKey) => void;
}

export const VisibilitySection: React.FC<VisibilitySectionProps> = ({
  projectType,
  showNumbers,
  showTitle,
  showDate,
  showWatermark,
  onVisualToggle,
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      <SectionHeader>Visibility</SectionHeader>

      <SettingButtonGroup
        className="mx-4 rounded-card overflow-hidden"
        style={settingsCardStyle}
      >
        {(projectType === "ranking" || projectType === "list") && (
          <SettingRow
            asLabel
            icon={<Hash size={16} />}
            iconBg="bg-primary/15 text-primary"
            label="Show Numbers"
            right={
              <Toggle
                checked={showNumbers}
                onCheckedChange={() => onVisualToggle("showNumbers")}
                aria-label="Show Numbers"
              />
            }
          />
        )}
        <SettingRow
          asLabel
          icon={<Type size={16} />}
          iconBg="bg-accent-green/15 text-accent-green"
          label="Show Title"
          right={
            <Toggle
              checked={showTitle}
              onCheckedChange={() => onVisualToggle("showTitle")}
              aria-label="Show Title"
            />
          }
        />
        <SettingRow
          asLabel
          icon={<Calendar size={16} />}
          iconBg="bg-accent-orange/15 text-accent-orange"
          label="Show Date"
          right={
            <Toggle
              checked={showDate}
              onCheckedChange={() => onVisualToggle("showDate")}
              aria-label="Show Date"
            />
          }
        />
        <SettingRow
          asLabel
          icon={<Droplets size={16} />}
          iconBg="bg-accent-purple/15 text-accent-purple"
          label="Show Watermark"
          right={
            <Toggle
              checked={showWatermark}
              onCheckedChange={() => onVisualToggle("showWatermark")}
              aria-label="Show Watermark"
            />
          }
        />
      </SettingButtonGroup>
    </div>
  );
};
