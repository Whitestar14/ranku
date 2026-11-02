import React from "react";
import { AnimatePresence, motion, useTransform } from "motion/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Controls } from "@/components/Controls";
import { GridSettingsSidebar } from "@/components/GridSettingsSidebar";
import { Inbox } from "@/components/Inbox";
import { Library } from "@/components/Library";
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
import { SHEET_WIDTH } from "@/utils/boardStyle";

import { useAppController } from "@/hooks/useAppController";
import { useScrollDepth } from "@/hooks/useScrollDepth";

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

  // Scroll-linked depth: the board eases away from the viewer as it scrolls and
  // settles as it comes back, which reads as physical distance rather than a
  // list that happens to move. The small cap matters — past about 2% the text
  // on the tiles starts to soften, which looks like a bug rather than depth.
  const boardScale = useTransform(depth, [0, 1], [1, 0.982]);
  const boardY = useTransform(depth, [0, 1], [0, 10]);

  const activeRank = ctrl.activeRank;

  if (!activeRank) return <LoadingScreen />;

  const textColor = getContrastColor(activeRank.backgroundColor);
  const mainPadding =
    activeRank.type === "tierlist" ? "p-2 md:p-8" : "p-4 md:p-8";
  // Padding is expressed as responsive classes rather than read from
  // `window.innerWidth` during render, which never reacted to a resize.
  const containerPaddingClass =
    activeRank.type === "tierlist"
      ? "p-4 md:p-8"
      : activeRank.style === "card"
        ? "p-8"
        : "p-4";

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
          onOpenLibrary={() => ctrl.setIsLibraryOpen(true)}
          onToggleSidebar={() => ctrl.setIsSidebarOpen(!ctrl.isSidebarOpen)}
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

        <Library
          isOpen={ctrl.isLibraryOpen}
          onClose={() => ctrl.setIsLibraryOpen(false)}
          ranks={Object.values(ctrl.ranks)}
          activeRankId={ctrl.activeRankId}
          onSelectRank={ctrl.setActiveRankId}
          onDeleteRank={(id) => {
            const rank = ctrl.ranks[id];
            if (!rank) return;
            ctrl.confirmAction(
              `Delete "${rank.title}"?`,
              "This cannot be undone.",
              () => {
                ctrl.handleDeleteRank(id);
              },
            );
          }}
          onNewRank={ctrl.handleNewRank}
          onUpdateRank={ctrl.updateRankById}
        />

        <DuplicateModalHost />

        <div className="flex flex-1 overflow-hidden pt-14">
          <GridSettingsSidebar
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
                      activeRank.backgroundColor === "transparent"
                        ? ""
                        : activeRank.backgroundColor,
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

            <Inbox
              requestConfirm={ctrl.confirmAction}
              onOpenAbout={ctrl.openAbout}
            />
          </div>
        </div>
      </div>
    </>
  );
};
