import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Edit2 } from "lucide-react";
import { resolveBoardStyle } from "@/utils/boardStyle";
import type { Rank } from "@/types";
import type { useAppController } from "@/hooks/useAppController";

interface BoardTitleProps {
  activeRank: Rank;
  ctrl: ReturnType<typeof useAppController>;
  /** Foreground derived from the board sheet, so the title is legible on it. */
  textColor: string;
}

/** The board's heading: click to rename, blurred or entered to commit. */
export const BoardTitle: React.FC<BoardTitleProps> = ({
  activeRank,
  ctrl,
  textColor,
}) => {
  const commit = () => {
    ctrl.setIsEditingTitle(false);
    if (ctrl.tempTitle.trim() && ctrl.tempTitle !== activeRank.title) {
      ctrl.updateActiveRank({ title: ctrl.tempTitle });
    }
  };

  const startEditing = () => {
    ctrl.setTempTitle(activeRank.title);
    ctrl.setIsEditingTitle(true);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {(resolveBoardStyle(activeRank).showTitle || ctrl.isEditingTitle) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-center mb-5 relative flex justify-center items-center overflow-hidden"
        >
          {ctrl.isEditingTitle ? (
            <input
              ref={ctrl.titleInputRef}
              type="text"
              value={ctrl.tempTitle}
              onChange={(e) => ctrl.setTempTitle(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
              }}
              autoFocus
              onFocus={(e) => e.target.select()}
              className="text-large-title font-bold tracking-[-0.022em] text-center bg-transparent focus:outline-none w-full max-w-2xl placeholder:text-faint animate-in fade-in zoom-in-95"
              style={{ color: textColor }}
            />
          ) : (
            <h1
              className="text-large-title font-bold tracking-[-0.022em] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={startEditing}
              style={{ color: textColor }}
            >
              {activeRank.title}
            </h1>
          )}
          <button
            onClick={startEditing}
            className="absolute right-0 p-2 text-muted hover:text-text opacity-0 focus-visible:opacity-100 hover:opacity-100 transition-opacity touch-target"
            style={{ color: textColor }}
          >
            <Edit2 size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
