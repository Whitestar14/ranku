import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { CellData } from "@/types";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useCellInteraction } from "@/hooks/useCellInteraction";
import { useCellMediaUpload } from "@/hooks/useCellMediaUpload";
import { useDropPulse, useIsDragging } from "@/state/dragState";
import type { PopoverAction } from "@/components/ui/PopoverMenu";
import {
  emptyImageActions,
  filledImageActions,
} from "@/components/ui/imageActions";
import { copyImageToClipboard, downloadImage } from "@/utils/imageProxy";
import { readFileAsDataURL } from "@/utils/imageUtils";
import { useToast } from "@/context/ToastContext";
import { DRAG_TYPE, DROP_TYPE } from "@/constants/drag";

/** How a board tile, list row, or tier item routes a change. */
export interface TileAdapter {
  index: number;
  item: CellData | undefined;
  aspectRatio: string;
  previewWidth?: number;
  rowId?: string;
  isRow?: boolean;
  draggableWhenEmpty?: boolean;
  dropId?: string;
  ownDroppable?: boolean;
  update: (patch: Partial<CellData>) => void;
  setImage: (src: string) => void;
  importFromUrl?: (url: string) => void;
  returnToLibrary: () => void;
  filename: string;
}

const ADJUST_HINT_KEY = "ranku:adjust-hint-shown";

const markAdjustHintSeen = (): boolean => {
  try {
    if (sessionStorage.getItem(ADJUST_HINT_KEY)) return false;
    sessionStorage.setItem(ADJUST_HINT_KEY, "1");
  } catch {
    // Private mode can refuse storage; showing the hint again is harmless.
  }
  return true;
};

const parsePlacement = (item: CellData | undefined) => ({
  zoom: item?.zoom,
  posX: item?.objectPosition ? parseInt(item.objectPosition.split(" ")[0]) : 50,
  posY: item?.objectPosition ? parseInt(item.objectPosition.split(" ")[1]) : 50,
});

