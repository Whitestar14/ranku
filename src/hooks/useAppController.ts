import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { useToast } from "@/context/ToastContext";
import { downloadGrid, copyGrid, type ImageFormat } from "@/utils/imageUtils";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useShortcutState } from "@/state/shortcutState";
import { useModalState } from "@/state/modalState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { requestDockToggle } from "@/utils/inboxDrag";
import {
  selectActiveRankId,
  selectActiveRank,
  selectRanks,
} from "@/store/selectors";
import { resolveActiveRankId } from "@/utils/storeUtils";
import { runActivity } from "@/state/activityState";

const COMPACT_QUERY = "(max-width: 1023px)";

const isCompactViewport = () =>
  typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches;

const preferredSidebarOpen = () =>
  useStore.getState().preferences.sidebarOpen ?? true;

export function useAppController() {
  const addToast = useToast();

  // Local UI State
  const [showLoader, setShowLoader] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(isCompactViewport);
  /* Resolved during the first render so a wide layout never paints with the
     rail closed and then shoves the board to the right. */
  const [isSidebarOpen, setIsSidebarOpenState] = useState(
    () => !isCompactViewport() && preferredSidebarOpen(),
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const openExport = useModalState((s) => s.openExport);
  const openAbout = useModalState((s) => s.openAbout);
  const requestConfirm = useModalState((s) => s.requestConfirm);

  const updatePreferences = useStore((s) => s.updatePreferences);
  const persistedSidebarOpen = useStore((s) => s.preferences.sidebarOpen);

  const sidebarOpenRef = useRef(isSidebarOpen);
  sidebarOpenRef.current = isSidebarOpen;

  /** Desktop keeps the choice; a phone always starts with the rail closed. */
  const setIsSidebarOpen = useCallback(
    (open: boolean) => {
      setIsSidebarOpenState(open);
      if (!isCompact) updatePreferences({ sidebarOpen: open });
    },
    [isCompact, updatePreferences],
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(!sidebarOpenRef.current);
  }, [setIsSidebarOpen]);

  useEffect(() => {
    if (isCompact) return;
    if (typeof persistedSidebarOpen === "boolean") {
      setIsSidebarOpenState(persistedSidebarOpen);
    }
  }, [persistedSidebarOpen, isCompact]);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setIsCompact(event.matches);
      setIsSidebarOpenState(
        event.matches ? false : preferredSidebarOpen(),
      );
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const gridRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Global State
  const activeRankId = useStore(selectActiveRankId);
  const activeRank = useStore(selectActiveRank);
  const ranks = useStore(selectRanks);
  const interactionState = useStore((s) => s.interactionState);

  // Actions
  const setInteractionState = useStore((s) => s.setInteractionState);
  const updateActiveRank = useStore((s) => s.updateActiveRank);
  const setActiveRankId = useStore((s) => s.setActiveRankId);
  const handleDeleteRank = useStore((s) => s.handleDeleteRank);
  const handleNewRank = useStore((s) => s.handleNewRank);
  const handleNewRankLikeCurrent = useStore((s) => s.handleNewRankLikeCurrent);
  const updateRankById = useStore((s) => s.updateRankById);

  const isShortcutsOpen = useShortcutState((s) => s.isOpen);
  const closeShortcuts = useShortcutState((s) => s.close);

  // Lifecycles
  const bootAtRef = useRef(performance.now());

  /* The loader covers hydration rather than a fixed pause: it lifts as soon as
     the store is ready, with a short floor so the wordmark does not flicker. */
  useEffect(() => {
    if (!isLoaded) return;
    const elapsed = performance.now() - bootAtRef.current;
    const timer = window.setTimeout(
      () => setShowLoader(false),
      Math.max(0, 280 - elapsed),
    );
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    const setLoaded = () => setIsLoaded(true);
    const unsubFinishHydration = useStore.persist.onFinishHydration(setLoaded);

    if (useStore.persist.hasHydrated()) setLoaded();

    const failsafe = window.setTimeout(setLoaded, 4000);

    return () => {
      unsubFinishHydration();
      window.clearTimeout(failsafe);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || activeRank) return;
    const { ranks, activeRankId, setActiveRankId, handleNewRank } =
      useStore.getState();
    const resolved = resolveActiveRankId(ranks, activeRankId);
    if (resolved) setActiveRankId(resolved);
    else handleNewRank("ranking");
  }, [isLoaded, activeRank]);

  useAppTheme(isLoaded);
  useGlobalShortcuts({
    setIsEditingTitle,
    onToggleSidebar: toggleSidebar,
    onExport: openExport,
    onToggleDock: requestDockToggle,
  });

  const confirmAction = requestConfirm;

  const createProjectLikeCurrent = useCallback(() => {
    void runActivity(
      "New project",
      async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const id = handleNewRankLikeCurrent();
        if (!id) throw new Error("No project to copy");
        return id;
      },
      {
        successLabel: "Project created",
        errorLabel: "Could not create project",
      },
    );
  }, [handleNewRankLikeCurrent]);

  /**
   * Export reports through the island, which is determinate where it can be.
   */
  const exportImage = async (
    fmt: ImageFormat,
    qualityScale: number,
    trimPadding = false,
  ) => {
    const element = gridRef.current;
    if (!element || !activeRank) return;

    await runActivity(
      `Exporting ${fmt.toUpperCase()}`,
      async () => {
        try {
          await downloadGrid(
            element,
            activeRank.title,
            fmt,
            qualityScale,
            trimPadding,
          );
        } catch (error) {
          addToast(
            "error",
            error instanceof Error ? error.message : "Export failed",
          );
          throw error;
        }
      },
      {
        successLabel: `Exported as ${fmt.toUpperCase()}`,
        errorLabel: "Export failed",
      },
    );
  };

  const copyImage = async (qualityScale: number, trimPadding = false) => {
    const element = gridRef.current;
    if (!element) return;

    await runActivity(
      "Copying image",
      async () => {
        try {
          await copyGrid(element, qualityScale, trimPadding);
        } catch (error) {
          addToast(
            "error",
            error instanceof Error ? error.message : "Copy failed",
          );
          throw error;
        }
      },
      { successLabel: "Copied to clipboard", errorLabel: "Copy failed" },
    );
  };

  return {
    // State
    showLoader,
    isLoaded,
    isProjectsOpen,
    isSidebarOpen,
    isEditingTitle,
    tempTitle,
    gridRef,
    titleInputRef,

    // Store state
    activeRankId,
    activeRank,
    ranks,
    interactionState,

    // Setters
    setIsProjectsOpen,
    setIsSidebarOpen,
    toggleSidebar,
    openExport,
    openAbout,
    setIsEditingTitle,
    setTempTitle,
    isShortcutsOpen,
    closeShortcuts,
    setInteractionState,
    updateActiveRank,
    setActiveRankId,
    handleDeleteRank,
    handleNewRank,
    updateRankById,

    // Methods
    confirmAction,
    exportImage,
    copyImage,
    createProjectLikeCurrent,
  };
}
