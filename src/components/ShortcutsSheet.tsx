import React from "react";
import { Modal } from "@/components/ui/Modal";
import { PixelText } from "@/components/pixel/PixelText";
import { isPixelText } from "@/components/pixel/pixelFont";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface Shortcut {
  keys: string[];
  label: string;
}

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: "Anywhere",
    items: [
      { keys: ["⌘", "/"], label: "This sheet" },
      { keys: ["⌘", "B"], label: "Toggle settings rail" },
      { keys: ["⌘", "D"], label: "Open or close the dock" },
      { keys: ["⌘", "Z"], label: "Undo" },
      { keys: ["⇧", "⌘", "Z"], label: "Redo" },
      { keys: ["⌘", "V"], label: "Paste an image" },
      { keys: ["⌘", "E"], label: "Export this project" },
    ],
  },
  {
    title: "The board",
    items: [
      { keys: ["↑", "↓", "←", "→"], label: "Move selection" },
      { keys: ["⌘", "+"], label: "Larger tiles" },
      { keys: ["⌘", "−"], label: "Smaller tiles" },
      { keys: ["double-click"], label: "Replace a tile's image" },
      { keys: ["⌘", "C"], label: "Copy tile image" },
      { keys: ["⌘", "V"], label: "Paste into tile" },
      { keys: ["⌫"], label: "Remove tile image" },
    ],
  },
  {
    title: "Lists and tiers",
    items: [
      { keys: ["↑", "↓"], label: "Move selection" },
      { keys: ["⌫"], label: "Remove item" },
      { keys: ["Enter"], label: "Open tile menu" },
      { keys: ["Esc"], label: "Clear selection" },
    ],
  },
];

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const glyph =
    typeof children === "string" &&
    [...children].length === 1 &&
    isPixelText(children)
      ? children
      : null;

  return (
    <kbd
      className="inline-grid place-items-center min-w-6 h-6 px-1.5 rounded-hairline
                 material-thin text-caption-1 font-medium text-text tabular-nums"
    >
      {glyph ? <PixelText text={glyph} height={14} /> : children}
    </kbd>
  );
};

export const ShortcutsSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Keyboard"
    className="max-w-md"
    contentClassName="p-0"
    headerAction={
      <button
        type="button"
        onClick={onClose}
        className="px-3 h-9 rounded-control text-body font-semibold text-primary
                   hover:bg-hover transition-colors duration-150"
      >
        Done
      </button>
    }
  >
    <div className="px-4 py-4 flex flex-col gap-6">
      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <SectionLabel as="h3" className="px-1">
            {group.title}
          </SectionLabel>
          <div className="material-card rounded-card overflow-hidden divide-y divide-hairline">
            {group.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <span className="text-subheadline text-text">{item.label}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {item.keys.map((k) => (
                    <Key key={k}>{k}</Key>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  </Modal>
);
