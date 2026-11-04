import { useMemo } from "react";
import { useStore } from "@/store/useStore";

const SEPARATOR = "\u0000";

/**
 * Derived sets for inbox search checkmarks and stash gray-out.
 * The board side subscribes to the image sources only, so resizing, editing a
 * title or anything else that rebuilds the rank does not recompute them.
 */
export function useImagePresenceSets() {
  const collections = useStore((s) => s.inbox.collections);

  const boardSources = useStore((s) => {
    const rank = s.ranks[s.activeRankId];
    if (!rank) return "";
    const items =
      rank.type === "tierlist" ? rank.tierRows.flatMap((r) => r.items) : rank.cells;
    return items
      .map((item) => item.imageSrc ?? "")
      .filter(Boolean)
      .join(SEPARATOR);
  });

  return useMemo(() => {
    const inboxImageSet = new Set<string>();
    collections.forEach((collection) =>
      collection.items.forEach((item) => inboxImageSet.add(item.imageSrc)),
    );

    const boardImageSet = new Set<string>(
      boardSources ? boardSources.split(SEPARATOR) : [],
    );

    return { inboxImageSet, boardImageSet };
  }, [collections, boardSources]);
}
