import { useCallback } from "react";
import { deleteProjects, useStore } from "@/store/useStore";
import type { ConfirmToggle } from "@/state/modalState";
import { exclusiveProjectImages } from "@/utils/storeUtils";

export type RequestConfirm = (
  title: string,
  message: string,
  action: (checked: boolean) => void,
  toggle?: ConfirmToggle,
) => void;

export function useProjectDeletion(requestConfirm: RequestConfirm) {
  const ranks = useStore((s) => s.ranks);

  return useCallback(
    (ids: string[]) => {
      const titles = ids
        .map((id) => ranks[id]?.title)
        .filter((title): title is string => !!title);
      if (titles.length === 0) return;

      const one = titles.length === 1;
      const purgeable = exclusiveProjectImages(ranks, ids).length;

      requestConfirm(
        one ? "Delete project?" : `Delete ${titles.length} projects?`,
        one
          ? `“${titles[0]}” and its layout will be removed.`
          : `${titles.length} projects and their layouts will be removed.`,
        (purgeLibrary) => deleteProjects(ids, purgeLibrary),
        purgeable > 0
          ? {
              label: one
                ? "Also delete its images from the Library?"
                : "Also delete their images from the Library?",
              hint: `${purgeable} ${
                purgeable === 1 ? "image" : "images"
              } will be removed.`,
              defaultOn: false,
            }
          : undefined,
      );
    },
    [ranks, requestConfirm],
  );
}
