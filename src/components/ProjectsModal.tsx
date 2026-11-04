import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PopoverMenu } from "@/components/ui/PopoverMenu";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PROJECT_TYPES, projectTypeMeta } from "@/constants/projectTypes";
import { Rank, ProjectType } from "@/types";

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ranks: Rank[];
  activeRankId: string;
  onSelectRank: (id: string) => void;
  onDeleteRank: (id: string) => void;
  /** Bulk variant; the caller confirms once and applies each id. */
  onDeleteRanks: (ids: string[]) => void;
  onNewRank: (type: ProjectType) => void;
  onUpdateRank: (id: string, updates: Partial<Rank>) => void;
}

function formatProjectDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((now.getTime() - date.getTime()) / msPerDay);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  ranks,
  activeRankId,
  onSelectRank,
  onDeleteRank,
  onDeleteRanks,
  onNewRank,
  onUpdateRank,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingId(null);
    setMenu(null);
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, [isOpen]);

  /* Deleting from the list must not leave a selection pointing at nothing. */
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(ranks.map((rank) => rank.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [ranks]);

  /* Creation order, newest first. Editing a project changes `updatedAt` on
     every keystroke; sorting by that made the list reshuffle under the user. */
  const sorted = useMemo(
    () => [...ranks].sort((a, b) => b.createdAt - a.createdAt),
    [ranks],
  );

  const startEditing = (rank: Rank) => {
    setMenu(null);
    setEditingId(rank.id);
    setEditTitle(rank.title);
    requestAnimationFrame(() => editRef.current?.select());
  };

  const commitEditing = () => {
    if (!editingId) return;
    const title = editTitle.trim();
    if (title) onUpdateRank(editingId, { title });
    setEditingId(null);
  };

  const canDelete = ranks.length > 1;
  const selectedCount = selectedIds.size;
  const allSelected = sorted.length > 0 && selectedCount === sorted.length;
  const canBulkDelete = selectedCount > 0 && selectedCount < ranks.length;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelection = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const enterSelection = () => {
    setMenu(null);
    setEditingId(null);
    setIsSelecting(true);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      allSelected ? new Set() : new Set(sorted.map((rank) => rank.id)),
    );
  };

  const deleteSelected = () => {
    if (!canBulkDelete) return;
    onDeleteRanks([...selectedIds]);
    exitSelection();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Projects"
      className="max-w-lg"
      contentClassName="p-0 flex flex-col min-h-0"
      footer={
        isSelecting ? (
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-footnote text-muted">
              {selectedCount === 0
                ? "Select projects to delete"
                : `${selectedCount} selected`}
              {selectedCount === ranks.length && ` · keep at least one project`}
            </span>
            <Button
              variant="danger"
              size="sm"
              icon={<PixelIcon name="trash" size={15} />}
              disabled={!canBulkDelete}
              onClick={deleteSelected}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
      headerAction={
        <Button
          variant="plain"
          size="md"
          onClick={onClose}
          className="px-3 text-body"
        >
          Done
        </Button>
      }
    >
      <div className="flex-1 overflow-y-auto scrollbar-ios min-h-0 px-4 pt-4 pb-6">
        <SectionLabel className="mb-2">New Project</SectionLabel>

        <div className="grid grid-cols-3 gap-2">
          {PROJECT_TYPES.map(({ type, label, hint, icon: Icon, tint }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onNewRank(type);
                onClose();
              }}
              className="group flex flex-col items-center gap-2 px-2 py-4 rounded-card
                         material-card hover:bg-hover active:opacity-80
                         transition-[background-color,opacity] duration-150 text-center
                         outline-none focus-visible:focus-ring"
            >
              <span
                className="grid place-items-center w-9 h-9 rounded-chip squircle
                           transition-transform duration-200 ease-spring
                           group-hover:scale-110 group-active:scale-95"
                style={{
                  backgroundColor: `color-mix(in srgb, ${tint} 18%, transparent)`,
                  color: tint,
                }}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0 w-full">
                <span className="text-subheadline font-semibold text-text leading-tight">
                  {label}
                </span>
                <span className="text-caption-1 text-muted leading-tight">
                  {hint}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 mb-2 flex items-center justify-between gap-2">
          <SectionLabel>Projects</SectionLabel>
          {sorted.length > 1 && (
            <div className="flex items-center gap-1">
              {isSelecting && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-2 h-7 rounded-chip text-caption-1 font-semibold text-muted
                             hover:text-text hover:bg-hover transition-colors"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              )}
              <button
                type="button"
                onClick={isSelecting ? exitSelection : enterSelection}
                className="px-2 h-7 rounded-chip text-footnote font-semibold text-primary
                           hover:bg-hover transition-colors"
              >
                {isSelecting ? "Cancel" : "Select"}
              </button>
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted gap-3">
            <LayoutGrid size={36} strokeWidth={1.2} className="opacity-50" />
            <span className="text-subheadline">No projects yet</span>
          </div>
        ) : (
          <ul className="material-card rounded-card overflow-hidden">
            <AnimatePresence initial={false}>
              {sorted.map((rank, i) => {
                const meta = projectTypeMeta(rank.type);
                const Icon = meta.icon;
                const isActive = rank.id === activeRankId;
                const isEditing = editingId === rank.id;
                const isSelected = selectedIds.has(rank.id);

                return (
                  <motion.li
                    key={rank.id}
                    layout
                    initial={false}
                    exit={{
                      opacity: 0,
                      height: 0,
                      transition: {
                        duration: 0.16,
                        ease: [0.32, 0.72, 0, 1],
                      },
                    }}
                    className={`group/row relative flex items-stretch overflow-hidden
                               ${isSelected ? "bg-primary/10" : "hover:bg-hover focus-within:bg-hover"}`}
                    style={
                      i < sorted.length - 1
                        ? { borderBottom: "0.5px solid var(--color-divider)" }
                        : undefined
                    }
                  >
                    {isEditing ? (
                      <div className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 py-3">
                        <span
                          className="grid place-items-center w-8 h-8 rounded-chip squircle shrink-0"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`,
                            color: meta.tint,
                          }}
                        >
                          <Icon size={16} strokeWidth={2.2} />
                        </span>
                        <input
                          ref={editRef}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={commitEditing}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEditing();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          aria-label={`Rename ${rank.title}`}
                          className="flex-1 min-w-0 h-7 px-2 rounded-chip bg-surface-secondary
                                     text-text text-subheadline font-semibold outline-none
                                     focus-visible:focus-ring"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelecting) {
                            toggleSelected(rank.id);
                            return;
                          }
                          onSelectRank(rank.id);
                          onClose();
                        }}
                        aria-current={isActive || undefined}
                        aria-pressed={isSelecting ? isSelected : undefined}
                        className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 py-3 text-left
                                   outline-none focus-visible:focus-ring"
                      >
                        <span
                          className="grid place-items-center w-8 h-8 rounded-chip squircle shrink-0"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`,
                            color: meta.tint,
                          }}
                        >
                          <Icon size={16} strokeWidth={2.2} />
                        </span>

                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`truncate text-subheadline font-semibold ${
                                isSelecting && isActive
                                  ? "text-primary"
                                  : "text-text"
                              }`}
                            >
                              {rank.title}
                            </span>
                            {isActive && !isSelecting && (
                              <span
                                className="grid place-items-center w-4 h-4 rounded-full shrink-0"
                                style={{
                                  backgroundColor: "var(--color-primary)",
                                }}
                              >
                                <Check
                                  size={10}
                                  strokeWidth={3.4}
                                  style={{ color: "var(--color-on-accent)" }}
                                />
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5 text-caption-1 text-muted mt-0.5">
                            <span>{meta.label}</span>
                            <span aria-hidden>·</span>
                            <span>{formatProjectDate(rank.updatedAt)}</span>
                          </span>
                        </span>

                        {isSelecting && (
                          <span
                            aria-hidden
                            className={`grid place-items-center w-5 h-5 shrink-0 rounded-full border
                              transition-colors duration-150 ${
                                isSelected
                                  ? "border-primary bg-primary text-on-accent"
                                  : "border-hairline text-transparent"
                              }`}
                          >
                            <Check size={11} strokeWidth={3.2} />
                          </span>
                        )}
                      </button>
                    )}

                    {!isSelecting && (
                      <button
                        type="button"
                        aria-label={`Options for ${rank.title}`}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setMenu({
                            id: rank.id,
                            x: r.left + r.width / 2,
                            y: r.bottom + 4,
                          });
                        }}
                        className={`shrink-0 grid place-items-center w-11 transition-colors duration-150
                                    outline-none focus-visible:focus-ring
                                    ${
                                      menu?.id === rank.id
                                        ? "text-text"
                                        : "text-muted group-hover/row:text-text"
                                    }`}
                      >
                        <MoreHorizontal size={17} strokeWidth={2.2} />
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <PopoverMenu
        isOpen={!!menu}
        onClose={() => setMenu(null)}
        ariaLabel="Project actions"
        triggerPoint={menu ? { x: menu.x, y: menu.y } : null}
        actions={[
          {
            label: "Rename",
            icon: Pencil,
            onClick: () => {
              const rank = ranks.find((r) => r.id === menu?.id);
              if (rank) startEditing(rank);
            },
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            disabled: !canDelete,
            hint: canDelete ? undefined : "Last project can't be deleted",
            onClick: () => {
              if (canDelete && menu) onDeleteRank(menu.id);
            },
          },
        ]}
      />
    </Modal>
  );
};
