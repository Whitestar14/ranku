import React, { useCallback, useState } from "react";
import { Images } from "lucide-react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { PopoverMenu } from "@/components/ui/PopoverMenu";
import { dockImageActions } from "@/components/ui/imageActions";
import { ImageInfoModal } from "@/components/ImageInfoModal";
import { InboxItemCard } from "./InboxItemCard";
import { motion, AnimatePresence } from "motion/react";
import { motion as motionPreset } from "@/lib/motion";
import { useImageTransferActions } from "@/hooks/useImageTransferActions";
import { imageFileName } from "@/utils/imageInfo";
import type { InboxItem } from "@/types";
import type { DockCtrl } from "./dock/types";

export const InboxStashGrid = React.memo<{ ctrl: DockCtrl }>(({ ctrl }) => {
  const {
    currentItems,
    activeCollectionId,
    isAllView,
    usedOnBoard,
    selectedItemIds,
  } = ctrl;

  const { copyImage, downloadImage } = useImageTransferActions();
  /* One menu for the whole rail. A menu per card would mount a portal and a
     document listener for every poster in the library, most of which are never
     right-clicked. */
  const [menu, setMenu] = useState<{
    item: InboxItem;
    x: number;
    y: number;
  } | null>(null);
  const [infoItem, setInfoItem] = useState<InboxItem | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const openItemMenu = useCallback((e: React.MouseEvent, item: InboxItem) => {
    /* A long press on a phone opens the context menu in the browser, but here
       it belongs to the drag gesture. Only a mouse may open the menu. */
    const pointerType = (e.nativeEvent as PointerEvent).pointerType;
    if (pointerType && pointerType !== "mouse") return;
    e.preventDefault();
    e.stopPropagation();
    setMenu({ item, x: e.clientX, y: e.clientY });
  }, []);

  const closeItemMenu = useCallback(() => setMenu(null), []);

  const menuItem = menu?.item;
  const canRemove = menuItem ? !usedOnBoard.has(menuItem.imageSrc) : false;

  const menuActions = menuItem
    ? dockImageActions({
        onDownload: () =>
          downloadImage(menuItem.imageSrc, imageFileName(menuItem.imageSrc)),
        onCopy: () => copyImage(menuItem.imageSrc),
        onImageInfo: () => {
          setInfoItem(menuItem);
          setIsInfoOpen(true);
        },
        onRemove: canRemove
          ? () => ctrl.handleDeleteItem(menuItem)
          : undefined,
      })
    : [];

  const infoCollectionName = infoItem
    ? isAllView
      ? ctrl.collections.find((collection) =>
          collection.items.some((item) => item.id === infoItem.id),
        )?.name
      : ctrl.collections.find((collection) => collection.id === activeCollectionId)
          ?.name
    : undefined;

  const onUploadClick = () => ctrl.fileInputRef.current?.click();
  const key = isAllView ? "all" : activeCollectionId;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col group/grid">
      <input
        type="file"
        ref={ctrl.fileInputRef}
        multiple
        className="hidden"
        accept="image/*"
        onChange={ctrl.onFileInputChange}
      />

      <AnimatePresence mode="wait">
        {currentItems.length === 0 ? (
          <motion.div
            key={`empty-state-${key}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="button"
            tabIndex={0}
            onClick={() => !isAllView && onUploadClick()}
            onKeyDown={(e) => {
              if (!isAllView && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onUploadClick();
              }
            }}
            className={`m-3 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center
                        text-muted text-footnote font-medium select-none border border-dashed
                        border-hairline rounded-card card-veil p-3 md:m-4 md:p-4 transition-colors
                        ${
                          !isAllView
                            ? "cursor-pointer hover:border-primary hover:bg-hover hover:text-text"
                            : ""
                        }`}
          >
            <EmptyState
              className="flex-1 py-0"
              icon={
                isAllView ? (
                  <Images size={24} strokeWidth={1.8} />
                ) : (
                  <PixelIcon name="upload" size={24} />
                )
              }
              title={isAllView ? "Your library is empty" : "Nothing here yet"}
              description={
                isAllView
                  ? "Images you add here are available to every project."
                  : "Drag items here, or move them off a board."
              }
              action={
                !isAllView && (
                  <span className="text-caption-1 font-semibold text-primary/80 group-hover/grid:text-primary">
                    Tap to upload
                  </span>
                )
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key={`items-${key}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <ScrollRail
              className="flex-1 min-h-0"
              scrollerClassName="h-full"
              align="center"
              contentClassName="px-4"
            >
              {!isAllView && (
                <button
                  type="button"
                  onClick={onUploadClick}
                  className="shrink-0 w-28 h-40 text-sm border border-dashed border-hairline rounded-tile
                             flex flex-col items-center justify-center text-muted
                             hover:text-primary hover:border-primary card-veil hover:bg-hover
                             transition-colors group"
                >
                  <span className="mb-3 transition-transform duration-200 group-hover:scale-110">
                    <PixelIcon name="upload" size={27} />
                  </span>
                  Upload
                </button>
              )}

              <AnimatePresence initial={false}>
                {currentItems.map((item) => {
                  const isUsed = usedOnBoard.has(item.imageSrc);
                  const isSelected = selectedItemIds.has(item.id);

                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={motionPreset.snappy}
                      key={`${key}-${item.id}`}
                      className="shrink-0 p-2"
                      style={{
                        contentVisibility: "auto",
                        containIntrinsicSize: "128px 176px",
                      }}
                    >
                      <InboxItemCard
                        item={item}
                        isUsed={isUsed}
                        isSelected={isSelected}
                        isPlacing={ctrl.placement?.itemId === item.id}
                        isAllView={isAllView}
                        collectionId={
                          isAllView ? "all-images" : activeCollectionId
                        }
                        onItemClick={ctrl.handleItemClick}
                        onContextMenu={openItemMenu}
                        onDeleteItem={ctrl.handleDeleteItem}
                        onRecall={ctrl.handleRecall}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </ScrollRail>
          </motion.div>
        )}
      </AnimatePresence>

      <PopoverMenu
        isOpen={!!menu}
        onClose={closeItemMenu}
        actions={menuActions}
        triggerPoint={menu ? { x: menu.x, y: menu.y, anchor: "left" } : null}
        separators="explicit"
        ariaLabel="Image actions"
      />

      <ImageInfoModal
        isOpen={isInfoOpen}
        item={infoItem}
        collectionName={infoCollectionName}
        isOnBoard={infoItem ? usedOnBoard.has(infoItem.imageSrc) : false}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
});

InboxStashGrid.displayName = "InboxStashGrid";
