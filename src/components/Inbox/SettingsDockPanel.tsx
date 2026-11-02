import React, { useRef } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SwatchGroup, type SwatchOption } from "@/components/ui/SwatchGroup";
import {
  Layers,
  Minimize2,
  Moon,
  Sun,
  Info,
  ChevronRight,
  Keyboard,
  Sparkles,
} from "lucide-react";
import { ACCENT_BLUE_DARK, exportStateToJson } from "@/utils/storage";
import { isUntouchedWorkspace } from "@/utils/storeUtils";
import { SettingButtonGroup, SettingRow } from "@/components/ui/SettingCard";
import { ImportChoiceModal } from "@/components/ImportChoiceModal";
import { useToast } from "@/context/ToastContext";
import { useShortcutState } from "@/state/shortcutState";
import { runActivity } from "@/state/activityState";
import { useCanHover } from "@/hooks/useCanHover";
import type { GlobalState } from "@/types";

const ACCENT_PRESETS = [
  { name: "Blue", value: ACCENT_BLUE_DARK },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Green", value: "#10b981" },
  { name: "Teal", value: "#06b6d4" },
  { name: "Red", value: "#f43f5e" },
] as const;

const ACCENT_OPTIONS: readonly SwatchOption[] = ACCENT_PRESETS.map(
  (preset) => ({ value: preset.value, label: preset.name }),
);

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
  requestConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => void;
  onOpenAbout?: () => void;
}> = ({ requestConfirm, onOpenAbout }) => {
  const {
    accent,
    reduceGlass,
    disableGrain,
    autoCloseDesktop,
    isDark,
    updateTheme,
    updatePreferences,
  } = useStore(
    useShallow((s) => ({
      accent: s.theme?.accentColor ?? ACCENT_BLUE_DARK,
      isDark: s.theme?.isDark ?? true,
      reduceGlass: s.preferences.reduceGlassEffects ?? false,
      disableGrain: s.preferences.disableGrain ?? false,
      autoCloseDesktop: s.preferences.autoCloseDockOnDragDesktop ?? false,
      updateTheme: s.updateGlobalTheme,
      updatePreferences: s.updatePreferences,
    })),
  );

  const canHover = useCanHover();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = React.useState(false);
  const [pendingState, setPendingState] = React.useState<GlobalState | null>(
    null,
  );
  const addToast = useToast();
  const isUntouched = useStore(isUntouchedWorkspace);

  /* ---------- Data actions ---------- */

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
      if (
        json &&
        typeof json === "object" &&
        typeof json.version === "number" &&
        json.ranks
      ) {
        setPendingState(json as GlobalState);
        setIsChoiceModalOpen(true);
      } else {
        addToast(
          "error",
          "Invalid backup. Please upload a valid Ranku Backup file.",
        );
      }
    } catch {
      addToast("error", "Failed to parse JSON file.");
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain p-5 pb-12 flex flex-col gap-6">
      {/* ---------------- Appearance ---------------- */}
      <div className="flex flex-col gap-2 relative">
        <span className="text-footnote font-medium text-muted uppercase tracking-wide pl-4">
          Appearance
        </span>
        <SettingButtonGroup className="material-card rounded-card overflow-hidden">
          <SettingRow
            as="div"
            icon={isDark ? <Moon size={16} /> : <Sun size={16} />}
            iconBg="bg-amber-500/20 text-amber-500"
            label="Mode"
            sublabel="Light or dark surfaces"
            right={
              <div className="w-34">
                <SegmentedControl
                  value={isDark ? "dark" : "light"}
                  onChange={(v) => updateTheme({ isDark: v === "dark" })}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />
              </div>
            }
          />

          <div className="flex flex-col gap-3 px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-footnote font-semibold text-text">
                Accent
              </span>
              <span className="text-caption-1 text-muted">
                Buttons, links, selection
              </span>
            </div>

            <SwatchGroup
              ariaLabel="Accent colour"
              options={ACCENT_OPTIONS}
              value={accent}
              onChange={(v) => updateTheme({ accentColor: v })}
              custom={{
                label: "Custom accent colour",
                value: accent,
                onChange: (v) => updateTheme({ accentColor: v }),
              }}
            />
          </div>

          <SettingRow
            asLabel
            icon={<Layers size={16} />}
            iconBg="bg-indigo-500/20 text-indigo-400"
            label="Reduce glass effects"
            sublabel="Improves scrolling performance, but disables blurs."
            right={
              <Toggle
                aria-label="Reduce glass effects"
                checked={reduceGlass}
                onCheckedChange={(v) =>
                  updatePreferences({ reduceGlassEffects: v })
                }
              />
            }
          />
          <SettingRow
            asLabel
            icon={<Sparkles size={16} />}
            iconBg="bg-emerald-500/20 text-emerald-400"
            label="Surface grain"
            sublabel="Add fine svg texture over cards. Disable to improve scrolling."
            right={
              <Toggle
                aria-label="Surface grain"
                checked={!disableGrain}
                onCheckedChange={(v) => updatePreferences({ disableGrain: !v })}
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
                aria-label="Auto-close dock while dragging"
                checked={autoCloseDesktop}
                onCheckedChange={(v) =>
                  updatePreferences({ autoCloseDockOnDragDesktop: v })
                }
              />
            }
          />
        </SettingButtonGroup>
      </div>

      {/* ---------------- Data Actions ---------------- */}
      <div className="flex flex-col gap-2 relative">
        <span className="text-footnote font-medium text-muted uppercase tracking-wide pl-4">
          Data Actions
        </span>
        <SettingButtonGroup className="material-card rounded-card overflow-hidden">
          <Button
            variant="plain"
            fullWidth
            expandTap={false}
            onClick={handleExportJson}
            className="h-auto rounded-none py-3.5 text-subheadline font-medium"
          >
            Backup Data
          </Button>
          <Button
            variant="plain"
            fullWidth
            expandTap={false}
            onClick={() => jsonInputRef.current?.click()}
            className="h-auto rounded-none py-3.5 text-subheadline font-medium"
          >
            Restore Data
          </Button>
          <Button
            variant="dangerPlain"
            fullWidth
            expandTap={false}
            onClick={() => {
              requestConfirm?.(
                "Wipe All App Data?",
                "This will delete everything including all ranks, collections, and preferences. It cannot be undone.",
                () => {
                  localStorage.removeItem("anime-ranker-state");
                  indexedDB.deleteDatabase("keyval-store");
                  window.location.reload();
                },
              );
            }}
            className="h-auto rounded-none py-3.5 text-subheadline font-medium"
          >
            Wipe All App Data
          </Button>
        </SettingButtonGroup>
      </div>

      {/* ---------------- App ---------------- */}
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
              <ChevronRight
                size={16}
                className="text-muted/50 transition-transform group-hover/about:translate-x-0.5"
              />
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
        isUntouchedWorkspace={isUntouched}
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
