import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { useToast } from "@/context/ToastContext";
import { useImagePresenceSets } from "@/hooks/useImagePresenceSets";
import { readFileAsDataURL } from "@/utils/imageFile";
import {
  requestDockExpand,
  DOCK_EXPAND_EVENT,
  DOCK_TOGGLE_EVENT,
} from "@/utils/inboxDrag";
import type { ImageSourcePreference, InboxItem } from "@/types";
import type { SearchMode } from "@/core/metadata";
import type { DockSurface, InboxTab } from "@/components/Inbox/types";
import { runActivity, useActivityState } from "@/state/activityState";

const OPEN_SEARCH_EVENT = "open-inbox-search";

export function useInboxController(
  requestConfirm: (title: string, message: string, action: () => void) => void,
) {
  const addToast = useToast();
  const { inboxImageSet: usedImageSrcs, boardImageSet: usedOnBoard } =
    useImagePresenceSets();

  const {
    collections,
    activeCollectionId,
    lastTargetCollectionId,
    interactionState,
    placement,
    setPlacement,
    switchCollection,
    addCollection,
    deleteCollection,
    renameCollection,
    removeInboxItem,
    moveItemsToCollection,
    handleItemTransfer,
    handleAddToCollection,
    handleRecallFromBoard,
    handleUpdateLastTarget,
    handleRestoreItem,
    handleInboxUpload,
    setIsDraggingFromDock,
    isDraggingFromDock,
    searchSource,
    updatePreferences,
  } = useStore(
    useShallow((s) => ({
      collections: s.inbox.collections,
      activeCollectionId: s.inbox.activeCollectionId,
      lastTargetCollectionId: s.inbox.lastTargetCollectionId,
      interactionState: s.interactionState,
      placement: s.placement,
      setPlacement: s.setPlacement,
      switchCollection: s.switchCollection,
      addCollection: s.addCollection,
      deleteCollection: s.deleteCollection,
      renameCollection: s.renameCollection,
      removeInboxItem: s.removeInboxItem,
      moveItemsToCollection: s.moveItemsToCollection,
      handleItemTransfer: s.handleItemTransfer,
      handleAddToCollection: s.handleAddToCollection,
      handleRecallFromBoard: s.handleRecallFromBoard,
      handleUpdateLastTarget: s.handleUpdateLastTarget,
      setIsDraggingFromDock: s.setIsDraggingFromDock,
      isDraggingFromDock: s.isDraggingFromDock,
      handleRestoreItem: s.handleRestoreItem,
      handleInboxUpload: s.handleInboxUpload,
      searchSource: (s.preferences.imageSource ??
        "auto") as ImageSourcePreference,
      updatePreferences: s.updatePreferences,
    })),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<InboxTab>("stash");
  const [dockSurface, setDockSurface] = useState<DockSurface>("library");
  const [isExpanded, setIsExpanded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("characters");

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [pendingPickerImage, setPendingPickerImage] = useState<string | null>(
    null,
  );

  const allItems = useMemo(
    () => collections.flatMap((c) => c.items),
    [collections],
  );

  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const currentItems =
    activeCollectionId === "all-images"
      ? allItems
      : activeCollection?.items || [];
  const isAllView = activeCollectionId === "all-images";

  useEffect(() => {
    setSelectedItemIds(new Set());
    setPlacement(null);
  }, [activeCollectionId, activeTab, setPlacement]);

  /* Placement is a deliberate mode; leaving the dock or its tab ends it. */
  useEffect(() => {
    if (!placement) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlacement(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [placement, setPlacement]);

  /* Choosing a board target switches to placing; it cancels the bulk bar. */
  useEffect(() => {
    if (
      interactionState?.type === "cell" ||
      interactionState?.type === "tier-item"
    ) {
      setSelectedItemIds((prev) => (prev.size === 0 ? prev : new Set()));
    }
  }, [interactionState]);

  useEffect(() => {
    const handleOpenSearch = () => {
      setDockSurface("library");
      setIsExpanded(true);
      setActiveTab("search");
    };
    window.addEventListener(OPEN_SEARCH_EVENT, handleOpenSearch);
    return () =>
      window.removeEventListener(OPEN_SEARCH_EVENT, handleOpenSearch);
  }, []);

  useEffect(() => {
    const handleExpand = () => setIsExpanded(true);

    const handleToggle = () =>
      setIsExpanded((open) => {
        if (open) setPlacement(null);
        return !open;
      });
    window.addEventListener(DOCK_EXPAND_EVENT, handleExpand);
    window.addEventListener(DOCK_TOGGLE_EVENT, handleToggle);
    return () => {
      window.removeEventListener(DOCK_EXPAND_EVENT, handleExpand);
      window.removeEventListener(DOCK_TOGGLE_EVENT, handleToggle);
    };
  }, [setPlacement]);

  const collectionIdForActions = isAllView ? "all-images" : activeCollectionId;

  const clearSelection = useCallback(() => {
    setSelectedItemIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const commitCollectionRename = useCallback(
    (colId: string) => {
      if (tempName.trim()) renameCollection(colId, tempName);
      setEditingNameId(null);
    },
    [tempName, renameCollection],
  );

  const startPlacement = useCallback(
    (itemId: string) => {
      const item = collections
        .flatMap((c) => c.items)
        .find((i) => i.id === itemId);
      if (!item) return;
      setPlacement({
        itemId: item.id,
        collectionId: collectionIdForActions,
        imageSrc: item.imageSrc,
      });
      setSelectedItemIds(new Set());
    },
    [collections, collectionIdForActions, setPlacement],
  );

  const cancelPlacement = useCallback(() => setPlacement(null), [setPlacement]);

  const handleItemClick = useCallback(
    (_e: React.MouseEvent, itemId: string) => {
      const store = useStore.getState();

      /* Already carrying an image: tapping another one swaps what is carried. */
      if (store.placement) {
        const item = collections
          .flatMap((c) => c.items)
          .find((i) => i.id === itemId);
        if (item) {
          store.setPlacement({
            itemId: item.id,
            collectionId: collectionIdForActions,
            imageSrc: item.imageSrc,
          });
        }
        return;
      }

      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        return next;
      });
    },
    [collections, collectionIdForActions],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    const n = selectedItemIds.size;
    requestConfirm(
      `Delete ${n} item${n > 1 ? "s" : ""}?`,
      "They leave the Library. Boards that use them keep their copies.",
      () => {
        selectedItemIds.forEach((id) => removeInboxItem(id));
        clearSelection();
        addToast("info", `Removed ${n} items`);
      },
    );
  }, [
    selectedItemIds,
    removeInboxItem,
    addToast,
    requestConfirm,
    clearSelection,
  ]);

  const toastAddedToCollection = useCallback(
    (imageSrc: string, colId: string) => {
      const colName =
        collections.find((c) => c.id === colId)?.name || "Collection";
      addToast("success", `Added to ${colName}`, "Change", () => {
        setPendingPickerImage(imageSrc);
        setActiveTab("picker");
      });
    },
    [collections, addToast],
  );

  const handleSmartAdd = useCallback(
    (imageSrc: string) => {
      if (
        lastTargetCollectionId &&
        collections.some((c) => c.id === lastTargetCollectionId)
      ) {
        const added = handleAddToCollection(imageSrc, lastTargetCollectionId);
        if (added) toastAddedToCollection(imageSrc, lastTargetCollectionId);
        else addToast("info", "Already in the collection");
      } else {
        setPendingPickerImage(imageSrc);
        setActiveTab("picker");
      }
    },
    [
      lastTargetCollectionId,
      collections,
      handleAddToCollection,
      toastAddedToCollection,
      addToast,
    ],
  );

  /** Takes the poster off the board and leaves it in the library. */
  const handleRecall = useCallback(
    (imageSrc: string) => {
      handleRecallFromBoard(imageSrc);
      addToast("info", "Returned to stash");
    },
    [handleRecallFromBoard, addToast],
  );

  const handleDeleteItem = useCallback(
    (item: InboxItem) => {
      removeInboxItem(item.id);
      let originCollectionId = activeCollectionId;
      if (isAllView) {
        const foundCol = collections.find((c) =>
          c.items.some((i) => i.id === item.id),
        );
        if (foundCol) originCollectionId = foundCol.id;
      }
      addToast("info", "Image removed from stash", "Undo", () => {
        handleRestoreItem(item, originCollectionId);
      });
    },
    [
      removeInboxItem,
      activeCollectionId,
      isAllView,
      collections,
      addToast,
      handleRestoreItem,
    ],
  );

  const ingestFiles = useCallback(
    (files: FileList) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      if (list.length === 1 && list[0].size < 512_000) {
        void (async () => {
          try {
            const added = handleInboxUpload(await readFileAsDataURL(list[0]));
            if (!added) addToast("info", "Already in the collection");
          } catch {
            addToast("error", "Could not read that image");
          }
        })();
        return;
      }

      void runActivity(
        list.length === 1
          ? "Processing image"
          : `Importing ${list.length} images`,
        async () => {
          let failed = 0;
          let skipped = 0;
          for (let i = 0; i < list.length; i++) {
            try {
              if (!handleInboxUpload(await readFileAsDataURL(list[i]))) {
                skipped++;
              }
            } catch {
              failed++;
            }
            useActivityState.getState().setProgress((i + 1) / list.length);
          }
          if (failed === list.length) {
            addToast("error", "Could not read those images");
            throw new Error("No images could be read");
          }
          if (failed > 0) {
            addToast(
              "info",
              failed === 1
                ? "One image could not be read"
                : `${failed} images could not be read`,
            );
          }
          if (skipped > 0) {
            addToast(
              "info",
              skipped === 1
                ? "One image was already in the collection"
                : `${skipped} images were already in the collection`,
            );
          }
        },
        {
          successLabel: "Import complete",
          errorLabel: "Import failed",
        },
      );
    },
    [handleInboxUpload, addToast],
  );

  /* Images copied in another window (or another app) land here. A selected
     board position is the most specific target; otherwise the stash is. */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      e.preventDefault();

      void (async () => {
        const images: string[] = [];
        let failed = 0;
        for (const file of files) {
          try {
            images.push(await readFileAsDataURL(file));
          } catch {
            failed++;
          }
        }
        if (images.length === 0) {
          addToast("error", "Could not paste that image");
          return;
        }
        if (failed > 0) {
          addToast(
            "info",
            failed === 1
              ? "One pasted image could not be read"
              : `${failed} pasted images could not be read`,
          );
        }

        const state = useStore.getState();
        const selected = state.interactionState;
        if (selected?.type === "cell" && images.length === 1) {
          state.handleUpdateCell(selected.index, { imageSrc: images[0] });
          state.setInteractionState(null);
          addToast("success", `Pasted into position ${selected.index + 1}`);
          return;
        }

        const added = images.filter((src) => handleInboxUpload(src)).length;
        if (added === 0) {
          addToast("info", "Already in the collection");
        } else {
          addToast(
            "success",
            added === 1
              ? "Image added to stash"
              : `${added} images added to stash`,
          );
        }
      })();
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleInboxUpload, addToast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (activeTab === "stash" && !isAllView) {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          ingestFiles(e.dataTransfer.files);
          if (!isExpanded) setIsExpanded(true);
          return;
        }
      }

      const dragData = e.dataTransfer.getData("application/json");
      if (dragData) {
        try {
          const source = JSON.parse(dragData) as { type?: string };
          if (source.type === "cell") {
            handleItemTransfer(
              { type: "cell", index: (source as { index: number }).index },
              { type: "inbox" },
            );
            requestDockExpand(400);
          } else if (source.type === "tier-item") {
            const t = source as { rowId: string; itemId: string };
            handleItemTransfer(
              { type: "tier", rowId: t.rowId, itemId: t.itemId },
              { type: "inbox" },
            );
            requestDockExpand(400);
          }
        } catch {
          /* ignore */
        }
      }
    },
    [activeTab, isAllView, isExpanded, ingestFiles, handleItemTransfer],
  );

  /**
   * An external drag is one the app did not start — a file from the desktop or
   * an image from another window. dnd-kit drags use pointer events, so they
   * never reach the native drag handlers; anything that does is external.
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
      // Open the dock so a collapsed bar is not a 48px target you have to hit.
      if (!isExpanded) setIsExpanded(true);
    },
    [isExpanded],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
      if (!isExpanded) setIsExpanded(true);
    },
    [isExpanded],
  );

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const toggleExpand = useCallback(() => {
    if (isExpanded) setPlacement(null);
    setIsExpanded((v) => !v);
  }, [isExpanded, setPlacement]);

  const handleCollectionPick = useCallback(
    (colId: string) => {
      if (!pendingPickerImage) return;
      const imageSrc = pendingPickerImage;
      const added = handleAddToCollection(imageSrc, colId);
      handleUpdateLastTarget(colId);
      setPendingPickerImage(null);
      setActiveTab("search");
      if (added) toastAddedToCollection(imageSrc, colId);
      else addToast("info", "Already in the collection");
    },
    [
      pendingPickerImage,
      handleAddToCollection,
      handleUpdateLastTarget,
      toastAddedToCollection,
      addToast,
    ],
  );

  const requestDeleteCollection = useCallback(
    (col: { id: string; name: string; items: InboxItem[] }) => {
      const itemCount = col.items ? col.items.length : 0;
      if (itemCount === 0) {
        deleteCollection(col.id);
        return;
      }
      requestConfirm(
        `Delete "${col.name}"?`,
        `The collection and its ${itemCount} item${itemCount === 1 ? "" : "s"} leave the Library.`,
        () => deleteCollection(col.id),
      );
    },
    [requestConfirm, deleteCollection],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) ingestFiles(e.target.files);
      // Let the same file be chosen twice in a row.
      e.target.value = "";
    },
    [ingestFiles],
  );

  return {
    fileInputRef: fileInputRef as RefObject<HTMLInputElement | null>,
    dockSurface,
    setDockSurface,
    collections,
    activeCollectionId,
    lastTargetCollectionId,
    interactionState,
    placement,
    startPlacement,
    cancelPlacement,
    switchCollection,
    addCollection,
    renameCollection,
    usedImageSrcs,
    usedOnBoard,
    currentItems,
    isAllView,
    activeTab,
    setActiveTab,
    isExpanded,
    setIsExpanded,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    searchSource,
    setSearchSource: (source: ImageSourcePreference) =>
      updatePreferences({ imageSource: source }),
    editingNameId,
    setEditingNameId,
    tempName,
    setTempName,
    commitCollectionRename,
    selectedItemIds,
    clearSelection,
    isDragOver,
    setIsDragOver,
    handleItemClick,
    handleBulkDelete,
    handleSmartAdd,
    handleDeleteItem,
    handleRecall,
    handleDrop,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    toggleExpand,
    handleCollectionPick,
    requestDeleteCollection,
    moveItemsToCollection: moveItemsToCollection,
    onFileInputChange,
    setIsDraggingFromDock,
    isDraggingFromDock,
  };
}
