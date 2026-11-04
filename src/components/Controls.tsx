import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import { ChevronDown } from "lucide-react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { StatusIsland } from "@/components/StatusIsland";
import { Button } from "@/components/ui/Button";
import { motion as motionPreset, layoutMotion } from "@/lib/motion";
import { useActivityState } from "@/state/activityState";

interface ControlsProps {
  projectName: string;
  onOpenProjects: () => void;
  onToggleSidebar: () => void;
  onOpenExport: () => void;
  isSidebarOpen: boolean;
  onCreateProject: () => void;
  isScrolled?: boolean;
}

export const Controls = React.memo(function Controls({
  projectName,
  onOpenProjects,
  onToggleSidebar,
  onOpenExport,
  isSidebarOpen,
  onCreateProject,
  isScrolled = false,
}: ControlsProps) {
  const {
    phase,
    label: activityLabel,
    seq,
  } = useActivityState(
    useShallow((s) => ({ phase: s.phase, label: s.label, seq: s.seq })),
  );

  const statusText = phase === "idle" ? null : (activityLabel ?? "Working");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-chrome h-14 material-chrome
                  transition-shadow duration-300 ease-standard ${
                    isScrolled
                      ? "shadow-[0_1px_0_0_var(--material-hairline)]"
                      : ""
                  }`}
    >
      <div className="h-full w-full max-w-480 mx-auto px-2 md:px-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex items-center justify-start min-w-0">
          <Button
            variant="ghost"
            size="md"
            iconOnly
            expandTap={false}
            onClick={onToggleSidebar}
            aria-label={
              isSidebarOpen ? "Close the sidebar" : "Open the sidebar"
            }
            title={isSidebarOpen ? "Close the sidebar" : "Open the sidebar"}
          >
            <PixelIcon name="sidebar" size={19} />
          </Button>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <motion.button
            onClick={onOpenProjects}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            layout
            transition={{ layout: layoutMotion, ...motionPreset.snappy }}
            aria-live="polite"
            className="flex items-center gap-1.5 px-3 h-9 min-w-0 rounded-full material-thin
                       hover:bg-hover transition-colors duration-150"
            title={statusText ? statusText : "Switch project"}
          >
            <span className="relative block h-5 leading-5 min-w-[1ch] max-w-[40vw] sm:max-w-[320px] overflow-hidden text-left">
              <AnimatePresence mode="popLayout" initial={false}>
                {statusText ? (
                  <motion.span
                    key={`status-${seq}`}
                    initial={{ y: "120%", opacity: 0.4 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-120%", opacity: 0 }}
                    transition={motionPreset.control}
                    className="block whitespace-nowrap font-medium text-subheadline text-primary"
                  >
                    {statusText}
                  </motion.span>
                ) : (
                  <motion.span
                    key={`name-${projectName}`}
                    initial={{ y: "120%", opacity: 0.4 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-120%", opacity: 0 }}
                    transition={motionPreset.control}
                    className="block truncate whitespace-nowrap font-semibold text-subheadline text-text tracking-tight"
                  >
                    {projectName || "Untitled"}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <ChevronDown size={14} className="text-muted shrink-0" />
          </motion.button>

          <StatusIsland onCreateProject={onCreateProject} />
        </div>

        <div className="flex items-center justify-end min-w-0">
          <Button
            variant="ghost"
            size="md"
            icon={<PixelIcon name="download" size={18} />}
            shape="pill"
            onClick={onOpenExport}
            aria-label="Export board as image"
            title="Export board as image"
            className="px-2.5 md:px-3.5"
          >
            <span className="hidden md:inline font-medium">Export</span>
          </Button>
        </div>
      </div>
    </header>
  );
});
