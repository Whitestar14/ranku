import React, { useRef } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { Toggle } from "@/components/ui/Toggle";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  Palette,
  Layers,
  Minimize2,
  Moon,
  Sun,
  Info,
  ChevronRight,
  Keyboard,
} from "lucide-react";
import {
  ACCENT_BLUE_DARK,
  ACCENT_BLUE_LIGHT,
  exportStateToJson,
} from "@/utils/storage";
import { SettingButtonGroup, SettingRow } from "@/components/ui/SettingCard";
import { ImportChoiceModal } from "@/components/ImportChoiceModal";
import { useToast } from "@/context/ToastContext";
import { useShortcutState } from "@/state/shortcutState";
import { runActivity } from "@/state/activityState";
import { useCanHover } from "@/hooks/useCanHover";

/** A pair of keycaps, mirroring the ones inside the cheat sheet. */
const ShortcutKeys: React.FC<{ keys: string[] }> = ({ keys }) => (
  <span className="flex items-center gap-1 shrink-0">
    {keys.map((k) => (
      <kbd
        key={k}
        className="inline-grid place-items-center min-w-6 h-6 px-1.5 rounded-hairline
                   bg-surface-secondary text-caption-1 font-medium text-muted tabular-nums"
      >
        {k}
      </kbd>
    ))}
  </span>
);


