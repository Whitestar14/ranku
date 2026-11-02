import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Eraser, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { projectTypeMeta } from "@/constants/projectTypes";
import { PixelText } from "@/components/pixel/PixelText";
import { MarqueeText } from "@/components/ui/MarqueeText";

import { DimensionsSection } from "./settings/DimensionsSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { VisibilitySection } from "./settings/VisibilitySection";

import { motion as motionPreset } from "@/lib/motion";
import { resolveBoardStyle } from "@/utils/boardStyle";

export interface GridSettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  requestConfirm: (title: string, message: string, action: () => void) => void;
}

const RAIL_MIN = 248;
const RAIL_MAX = 432;
const RAIL_DEFAULT = 320;

const clampRail = (width: number) =>
  Math.max(RAIL_MIN, Math.min(RAIL_MAX, Math.round(width)));

export const GridSettingsSidebar: React.FC<GridSettingsSidebarProps> = ({
  isOpen,
  onClose,
  requestConfirm,
}) => {
  const activeRank = useStore(useShallow((s) => s.ranks[s.activeRankId]));
  const rankCount = useStore((s) => Object.keys(s.ranks).length);
  const handleConfigChange = useStore((s) => s.handleConfigChange);
  const handleVisualToggle = useStore((s) => s.handleVisualToggle);
  const updateActiveRank = useStore((s) => s.updateActiveRank);
  const storedRailWidth = useStore(
    (s) => s.preferences.railWidth ?? RAIL_DEFAULT,
  );
  const updatePreferences = useStore((s) => s.updatePreferences);
  const [railWidth, setRailWidth] = useState(storedRailWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-sidebar-open", isOpen);
    return () => {
      document.documentElement.removeAttribute("data-sidebar-open");
    };
  }, [isOpen]);

  useEffect(() => setRailWidth(storedRailWidth), [storedRailWidth]);

  useEffect(() => {
    if (!isRenaming) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isRenaming]);

  const commitResize = useCallback(
    (width: number) => {
      const next = clampRail(width);
      setRailWidth(next);
      updatePreferences({ railWidth: next });
    },
    [updatePreferences],
  );

  const startResize = (e: React.PointerEvent) => {
    if (!isOpen || window.matchMedia("(max-width: 767px)").matches) return;
    e.preventDefault();
    /* Capture is a nicety (it keeps the drag alive over the board); a pointer
       that is already gone must not abort the whole gesture. */
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* no active pointer */
    }

    const startX = e.clientX;
    const startWidth = railWidth;
    let next = startWidth;
    const asideEl = asideRef.current;
    setIsResizing(true);
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const paintWidth = (width: number) => {
      if (asideEl) asideEl.style.width = `min(${width}px, 86vw)`;
      if (readoutRef.current) readoutRef.current.textContent = `${width}px`;
    };
    const onMove = (ev: PointerEvent) => {
      const value = clampRail(startWidth + ev.clientX - startX);
      if (value === next) return;
      next = value;
      paintWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      setIsResizing(false);
      /* React owns the width again from here; its style prop carries the same
         value, so the hand-off is invisible. */
      setRailWidth(next);
      updatePreferences({ railWidth: next });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  if (!activeRank) return null;

  const { config, style, type: projectType } = activeRank;
  const board = resolveBoardStyle(activeRank);

  const meta = projectTypeMeta(projectType);
  const TypeIcon = meta.icon;

  const handleRowsChange = (val: number) =>
    handleConfigChange({ ...config, rows: Math.max(1, Math.min(50, val)) });
  const handleColsChange = (val: number) =>
    handleConfigChange({ ...config, cols: Math.max(1, Math.min(20, val)) });

  const handleClearAll = () => {
    requestConfirm(
      projectType === "tierlist" ? "Clear all tiers?" : "Clear this board?",
      "Every image on it goes back to the Library. Nothing is deleted permanently.",
      () => {
        useStore.getState().handleClearAll();
      },
    );
  };

  const handleDeleteProject = () => {
    requestConfirm(
      `Delete "${activeRank.title}"?`,
      "The project and everything on it will be removed. This cannot be undone.",
      () => useStore.getState().handleDeleteRank(activeRank.id),
    );
  };

  const startRename = () => {
    setDraftTitle(activeRank.title);
    setIsRenaming(true);
  };

  const commitRename = () => {
    const title = draftTitle.trim();
    if (title && title !== activeRank.title) updateActiveRank({ title });
    setIsRenaming(false);
  };

  return (
    <>
      <div
        aria-hidden={!isOpen || undefined}
        className={`fixed inset-0 bg-overlay z-rail-panel md:hidden transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        ref={asideRef}
        inert={!isOpen || undefined}
        aria-label="Project settings"
        className={`
          shrink-0 overflow-hidden
          z-rail-panel
          fixed top-14 bottom-0 left-0
          md:relative md:top-auto md:bottom-auto md:left-auto
          rounded-r-panel md:rounded-none
          transition-[width,opacity] duration-240 ease-emphasized
          ${isOpen ? "rail-elevation" : ""}
          ${isResizing ? "select-none" : ""}
        `}
        style={{
          width: isOpen ? `min(${railWidth}px, 86vw)` : "0rem",
          opacity: isOpen ? 1 : 0,
          backgroundColor: "var(--color-rail)",
          borderRight: isOpen
            ? "0.5px solid var(--material-hairline)"
            : "0.5px solid transparent",
          pointerEvents: isOpen ? undefined : "none",
          transition: isResizing
            ? "opacity 240ms var(--ease-emphasized)"
            : undefined,
        }}
      >
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center gap-2 px-2.5 py-2.5 shrink-0 border-b border-hairline bg-[var(--color-rail)]">
            <span
              className="grid place-items-center w-8 h-8 rounded-[9px] squircle shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`,
                color: meta.tint,
              }}
            >
              <TypeIcon size={16} strokeWidth={2.1} />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {/* Metadata sits above the title, never beside it: the project
                  name is the thing being edited, the type is a label. */}
              <PixelText
                text={meta.longLabel}
                height={7}
                className="block text-muted/75"
              />

              <div className="flex min-w-0 items-center gap-1">
                {isRenaming ? (
                  <input
                    ref={titleInputRef}
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setIsRenaming(false);
                    }}
                    aria-label="Project name"
                    className="-mx-1.5 h-7 min-w-0 flex-1 rounded-chip bg-background px-1.5
                               text-headline font-semibold text-text outline-none
                               focus-visible:focus-ring"
                  />
                ) : (
                  /* The title is a button, but a quiet one: renaming is an
                     occasional act, so the affordance only appears on hover. */
                  <button
                    type="button"
                    onClick={startRename}
                    aria-label={`Rename ${activeRank.title}`}
                    className="marquee-host -mx-1.5 flex min-w-0 flex-1 items-center
                               rounded-chip px-1.5 text-left outline-none
                               transition-colors hover:bg-hover focus-visible:focus-ring"
                  >
                    <MarqueeText
                      text={activeRank.title}
                      className="min-w-0 flex-1 text-headline font-semibold text-text"
                    />
                  </button>
                )}

                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    title={
                      projectType === "tierlist"
                        ? "Clear all tiers"
                        : "Clear board"
                    }
                    aria-label={
                      projectType === "tierlist"
                        ? "Clear all tiers"
                        : "Clear board"
                    }
                    className="grid h-8 w-8 place-items-center rounded-full text-muted
                               transition-colors duration-150 hover:bg-hover hover:text-text
                               focus-visible:focus-ring"
                  >
                    <Eraser size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={rankCount <= 1}
                    title={
                      rankCount <= 1
                        ? "You can't delete the last project"
                        : "Delete project"
                    }
                    aria-label="Delete project"
                    className="grid h-8 w-8 place-items-center rounded-full text-muted
                               transition-colors duration-150 hover:bg-destructive/10
                               hover:text-destructive focus-visible:focus-ring
                               disabled:cursor-not-allowed disabled:opacity-35
                               disabled:hover:bg-transparent disabled:hover:text-muted"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            className="flex-1 overflow-y-auto scrollbar-ios overflow-x-hidden overscroll-contain"
            initial={false}
            animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={motionPreset.sheet}
          >
            <div className="flex flex-col gap-6 py-5 pb-6">
              <DimensionsSection
                projectType={projectType}
                config={config}
                cellWidth={activeRank.cellWidth}
                tierRowHeight={board.tierRowHeight}
                onRowsChange={handleRowsChange}
                onColsChange={handleColsChange}
                onCellWidthChange={(v) => updateActiveRank({ cellWidth: v })}
                onTierRowHeightChange={(v) =>
                  updateActiveRank({ tierRowHeight: v })
                }
              />

              <AppearanceSection
                projectType={projectType}
                aspectRatio={board.aspectRatio}
                style={style as "card" | "seamless"}
                borderless={board.borderless}
                gap={board.gap}
                borderRadius={board.radius}
                gridJustify={board.justify}
                tierSpacing={board.tierSpacing}
                tierCorners={board.tierCorners}
                rankBackgroundColor={activeRank.backgroundColor}
                onUpdateRank={updateActiveRank}
              />

              <VisibilitySection
                projectType={projectType}
                showNumbers={board.showNumbers}
                showTitle={board.showTitle}
                showDate={board.showDate}
                showWatermark={board.showWatermark}
                onVisualToggle={handleVisualToggle}
              />
            </div>
          </motion.div>

          <div
            aria-hidden
            className="shrink-0"
            style={{ height: "env(safe-area-inset-bottom)" }}
          />
        </div>

        {/* Live width readout while dragging: the rail has no other place to
            show a number, and "is it 320 or 326?" is the only question during
            a resize. */}
        {isResizing && (
          <div
            ref={readoutRef}
            aria-hidden
            className="pointer-events-none absolute bottom-4 right-4 z-30 rounded-chip
                       material-thick px-2 py-1 text-caption-1 font-semibold
                       tabular-nums text-text"
          >
            {railWidth}px
          </div>
        )}

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize project sidebar"
          aria-valuemin={RAIL_MIN}
          aria-valuemax={RAIL_MAX}
          aria-valuenow={railWidth}
          aria-valuetext={`${railWidth} pixels`}
          tabIndex={0}
          onPointerDown={startResize}
          onDoubleClick={() => commitResize(RAIL_DEFAULT)}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 32 : 12;
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              commitResize(railWidth - step);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              commitResize(railWidth + step);
            } else if (e.key === "Home") {
              e.preventDefault();
              commitResize(RAIL_DEFAULT);
            }
          }}
          title="Drag to resize (double-click to reset)"
          /* A 6px visual line inside a 12px hit area: wide enough for a thumb
             on a trackpad, quiet enough not to look like a border. */
          className={`group/grip absolute inset-y-0 right-0 z-20 hidden w-3 cursor-ew-resize
                      touch-none items-center justify-center outline-none
                      focus-visible:ring-2 focus-visible:ring-primary/40 md:flex ${
                        isResizing ? "bg-primary/5" : ""
                      }`}
        >
          <span
            aria-hidden
            className={`h-12 w-0.5 rounded-full transition-colors duration-150 ${
              isResizing
                ? "bg-primary"
                : "bg-transparent group-hover/grip:bg-primary/40 group-focus-visible/grip:bg-primary/60"
            }`}
          />
        </div>
      </aside>
    </>
  );
};
