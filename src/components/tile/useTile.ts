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
import { useToast } from "@/context/ToastContext";
import { DRAG_TYPE, DROP_TYPE } from "@/constants/drag";

/**
 * How one surface (a board tile, a list row, a tier item) routes a change.
 */
export interface TileAdapter {
  /** Position on a grid/list, or the item's index inside its tier row. */
  index: number;
  item: CellData | undefined;
  /** Aspect ratio in `w:h` form, for the drag preview. */
  aspectRatio: string;
  /** Fallback preview width when the element has not been measured yet. */
  previewWidth?: number;
  /** Set on a tier item so it drags as a tier payload. */
  rowId?: string;
  /** Marks a list row, whose drop reorders instead of swapping. */
  isRow?: boolean;
  /** A list can reorder its blank rows; a board tile cannot drag empty. */
  draggableWhenEmpty?: boolean;
  /**
   * The id to key the landing pulse on, when it differs from the droppable id.
   * A sortable list row's droppable id is the cell's own id, because that is
   * what `useSortable` registers and what a drop reports as `over.id`.
   */
  dropId?: string;
  /**
   * Set on a sortable surface, which registers its own droppable (with its own
   * id and payload). Registering a second one on the same node would let
   * collision detection pick a payload with no `type`, and the drop would be
   * silently ignored.
   */
  ownDroppable?: boolean;
  /** Persist a partial change to this position. */
  update: (patch: Partial<CellData>) => void;
  /** Put an image at this position, from a file or a direct upload. */
  setImage: (src: string) => void;
  /**
   * Put an image here from a pasted URL. A grid routes this through the library
   * so the image is remembered; the other two types just set it. Falls back to
   * `setImage` when omitted.
   */
  importFromUrl?: (url: string) => void;
  /** Empty the position. */
  clear: () => void;
  /** Send the image back to the Library. */
  returnToLibrary: () => void;
  /** Suggested filename for downloading this position's image. */
  filename: string;
}

const parsePlacement = (item: CellData | undefined) => ({
  zoom: item?.zoom,
  posX: item?.objectPosition ? parseInt(item.objectPosition.split(" ")[0]) : 50,
  posY: item?.objectPosition ? parseInt(item.objectPosition.split(" ")[1]) : 50,
});

/**
 * Everything a position holding an image must be able to do.
 *
 * It supplies only its layout, its write routing, and the drag mechanism
 * it needs. Placement parsing, the action menu, the file input, the drop pulse
 * and the drag payload are shared, so a behavior fixed here is fixed on all
 * three surfaces by construction.
 *
 * A board tile wants `useDraggable` while a list row needs `useSortable` for its
 * live reorder preview, and one node cannot be registered twice, therefore drag
 * registration is deliberately left to the surface. The hook hands out
 * `dragId` / `dragData` / `dragDisabled` so the payload is still built once.
 */
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
    clear,
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
      setImage(src as string);
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
  } = usePanZoom(parsePlacement(item), imageRef, (state) =>
    update({
      zoom: state.zoom,
      objectPosition: `${state.posX}% ${state.posY}%`,
    }),
  );

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

  /* Dismiss the menu when the position loses selection. */
  const wasSelected = useRef(isSelected);
  useEffect(() => {
    const previously = wasSelected.current;
    wasSelected.current = isSelected;
    if (previously && !isSelected) setIsMenuOpen(false);
  }, [isSelected]);

  const openMenu = useCallback(
    (e: React.MouseEvent, anchorTo?: HTMLElement | null) => {
      e.stopPropagation();
      e.preventDefault();
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
    [],
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
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setImage(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    },
    [setImage],
  );

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragOver(true);
  }, []);

  const handleFileDragLeave = useCallback(() => setIsFileDragOver(false), []);

  const removeImage = useCallback(() => {
    clear();
    clearInteraction();
  }, [clear, clearInteraction]);

  const actions = useMemo<PopoverAction[]>(
    () =>
      hasImage
        ? filledImageActions({
            onReplace: triggerPicker,
            onAdjust: startAdjusting,
            onDownload: handleDownload,
            onCopy: handleCopy,
            onReturnToLibrary: returnToLibrary,
            onRemove: removeImage,
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
      startAdjusting,
      handleDownload,
      handleCopy,
      returnToLibrary,
      removeImage,
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
      start: startAdjusting,
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
