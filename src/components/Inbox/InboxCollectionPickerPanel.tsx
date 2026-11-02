import React from "react";
import {
  ArrowLeft,
  Check,
  Edit2,
  FolderPlus,
  Package,
} from "lucide-react";
import type { InboxCollection } from "@/types";

export interface InboxCollectionPickerPanelProps {
  collections: InboxCollection[];
  lastTargetCollectionId?: string;
  editingNameId: string | null;
  tempName: string;
  onBack: () => void;
  onPickCollection: (colId: string) => void;
  onAddCollection: () => void;
  onStartRename: (id: string, name: string) => void;
  onTempNameChange: (v: string) => void;
  onCommitRename: (colId: string) => void;
  onCancelRename: () => void;
}

export const InboxCollectionPickerPanel: React.FC<
  InboxCollectionPickerPanelProps
> = ({
  collections,
  lastTargetCollectionId,
  editingNameId,
  tempName,
  onBack,
  onPickCollection,
  onAddCollection,
  onStartRename,
  onTempNameChange,
  onCommitRename,
  onCancelRename,
}) => (
  <div className="absolute inset-0 z-20 flex flex-col animate-in fade-in slide-in-from-right-3 bg-background/35">
    <header className="flex items-center gap-1 pl-1 pr-4 h-12 shrink-0 border-b border-hairline">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to search"
        className="grid place-items-center w-9 h-9 rounded-full text-primary hover:bg-hover transition-colors touch-target"
      >
        <ArrowLeft size={19} />
      </button>
      <h3 className="text-headline font-semibold text-text">Add to collection</h3>
    </header>

    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-ios px-4 pt-3 pb-6">
      <div className="material-card rounded-card overflow-hidden">
        {collections.map((col, i) => {
          const isEditing = editingNameId === col.id;
          const isRecent = col.id === lastTargetCollectionId;
          const count = col.items?.length ?? 0;

          return (
            <div
              key={col.id}
              className={isEditing ? "" : "hover:bg-hover"}
              style={
                i < collections.length - 1
                  ? { borderBottom: "0.5px solid var(--color-divider)" }
                  : undefined
              }
            >
              {isEditing ? (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid place-items-center w-8 h-8 rounded-chip squircle bg-surface-secondary text-muted shrink-0">
                    <Package size={15} strokeWidth={2.2} />
                  </span>
                  <input
                    autoFocus
                    type="text"
                    value={tempName}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => onTempNameChange(e.target.value)}
                    onBlur={() => onCommitRename(col.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") onCancelRename();
                    }}
                    aria-label="Collection name"
                    className="flex-1 min-w-0 h-8 px-2 rounded-chip bg-background text-subheadline
                               font-semibold text-text outline-none focus-visible:focus-ring"
                  />
                </div>
              ) : (
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onPickCollection(col.id)}
                    className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-1 py-2.5 text-left"
                  >
                    <span
                      className="grid place-items-center w-8 h-8 rounded-chip squircle shrink-0"
                      style={{
                        backgroundColor: isRecent
                          ? "color-mix(in srgb, var(--color-primary) 16%, transparent)"
                          : "var(--color-surface-secondary)",
                        color: isRecent
                          ? "var(--color-primary)"
                          : "var(--color-muted)",
                      }}
                    >
                      <Package size={15} strokeWidth={2.2} />
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-subheadline font-semibold text-text">
                        {col.name}
                      </span>
                      <span className="block text-caption-1 text-muted">
                        {count} {count === 1 ? "image" : "images"}
                        {isRecent && (
                          <span className="text-primary"> · Last used</span>
                        )}
                      </span>
                    </span>

                    <span
                      className="grid place-items-center w-5 h-5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isRecent
                          ? "var(--color-accent-blue)"
                          : "transparent",
                        boxShadow: isRecent
                          ? undefined
                          : "inset 0 0 0 1.5px var(--material-hairline)",
                      }}
                    >
                      {isRecent && (
                        <Check size={11} strokeWidth={3.4} color="#fff" />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Rename ${col.name}`}
                    onClick={() => onStartRename(col.id, col.name)}
                    className="shrink-0 grid place-items-center w-11 text-muted
                               hover:text-text transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAddCollection}
          className="w-full flex items-center gap-3 pl-3 pr-1 py-3 text-left border-t border-hairline
                     hover:bg-hover transition-colors"
        >
          <span className="grid place-items-center w-8 h-8 rounded-chip shrink-0 border border-dashed border-border text-muted">
            <FolderPlus size={15} />
          </span>
          <span className="text-subheadline font-medium text-text">
            New collection
          </span>
        </button>
      </div>
    </div>
  </div>
);
