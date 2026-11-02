import React from "react";
import { Images } from "lucide-react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { InboxItemCard } from "./InboxItemCard";
import { motion, AnimatePresence } from "motion/react";
import { motion as motionPreset } from "@/lib/motion";
import type { DockCtrl } from "./dock/types";

export const InboxStashGrid = React.memo<{ ctrl: DockCtrl }>(({ ctrl }) => {
  const {
    currentItems,
    activeCollectionId,
    isAllView,
    usedOnBoard,
    selectedItemIds,
  } = ctrl;

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
            className={`m-4 flex-1 flex flex-col items-center justify-center text-muted text-footnote
                        font-medium select-none border border-dashed border-hairline rounded-card
                        card-veil p-4 transition-colors
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
                  <span className="text-caption-2 uppercase tracking-widest text-primary/80 font-bold group-hover/grid:text-primary">
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
    </div>
  );
});

InboxStashGrid.displayName = "InboxStashGrid";
