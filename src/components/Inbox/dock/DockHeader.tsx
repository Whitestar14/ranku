import React from "react";
import { ChevronDown } from "lucide-react";
import { PixelText } from "@/components/pixel/PixelText";

export const DockHeader: React.FC<{
  title: string;
  onCollapse: () => void;
  /** Trailing controls, e.g. the Library's Stash/Search switch. */
  children?: React.ReactNode;
}> = ({ title, onCollapse, children }) => (
  <div className="h-12 flex items-center justify-between gap-3 pl-5 pr-1 sm:pr-2 select-none shrink-0 border-b border-hairline">
    <div
      className="flex flex-1 items-center gap-4 min-w-0 cursor-pointer"
      onClick={onCollapse}
    >
      <span className="min-w-0 flex-1 overflow-hidden" title={title}>
        <PixelText text={title} height={14} fit className="text-text block" />
      </span>
      {children}
    </div>

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCollapse();
      }}
      className="text-muted hover:text-text transition-colors p-1.5 rounded-full hover:bg-hover shrink-0"
      title="Collapse dock"
      aria-label="Collapse dock"
    >
      <ChevronDown size={19} />
    </button>
  </div>
);
