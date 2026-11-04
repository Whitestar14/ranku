import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MoreHorizontal, Pencil, Eraser } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { projectTypeMeta } from "@/constants/projectTypes";
import { PixelText } from "@/components/pixel/PixelText";
import { pixelIcon } from "@/components/pixel/PixelIcon";
import { MarqueeText } from "@/components/ui/MarqueeText";
import { PopoverMenu } from "@/components/ui/PopoverMenu";
import { Button } from "@/components/ui/Button";

import { DimensionsSection } from "./settings/DimensionsSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { VisibilitySection } from "./settings/VisibilitySection";

import { motion as motionPreset } from "@/lib/motion";
import { selectActiveBoard } from "@/utils/boardStyle";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  useProjectDeletion,
  type RequestConfirm,
} from "@/hooks/useProjectDeletion";

export interface ProjectSettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  requestConfirm: RequestConfirm;
}

const TrashIcon = pixelIcon("trash");

const RAIL_MIN = 260;
const RAIL_MAX = 372;
const RAIL_DEFAULT = 320;
/** Releasing the grip below this width closes the rail. */
const RAIL_SNAP_CLOSE = 259;
const RAIL_DRAG_FLOOR = 220;

const clampRail = (width: number) =>
  Math.max(RAIL_MIN, Math.min(RAIL_MAX, Math.round(width)));

const isMobileViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px)").matches;

/* ------------------------------------------------------------------ */
/*  Project actions menu                                              */
/* ------------------------------------------------------------------ */

