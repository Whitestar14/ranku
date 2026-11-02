import React from "react";
import { useStore } from "@/store/useStore";
import { DockCollapsedBar } from "./dock/DockCollapsedBar";
import { DockExpandedContent } from "./dock/DockExpandedContent";
import { useDockDropZone } from "./dock/useDockDropZone";
import { useExternalDragZone } from "./dock/useExternalDragZone";
import type { DockCtrl } from "./dock/types";

export type { DockCtrl as BottomDockCtrl } from "./dock/types";

const DOCK_RADIUS = "var(--radius-bar)";
/* `dvh` rather than `vh`: on a phone the URL bar is part of the viewport until
   it retracts, and a panel sized against the larger number hangs under it. */
const OPEN_HEIGHT = "min(20rem, 58dvh)";

export const BottomDockLayout: React.FC<{
  ctrl: DockCtrl;
  requestConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void
  ) => void;
  onOpenAbout?: () => void;
}> = ({ ctrl, requestConfirm, onOpenAbout }) => {
  const autoCloseDockDesktop = useStore(
    (s) => s.preferences.autoCloseDockOnDragDesktop ?? false
  );

  const [autoFocusSearch, setAutoFocusSearch] = React.useState(false);
  const isExternalDrag = useExternalDragZone();

  const { isDockHot, isDndOver, setDockRefs } = useDockDropZone({
    isExpanded: ctrl.isExpanded,
    setIsExpanded: ctrl.setIsExpanded,
    isDraggingFromDock: ctrl.isDraggingFromDock,
    autoCloseOnDragDesktop: autoCloseDockDesktop,
  });

  React.useEffect(() => {
    const handleOpenSearch = () => {
      ctrl.setDockSurface("library");
      ctrl.setActiveTab("search");
      ctrl.setIsExpanded(true);
      setAutoFocusSearch(true);
      // Brief timeout to let focus happen, then reset so it can be re-triggered
      setTimeout(() => setAutoFocusSearch(false), 500);
    };
    window.addEventListener("open-inbox-search", handleOpenSearch);
    return () =>
      window.removeEventListener("open-inbox-search", handleOpenSearch);
  }, [ctrl.setDockSurface, ctrl.setActiveTab, ctrl.setIsExpanded]);

  const open = ctrl.isExpanded;
  const isDropActive = ctrl.isDragOver || isDndOver;
  /* The panel stays mounted after it collapses so the drag keeps its source
     node, but nothing of it may be visible: clipped by the 3rem bar it used to
     leak a strip of thumbnails under the collapsed chrome. */
  const isDraggingItem = !open && ctrl.isDraggingFromDock;

  return (
    <div
      className="fixed z-rail md:px-4 flex justify-center"
      /* `--dock-inset-left` is the rail's width while it is open on desktop, so
         the dock centres in the content column instead of under the rail. The
         bottom gap includes the home indicator on a phone, which is where a
         floating bar is most likely to be swallowed. */
      style={{
        left: "var(--dock-inset-left, 0px)",
        right: 0,
        bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {isExternalDrag && (
        /* A tall, full-width spring zone that only exists mid-drag. It widens
           the target from the collapsed bar's 48px to the whole bottom of the
           window, so a drag "in" opens the dock instead of silently missing. */
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-32 z-0"
          onDragEnter={ctrl.handleDragEnter}
          onDragOver={ctrl.handleDragOver}
          onDragLeave={ctrl.handleDragLeave}
          onDrop={ctrl.handleDrop}
        />
      )}

      <div
        ref={setDockRefs}
        className={`
          relative overflow-hidden flex flex-col squircle overscroll-contain
          ${open ? "material-thick" : "material-thin material-lit"}
          ${isDropActive ? "dock-drop-active" : isDockHot ? "dock-drop-hot" : ""}
        `}
        style={{
          width: open ? "100%" : "clamp(220px, calc(100vw - 120px), 310px)",
          maxWidth: "768px",
          height: open ? OPEN_HEIGHT : "3rem",
          // Keep the radius constant so the shape does not morph while resizing.
          borderRadius: DOCK_RADIUS,
          transition: open
            ? "width 210ms var(--ease-emphasized), height 260ms var(--ease-emphasized) 120ms"
            : "width 240ms var(--ease-emphasized) 90ms, height 190ms var(--ease-emphasized)",
          willChange: "width, height",
        }}
        onDragEnter={ctrl.handleDragEnter}
        onDragOver={ctrl.handleDragOver}
        onDragLeave={ctrl.handleDragLeave}
        onDrop={ctrl.handleDrop}
      >
        <DockCollapsedBar
          inert={open}
          isDraggingItem={isDraggingItem}
          onExpand={() => ctrl.setIsExpanded(true)}
          onOpenLibrary={() => {
            ctrl.setDockSurface("library");
            if (ctrl.activeTab === "picker") ctrl.setActiveTab("search");
            ctrl.setIsExpanded(true);
          }}
          onOpenSettings={() => {
            ctrl.setDockSurface("settings");
            ctrl.setIsExpanded(true);
          }}
        />

        {/* Mounted while the panel is open, and while an item is being dragged
            *out* of it. Auto-close collapses the panel the moment the pointer
            leaves, and this subtree owns the card that is in flight — so
            unmounting on collapse used to drop the drag's identity and the drop
            with it, making the image look like it had vanished. */}
        {(open || ctrl.isDraggingFromDock) && (
          <div
            className={open ? "contents" : "invisible"}
            inert={!open || undefined}
          >
            <DockExpandedContent
              ctrl={ctrl}
              autoFocusSearch={autoFocusSearch}
              requestConfirm={requestConfirm}
              onOpenAbout={onOpenAbout}
            />
          </div>
        )}
      </div>
    </div>
  );
};
