import { GlobalState, CellData, InboxItem, Rank } from "@/types";

export const isUntouchedWorkspace = (
  state: Pick<GlobalState, "ranks" | "inbox">,
): boolean => {
  const rankIds = Object.keys(state.ranks ?? {});
  if (rankIds.length !== 1) return false;

  const rank = state.ranks[rankIds[0]];
  if (!rank) return false;

  const boardEmpty =
    rank.type === "tierlist"
      ? rank.tierRows.every((row) => row.items.length === 0)
      : rank.cells.every((cell) => !cell.imageSrc);

  const inboxEmpty = (state.inbox?.collections ?? []).every(
    (col) => col.items.length === 0,
  );

  return boardEmpty && inboxEmpty;
};

/** The collection a new item should land in, given the inbox's current view. */
export const targetCollectionId = (inbox: GlobalState["inbox"]): string => {
  if (inbox.activeCollectionId !== "all-images") {
    return inbox.activeCollectionId;
  }
  return inbox.lastTargetCollectionId ?? inbox.collections[0]?.id ?? "";
};

/** The project a state should open on */
export const resolveActiveRankId = (
  ranks: Record<string, Rank>,
  activeRankId: string,
): string => {
  if (ranks[activeRankId]) return activeRankId;
  const newest = Object.values(ranks).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )[0];
  return newest?.id ?? "";
};

/** Collision-resistant id for a stored entity. */
export const createId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createInboxItem = (imageSrc: string): InboxItem => ({
  id: createId("inbox"),
  imageSrc,
  createdAt: Date.now(),
});

/**
 * Images that were only ever on the board (a URL import, a paste) are filed
 * into the library when their last copy leaves it, rather than evaporating.
 */
export const checkAndRescueImages = (
  removedCells: (CellData | InboxItem)[],
  currentState: Pick<GlobalState, "inbox">,
) => {
  const allKnownImages = new Set<string>();
  currentState.inbox.collections.forEach((col) =>
    col.items.forEach((item) => allKnownImages.add(item.imageSrc)),
  );
  const rescueItems: InboxItem[] = [];
  removedCells.forEach((cell) => {
    if (cell.imageSrc && !allKnownImages.has(cell.imageSrc)) {
      rescueItems.push(createInboxItem(cell.imageSrc));
    }
  });
  return rescueItems;
};

/** Duplicate detection is per collection, so the same poster can live in two. */
export const isImageTracked = (
  inbox: GlobalState["inbox"],
  imageSrc: string,
  collectionId: string = targetCollectionId(inbox),
): boolean => {
  const collection = inbox.collections.find((c) => c.id === collectionId);
  return !!collection?.items.some((item) => item.imageSrc === imageSrc);
};

export const trackImage = (
  inbox: GlobalState["inbox"],
  imageSrc: string,
): boolean => {
  if (!imageSrc) return false;
  const collection =
    inbox.collections.find((c) => c.id === targetCollectionId(inbox)) ??
    inbox.collections[0];
  if (!collection || isImageTracked(inbox, imageSrc, collection.id)) {
    return false;
  }
  collection.items.unshift(createInboxItem(imageSrc));
  return true;
};

export const findInboxItem = (
  inbox: GlobalState["inbox"],
  itemId: string,
  sourceColId: string,
): InboxItem | undefined => {
  const collections = inbox.collections;
  if (sourceColId === "all" || sourceColId === "all-images") {
    for (const col of collections) {
      const item = col.items.find((i) => i.id === itemId);
      if (item) return item;
    }
  } else {
    return collections
      .find((c) => c.id === sourceColId)
      ?.items.find((i) => i.id === itemId);
  }
  return undefined;
};

export const findInboxItems = (
  inbox: GlobalState["inbox"],
  itemIds: string[],
  sourceColId: string,
): InboxItem[] => {
  if (sourceColId === "all" || sourceColId === "all-images") {
    return inbox.collections
      .flatMap((c) => c.items)
      .filter((i) => itemIds.includes(i.id));
  } else {
    const col = inbox.collections.find((c) => c.id === sourceColId);
    return col ? col.items.filter((i) => itemIds.includes(i.id)) : [];
  }
};

/** Every poster a project shows, across both board shapes. */
export const projectImageSources = (rank: Rank): string[] => {
  const sources: string[] = [];
  rank.cells.forEach((cell) => {
    if (cell.imageSrc) sources.push(cell.imageSrc);
  });
  rank.tierRows.forEach((row) => {
    row.items.forEach((item) => {
      if (item.imageSrc) sources.push(item.imageSrc);
    });
  });
  return sources;
};

/**
 * The posters that would leave the Library if these projects were deleted.
 * Anything another project still shows is left alone.
 */
export const exclusiveProjectImages = (
  ranks: Record<string, Rank>,
  ids: string[],
): string[] => {
  const doomed = new Set(ids.filter((id) => ranks[id]));
  if (doomed.size === 0) return [];

  const doomedSources = new Set<string>();
  const keptSources = new Set<string>();
  Object.entries(ranks).forEach(([id, rank]) => {
    const into = doomed.has(id) ? doomedSources : keptSources;
    projectImageSources(rank).forEach((src) => into.add(src));
  });

  return [...doomedSources].filter((src) => !keptSources.has(src));
};

export const newTierRowId = () => createId("tier");

/**
 * Reshapes the cell array for a new grid size while keeping every image in
 * the row and column it was already in. Slicing the array instead reflowed
 * positions: shrinking 5 columns to 4 moved row 1's last tile onto row 2.
 */
export const resizeCells = (
  cells: CellData[],
  cols: number,
  nextRows: number,
  nextCols: number,
): CellData[] => {
  const total = nextRows * nextCols;
  const next: CellData[] = Array.from({ length: total }, (_, index) => ({
    id: createId("cell"),
    imageSrc: null,
    position: index,
  }));

  cells.forEach((cell, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    if (row >= nextRows || col >= nextCols) return;
    const target = row * nextCols + col;
    next[target] = { ...cell, position: target };
  });

  return next;
};

export const ensureCells = (cells: CellData[], toIndex: number) => {
  while (cells.length <= toIndex) {
    cells.push({
      id: createId("cell"),
      imageSrc: null,
      position: cells.length,
    });
  }
};