interface ProjectActionsMenuProps {
  onRename: () => void;
  onClearAll: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

const ProjectActionsMenu: React.FC<ProjectActionsMenuProps> = ({
  onRename,
  onClearAll,
  onDelete,
  canDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ x: rect.right, y: rect.bottom });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setAnchor(null);
  };

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        iconOnly
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Project actions"
        onClick={() => (open ? handleClose() : handleOpen())}
        className="-my-1.5 -mr-1 md:my-0 md:mr-0"
      >
        <MoreHorizontal size={18} strokeWidth={2.2} />
      </Button>

      <PopoverMenu
        isOpen={open}
        onClose={handleClose}
        returnFocusRef={triggerRef}
        ariaLabel="Project actions"
        separators="explicit"
        triggerPoint={
          anchor ? { ...anchor, anchor: "right", prefer: "below" } : null
        }
        actions={[
          { label: "Rename", icon: Pencil, onClick: onRename },
          { label: "Clear All Items", icon: Eraser, onClick: onClearAll },
          {
            label: "Delete Project",
            icon: TrashIcon,
            onClick: onDelete,
            variant: "danger",
            disabled: !canDelete,
            hint: canDelete ? undefined : "Last project can't be deleted",
            separator: true,
          },
        ]}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export const ProjectSettingsSidebar: React.FC<ProjectSettingsSidebarProps> = ({
  isOpen,
  onClose,
  requestConfirm,
}) => {
  /* Only the fields this panel draws. Subscribing to the whole rank made every
     cell edit rebuild all three sections. */
  const project = useStore(
    useShallow((s) => {
      const rank = s.ranks[s.activeRankId];
      return rank
        ? {
            id: rank.id,
            title: rank.title,
            type: rank.type,
            config: rank.config,
            backgroundColor: rank.backgroundColor,
          }
        : null;
    })
  );
  const board = useStore(useShallow(selectActiveBoard));
  const rankCount = useStore((s) => Object.keys(s.ranks).length);
  const handleConfigChange = useStore((s) => s.handleConfigChange);
  const handleVisualToggle = useStore((s) => s.handleVisualToggle);
  const updateActiveRank = useStore((s) => s.updateActiveRank);
  const storedRailWidth = useStore(
    (s) => s.preferences.railWidth ?? RAIL_DEFAULT,
  );
  const updatePreferences = useStore((s) => s.updatePreferences);
  const [railWidth, setRailWidth] = useState(() => clampRail(storedRailWidth));
  // Width transitions stay off until the persisted width has painted.
  const [hydrated, setHydrated] = useState(() =>
    useStore.persist.hasHydrated(),
  );
  const [animateWidth, setAnimateWidth] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragWidth, setDragWidth] = useState(railWidth);
  const [snapClose, setSnapClose] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-sidebar-open", isOpen);
    return () => {
      document.documentElement.removeAttribute("data-sidebar-open");
    };
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = useStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (hydrated) {
      const frame = requestAnimationFrame(() => setAnimateWidth(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setHydrated(true), 1500);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => setRailWidth(clampRail(storedRailWidth)), [storedRailWidth]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--rail-width", `${railWidth}px`);
    return () => {
      root.style.removeProperty("--rail-width");
    };
  }, [railWidth]);

  useEffect(() => {
    if (!isRenaming) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isRenaming]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || isRenaming) return;
      if (document.querySelector('[role="menu"], [role="listbox"]')) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isRenaming, onClose]);

  useFocusTrap(asideRef, isOpen && isMobileViewport());
  const commitResize = useCallback(
    (width: number) => {
      const next = clampRail(width);
      setRailWidth(next);
      updatePreferences({ railWidth: next });
    },
    [updatePreferences],
  );

  const startResize = (e: React.PointerEvent) => {
    if (!isOpen || isMobileViewport()) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* no active pointer */
    }

    const startX = e.clientX;
    const startWidth = railWidth;
    let next = startWidth;
    let armed = false;
    const asideEl = asideRef.current;
    setIsResizing(true);
    setDragWidth(startWidth);
    setSnapClose(false);
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const paintWidth = (width: number) => {
      if (asideEl) asideEl.style.width = `min(${width}px, 86vw)`;
    };
    const onMove = (ev: PointerEvent) => {
      const raw = Math.round(startWidth + ev.clientX - startX);
      const value = Math.min(RAIL_MAX, Math.max(RAIL_DRAG_FLOOR, raw));
      const nowArmed = raw <= RAIL_SNAP_CLOSE;
      if (nowArmed !== armed) {
        armed = nowArmed;
        setSnapClose(armed);
      }
      if (value === next) return;
      next = value;
      setDragWidth(value);
      paintWidth(value);
    };
    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      setIsResizing(false);
      setSnapClose(false);

      if (!commit) {
        paintWidth(startWidth);
        return;
      }
      if (armed) {
        onClose();
        return;
      }
      const value = clampRail(next);
      setRailWidth(value);
      updatePreferences({ railWidth: value });
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  /* On a phone the rail is a drawer, so deleting the project it describes
     should hand the screen back to the board. */
  const requestDeleteThenClose = useCallback<RequestConfirm>(
    (title, message, action, toggle) => {
      requestConfirm(
        title,
        message,
        (checked) => {
          action(checked);
          if (isMobileViewport()) onClose();
        },
        toggle,
      );
    },
    [requestConfirm, onClose],
  );

  const requestProjectDelete = useProjectDeletion(requestDeleteThenClose);

  if (!project || !board) return null;

  const { config, type: projectType } = project;

  const meta = projectTypeMeta(projectType);
  const TypeIcon = meta.icon;

  const handleRowsChange = (val: number) =>
    handleConfigChange({ ...config, rows: Math.max(1, Math.min(50, val)) });
  const handleColsChange = (val: number) =>
    handleConfigChange({ ...config, cols: Math.max(1, Math.min(20, val)) });

  const handleClearAll = () => {
    requestConfirm(
      projectType === "tierlist" ? "Clear all tiers?" : "Clear this board?",
      "Every image returns to the Library. Re-add it to the board when you want to.",
      () => {
        useStore.getState().handleClearAll();
      },
    );
  };

  const handleDeleteProject = () => requestProjectDelete([project.id]);

  const startRename = () => {
    setDraftTitle(project.title);
    setIsRenaming(true);
  };

  const commitRename = () => {
    const title = draftTitle.trim();
    if (title && title !== project.title) updateActiveRank({ title });
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
        tabIndex={-1}
        inert={!isOpen || undefined}
        aria-label="Project settings"
        className={`
          shrink-0 overflow-hidden
          z-rail-panel
          fixed top-14 bottom-0 left-0
          md:relative md:top-auto md:bottom-auto md:left-auto
          rounded-r-panel md:rounded-none
          ${animateWidth ? "transition-[width,opacity] duration-240 ease-emphasized" : "transition-none"}
          outline-none
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
          <div className="flex items-center gap-2 px-2.5 py-2.5 shrink-0 border-b border-hairline bg-rail">
            <span
              className="grid place-items-center w-8 h-8 rounded-[9px] squircle shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`,
                color: meta.tint,
              }}
            >
              <TypeIcon size={16} strokeWidth={2.1} />
            </span>

            <div className="flex min-w-0 flex-1 flex-col">
              <PixelText
                text={meta.longLabel}
                height={7}
                fit
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
                  <div className="marquee-host -mx-1.5 flex min-w-0 flex-1 items-center rounded-chip px-1.5">
                    <MarqueeText
                      text={project.title}
                      className="min-w-0 flex-1 text-headline font-semibold text-text"
                    />
                  </div>
                )}

                <ProjectActionsMenu
                  onRename={startRename}
                  onClearAll={handleClearAll}
                  onDelete={handleDeleteProject}
                  canDelete={rankCount > 1}
                />
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
                cellWidth={board.cellWidth}
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
                borderless={board.borderless}
                gap={board.gap}
                borderRadius={board.radius}
                gridJustify={board.justify}
                tierSpacing={board.tierSpacing}
                tierCorners={board.tierCorners}
                rankBackgroundColor={project.backgroundColor}
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

        {isResizing && (
          <div
            aria-live="polite"
            className={`pointer-events-none absolute bottom-4 right-4 z-30 rounded-chip
                       material-thick px-2 py-1 text-caption-1 font-semibold
                       tabular-nums ${snapClose ? "text-destructive" : "text-text"}`}
          >
            {snapClose ? "Release to close" : `${dragWidth}px`}
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
          className={`group/grip absolute inset-y-0 right-0 z-20 hidden w-3 cursor-ew-resize
                      touch-none items-center justify-center outline-none
                      focus-visible:ring-2 focus-visible:ring-primary/40 md:flex ${
                        snapClose
                          ? "bg-destructive/10"
                          : isResizing
                            ? "bg-primary/5"
                            : ""
                      }`}
        >
          <span
            aria-hidden
            className={`h-12 w-0.5 rounded-full transition-colors duration-150 ${
              snapClose
                ? "bg-destructive"
                : isResizing
                  ? "bg-primary"
                  : "bg-[var(--material-hairline)] group-hover/grip:bg-primary/40 group-focus-visible/grip:bg-primary/60"
            }`}
          />
        </div>
      </aside>
    </>
  );
};