/** Shared behavior for every position that can hold an image. */
export function useTile(adapter: TileAdapter) {
  const {
    index,
    item,
    aspectRatio,
    previewWidth,
    rowId,
    isRow,
    draggableWhenEmpty,
    ownDroppable,
    update,
    setImage,
    importFromUrl,
    returnToLibrary,
    filename,
  } = adapter;

  const addToast = useToast();
  const tileRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  const { isSelected, handleInteraction, clearInteraction, place } =
    useCellInteraction({
      type: rowId ? "tier-item" : "cell",
      index,
      rowId,
      itemId: item?.id,
    });

  const { fileInputRef, triggerPicker, handleFileChange } = useCellMediaUpload(
    (src) => {
      setImage(src);
      clearInteraction();
    },
  );

  const {
    isAdjusting,
    imageStyle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    startAdjusting,
    stopAdjusting,
    saveAdjustments,
  } = usePanZoom(
    parsePlacement(item),
    imageRef,
    (state) =>
      update({
        zoom: state.zoom,
        objectPosition: `${state.posX}% ${state.posY}%`,
      }),
    tileRef,
  );

  const beginAdjust = useCallback(() => {
    if (markAdjustHintSeen()) {
      addToast("info", "Drag to reposition and scroll to zoom");
    }
    startAdjusting();
  }, [addToast, startAdjusting]);

  const hasImage = !!item?.imageSrc;
  const dropId =
    adapter.dropId ??
    (rowId ? `tier-drop-${rowId}-${index}` : `cell-drop-${item?.id ?? index}`);

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: dropId,
    data: rowId
      ? { type: DROP_TYPE.TIER_CELL, rowId, index }
      : { type: DROP_TYPE.CELL, index },
    disabled: ownDroppable,
  });
  const dropPulse = useDropPulse(dropId);

  const setNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      (tileRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      setDroppableRef(node);
    },
    [setDroppableRef],
  );

  const dragId = rowId
    ? `tier-drag-${rowId}-${item?.id}`
    : `cell-drag-${item?.id ?? index}`;

  const dragData = useMemo(
    () =>
      rowId
        ? {
            type: DRAG_TYPE.TIER_ITEM,
            rowId,
            id: item?.id,
            imageSrc: item?.imageSrc,
            width: tileRef.current?.offsetWidth || previewWidth,
            aspectRatio,
          }
        : {
            type: DRAG_TYPE.CELL,
            index,
            isRow,
            imageSrc: item?.imageSrc,
            textLabel: item?.textLabel,
            rating: item?.rating,
            width: tileRef.current?.offsetWidth || previewWidth,
            aspectRatio,
          },
    [
      rowId,
      item?.id,
      item?.imageSrc,
      item?.textLabel,
      item?.rating,
      previewWidth,
      aspectRatio,
      index,
      isRow,
    ],
  );

  const dragDisabled = isAdjusting || (!hasImage && !draggableWhenEmpty);

  const wasSelected = useRef(isSelected);
  useEffect(() => {
    const previously = wasSelected.current;
    wasSelected.current = isSelected;
    if (previously && !isSelected) setIsMenuOpen(false);
  }, [isSelected]);

  /* A long press is how a drag begins on touch. dnd-kit consumes the pointer,
     but the browser still fires `contextmenu` when the finger lingers, so the
     last pointer type decides whether that event means anything. */
  const lastPointerType = useRef("mouse");
  useEffect(() => {
    const node = tileRef.current;
    if (!node) return;
    const track = (e: PointerEvent) => {
      lastPointerType.current = e.pointerType || "mouse";
    };
    node.addEventListener("pointerdown", track, { capture: true, passive: true });
    return () => node.removeEventListener("pointerdown", track, { capture: true });
  }, []);

  const openMenu = useCallback(
    (e: React.MouseEvent, anchorTo?: HTMLElement | null) => {
      e.stopPropagation();
      if (e.type === "contextmenu") {
        e.preventDefault();
        if (e.button !== 2 || lastPointerType.current === "touch") return;
      }
      e.preventDefault();
      // Adjust mode owns the surface; the menu is deliberately unavailable.
      if (isAdjusting) return;
      if (anchorTo) {
        const rect = anchorTo.getBoundingClientRect();
        setAnchor({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
      } else if (e.clientX || e.clientY) {
        setAnchor({ x: e.clientX, y: e.clientY });
      } else {
        const rect = tileRef.current?.getBoundingClientRect();
        if (rect)
          setAnchor({ x: rect.left + rect.width / 2, y: rect.top + 12 });
      }
      setIsMenuOpen(true);
    },
    [isAdjusting],
  );

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const activate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isAdjusting) return;
      handleInteraction(e.clientX, e.clientY, e.target as HTMLElement);
    },
    [handleInteraction, isAdjusting],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!hasImage || isAdjusting) return;
      e.stopPropagation();
      triggerPicker();
    },
    [hasImage, isAdjusting, triggerPicker],
  );

  const handleDownload = useCallback(() => {
    if (!item?.imageSrc) return;
    void downloadImage(item.imageSrc, filename);
  }, [item?.imageSrc, filename]);

  const handleCopy = useCallback(() => {
    if (!item?.imageSrc) return;
    void copyImageToClipboard(item.imageSrc).then((ok) => {
      addToast(
        ok ? "success" : "error",
        ok ? "Image copied!" : "Could not copy this image",
      );
    });
  }, [item?.imageSrc, addToast]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsFileDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      void readFileAsDataURL(file)
        .then(setImage)
        .catch(() => addToast("error", "Could not read that image"));
    },
    [setImage, addToast],
  );

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragOver(true);
  }, []);

  const handleFileDragLeave = useCallback(() => setIsFileDragOver(false), []);

  const actions = useMemo<PopoverAction[]>(
    () =>
      hasImage
        ? filledImageActions({
            onAdjust: beginAdjust,
            onDownload: handleDownload,
            onCopy: handleCopy,
            onReturnToLibrary: returnToLibrary,
          })
        : emptyImageActions({
            onChooseFile: triggerPicker,
            onFromUrl: () => setIsUrlModalOpen(true),
            onSearchOnline: () =>
              window.dispatchEvent(new CustomEvent("open-inbox-search")),
          }),
    [
      hasImage,
      triggerPicker,
      beginAdjust,
      handleDownload,
      handleCopy,
      returnToLibrary,
    ],
  );

  const submitUrl = useCallback(
    (url: string) => {
      (importFromUrl ?? setImage)(url);
      clearInteraction();
    },
    [importFromUrl, setImage, clearInteraction],
  );

  return {
    setNodeRef,
    imageRef,
    dropId,
    hasImage,

    isSelected,
    isOver,
    isFileDragOver,
    isDraggingAny: useIsDragging(),
    dropPulse,

    dragId,
    dragData,
    dragDisabled,

    isAdjusting,
    imageStyle,
    adjust: {
      start: beginAdjust,
      stop: stopAdjusting,
      save: saveAdjustments,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerCancel,
    },

    isMenuOpen,
    anchor,
    openMenu,
    closeMenu,
    actions,

    fileInputRef,
    triggerPicker,
    handleFileChange,

    isUrlModalOpen,
    closeUrlModal: () => setIsUrlModalOpen(false),
    submitUrl,

    activate,
    place,
    handleDoubleClick,
    handleFileDrop,
    handleFileDragOver,
    handleFileDragLeave,
    clearInteraction,
  };
}