export const SettingsDockPanel: React.FC<{
  requestConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  onOpenAbout?: () => void;
}> = ({ requestConfirm, onOpenAbout }) => {
  const {
    accent,
    reduceGlass,
    autoCloseDesktop,
    isDark,
    updateTheme,
    updatePreferences,
  } = useStore(
      useShallow((s) => ({
        accent: s.theme?.accentColor ?? ACCENT_BLUE_DARK,
        isDark: s.theme?.isDark ?? true,
        reduceGlass: s.preferences.reduceGlassEffects ?? false,
        autoCloseDesktop: s.preferences.autoCloseDockOnDragDesktop ?? false,
        updateTheme: s.updateGlobalTheme,
        updatePreferences: s.updatePreferences,
      })),
    );

  const canHover = useCanHover();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = React.useState(false);
  const [pendingState, setPendingState] = React.useState<any>(null);
  const addToast = useToast();

  const handleExportJson = () =>
    runActivity(
      "Backing up",
      async () => exportStateToJson(useStore.getState()),
      { successLabel: "Backup saved" },
    );

  const handleImportJson = async (file: File) => {
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      if (json && typeof json === "object" && typeof json.version === "number" && json.ranks) {
        setPendingState(json);
        setIsChoiceModalOpen(true);
      } else {
        addToast("error", "Invalid backup. Please upload a valid Ranku Backup file.");
      }
    } catch (e) {
      console.error("Failed to import JSON", e);
      addToast("error", "Failed to parse JSON file.");
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain p-5 pb-12 flex flex-col gap-6">

      <div className="flex flex-col gap-2 relative">
        <span className="text-footnote font-medium text-muted uppercase tracking-wide pl-4">
          Appearance
        </span>
        <SettingButtonGroup className="material-card rounded-card overflow-hidden">
          <SettingRow
            as="div"
            icon={isDark ? <Moon size={16} /> : <Sun size={16} />}
            iconBg="bg-amber-500/20 text-amber-500"
            label="Theme mode"
            right={
              <div className="w-[140px]">
                <SegmentedControl
                  value={isDark ? "dark" : "light"}
                  onChange={(v) => {
                    const mode = v === "dark";
                    const isADefaultBlue =
                      accent === ACCENT_BLUE_DARK || accent === ACCENT_BLUE_LIGHT;
                    updateTheme({
                      isDark: mode,
                      paletteId: mode ? "ios-dark" : "ios-light",
                      ...(isADefaultBlue
                        ? {
                            accentColor: mode
                              ? ACCENT_BLUE_DARK
                              : ACCENT_BLUE_LIGHT,
                          }
                        : {}),
                    });
                  }}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" }
                  ]}
                />
              </div>
            }
          />
          <SettingRow
            asLabel
            icon={<Palette size={16} />}
            iconBg="bg-primary/20 text-primary"
            label="Accent color"
            right={
              <ColorPicker
                label="Accent colour"
                value={accent}
                onChange={(v) => updateTheme({ accentColor: v })}
                className="h-7 w-12 rounded-chip"
                trigger={
                  <span
                    className="block h-7 w-12 rounded-chip"
                    style={{
                      backgroundColor: accent,
                      boxShadow: "inset 0 0 0 0.5px var(--material-hairline)",
                    }}
                  />
                }
              />
            }
          />
          <SettingRow
            asLabel
            icon={<Layers size={16} />}
            iconBg="bg-indigo-500/20 text-indigo-400"
            label="Reduce glass effects"
            sublabel="Improves scrolling performance, but disables blurs."
            right={
              <Toggle
                checked={reduceGlass}
                onCheckedChange={(v) => updatePreferences({ reduceGlassEffects: v })}
              />
            }
          />
          <SettingRow
            asLabel
            icon={<Minimize2 size={16} />}
            iconBg="bg-purple-500/20 text-purple-400"
            label="Auto-close dock"
            sublabel="Hides the dock while dragging items out."
            right={
              <Toggle
                checked={autoCloseDesktop}
                onCheckedChange={(v) => updatePreferences({ autoCloseDockOnDragDesktop: v })}
              />
            }
          />
        </SettingButtonGroup>
      </div>

      <div className="flex flex-col gap-2 relative">
        <span className="text-footnote font-medium text-muted uppercase tracking-wide pl-4">
          Data Actions
        </span>
        <div className="material-card rounded-card overflow-hidden flex flex-col items-stretch">
          <button
            type="button"
            onClick={handleExportJson}
            className="w-full py-3.5 text-subheadline font-medium text-primary hover:bg-hover active:bg-black/5 dark:active:bg-white/5 transition-colors"
          >
            Backup Data
          </button>
          <div className="h-[0.5px]" style={{ backgroundColor: "var(--color-divider)" }} />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="w-full py-3.5 text-subheadline font-medium text-primary hover:bg-hover active:bg-black/5 dark:active:bg-white/5 transition-colors"
          >
            Restore Data
          </button>
          <div className="h-[0.5px]" style={{ backgroundColor: "var(--color-divider)" }} />
          <button
            type="button"
            onClick={() => {
              if (requestConfirm) {
                requestConfirm(
                  "Wipe All App Data?",
                  "This will delete everything including all ranks, collections, and preferences. It cannot be undone.",
                  () => {
                    localStorage.removeItem("anime-ranker-state");
                    indexedDB.deleteDatabase("keyval-store");
                    window.location.reload();
                  }
                );
              }
            }}
            className="w-full py-3.5 text-subheadline font-medium text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
          >
            Wipe All App Data
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 relative">
        <span className="text-footnote font-medium text-muted uppercase tracking-wide pl-4">
          App
        </span>
        <SettingButtonGroup className="material-card rounded-card overflow-hidden">
          {canHover && (
            <SettingRow
              as="button"
              onClick={() => useShortcutState.getState().toggle()}
              icon={<Keyboard size={16} />}
              iconBg="bg-primary/10 text-primary"
              label="Keyboard shortcuts"
              sublabel="Every shortcut the app implements"
              right={<ShortcutKeys keys={["⌘", "/"]} />}
            />
          )}
          <SettingRow
            as="button"
            onClick={onOpenAbout}
            icon={<Info size={16} />}
            iconBg="bg-primary/10 text-primary"
            label="About Ranku"
            right={
              <ChevronRight size={16} className="text-muted/50 transition-transform group-hover/about:translate-x-0.5" />
            }
          />
        </SettingButtonGroup>
      </div>

      <input
        type="file"
        ref={jsonInputRef}
        className="hidden"
        accept="application/json"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImportJson(e.target.files[0]);
            e.target.value = "";
          }
        }}
      />

      <div className="h-4" />

      <ImportChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelect={(mode) => {
          if (pendingState) {
            useStore.getState().importState(pendingState, mode);
            setIsChoiceModalOpen(false);
            setPendingState(null);
            addToast("success", "Data restored successfully!");
          }
        }}
      />
    </div>
  );
};

