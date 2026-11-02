import React, { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, useTransform } from "motion/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Controls } from "@/components/Controls";
import { ProjectSettingsSidebar } from "@/components/ProjectSettingsSidebar";
import { ProjectsModal } from "@/components/ProjectsModal";
import { ShortcutsSheet } from "@/components/ShortcutsSheet";
import { LoadingScreen } from "@/components/AppLogo";
import { BoardView, BoardWatermark } from "@/components/app/BoardView";
import { BoardTitle } from "@/components/app/BoardTitle";
import {
  AboutModalHost,
  ConfirmModalHost,
  DuplicateModalHost,
  ExportModalHost,
} from "@/components/app/ModalHosts";
import { getContrastColor } from "@/theme/palettes";
import { SHEET_WIDTH, resolveBoardBackground } from "@/utils/boardStyle";
import { useStore } from "@/store/useStore";

import { useAppController } from "@/hooks/useAppController";
import { useProjectDeletion } from "@/hooks/useProjectDeletion";
import { useScrollDepth } from "@/hooks/useScrollDepth";

const Inbox = React.lazy(() =>
  import("@/components/Inbox").then((mod) => ({ default: mod.Inbox })),
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const ctrl = useAppController();

  const { ref: mainRef, isScrolled, depth } = useScrollDepth<HTMLElement>();

  /* Mount the dock once the first frame has been handed to the compositor.
     It is `position: fixed`, so arriving late costs no layout shift. */
  const [dockReady, setDockReady] = useState(false);
  useEffect(() => {
    const idle = (cb: () => void) =>
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(cb, { timeout: 900 })
        : window.setTimeout(cb, 180);
    const cancel = (id: number) =>
      typeof cancelIdleCallback === "function"
        ? cancelIdleCallback(id)
        : window.clearTimeout(id);
    const handle = idle(() => setDockReady(true));
    return () => cancel(handle);
  }, []);

  const boardScale = useTransform(depth, [0, 1], [1, 0.982]);
  const boardY = useTransform(depth, [0, 1], [0, 10]);

  const activeRank = ctrl.activeRank;
  const theme = useStore((s) => s.theme);
  const requestProjectDelete = useProjectDeletion(ctrl.confirmAction);

  if (!activeRank) return <LoadingScreen />;

  const sheetColor = resolveBoardBackground(activeRank.backgroundColor, {
    isDark: theme?.isDark,
  });
  const textColor = getContrastColor(sheetColor);
  const mainPadding =
    activeRank.type === "tierlist" ? "p-2 md:p-8" : "p-4 md:p-8";
  const containerPaddingClass =
    activeRank.type === "tierlist" ? "p-4 md:p-8" : "p-4";

  return (
    <>
      <AnimatePresence mode="wait">
        {(ctrl.showLoader || !ctrl.isLoaded) && <LoadingScreen key="loader" />}
      </AnimatePresence>

      {/* `app-viewport` is 100vh with a 100dvh override, so the layout matches
          the area a phone actually shows while its URL bar is expanded. */}
      <div className="app-viewport flex flex-col overflow-hidden">
        <Controls
          projectName={activeRank.title}
          isScrolled={isScrolled}
          onOpenProjects={() => ctrl.setIsProjectsOpen(true)}
          onToggleSidebar={ctrl.toggleSidebar}
          onOpenExport={ctrl.openExport}
          isSidebarOpen={ctrl.isSidebarOpen}
          onCreateProject={ctrl.createProjectLikeCurrent}
        />

        <ExportModalHost
          onExportImage={ctrl.exportImage}
          onCopyImage={ctrl.copyImage}
        />
        <ConfirmModalHost />
        <AboutModalHost />

        <ShortcutsSheet
          isOpen={ctrl.isShortcutsOpen}
          onClose={ctrl.closeShortcuts}
        />

        <ProjectsModal
          isOpen={ctrl.isProjectsOpen}
          onClose={() => ctrl.setIsProjectsOpen(false)}
          ranks={Object.values(ctrl.ranks)}
          activeRankId={ctrl.activeRankId}
          onSelectRank={ctrl.setActiveRankId}
          onDeleteRank={(id) => requestProjectDelete([id])}
          onDeleteRanks={(ids) => requestProjectDelete(ids)}
          onNewRank={ctrl.handleNewRank}
          onUpdateRank={ctrl.updateRankById}
        />

        <DuplicateModalHost />

        <div className="flex flex-1 overflow-hidden pt-14">
          <ProjectSettingsSidebar
            isOpen={ctrl.isSidebarOpen}
            onClose={() => ctrl.setIsSidebarOpen(false)}
            requestConfirm={ctrl.confirmAction}
          />

          <div className="flex-1 flex flex-col min-w-0 relative bg-background">
            <main
              ref={mainRef}
              className={`flex-1 overflow-y-auto scrollbar-ios flex flex-col items-center ${mainPadding} pb-40`}
              onClick={() =>
                ctrl.interactionState && ctrl.setInteractionState(null)
              }
            >
              {/* The scroll-linked transform lives on a wrapper *outside*
                  `gridRef`, because `html-to-image` clones the element it is
                  given and would otherwise bake `scale(0.98)` into every
                  exported PNG. */}
              <motion.div
                style={{
                  scale: boardScale,
                  y: boardY,
                  // Promote only while the board is actually moving; leaving it
                  // on permanently would keep a layer alive for every tile.
                  willChange: isScrolled ? "transform" : undefined,
                }}
                className={SHEET_WIDTH[activeRank.type]}
              >
                {/* The board's sheet, hugging the grid so the export frames the
                  board rather than the window. */}
                <div
                  ref={ctrl.gridRef}
                  className={`relative ${SHEET_WIDTH[activeRank.type]} transition-[background-color,padding] duration-200 ease-standard ${containerPaddingClass}`}
                  style={{
                    backgroundColor:
                      sheetColor === "transparent" ? "" : sheetColor,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (ctrl.interactionState) ctrl.setInteractionState(null);
                  }}
                >
                  <BoardTitle
                    activeRank={activeRank}
                    ctrl={ctrl}
                    textColor={textColor}
                  />
                  <BoardView activeRank={activeRank} />
                  <BoardWatermark
                    activeRank={activeRank}
                    textColor={textColor}
                  />
                </div>
              </motion.div>
            </main>

            {dockReady && (
              <Suspense fallback={null}>
                <Inbox
                  requestConfirm={ctrl.confirmAction}
                  onOpenAbout={ctrl.openAbout}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
