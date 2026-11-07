import { create } from "zustand";

/** The crop the tile renderer stores: zoom scale plus object-position. */
export interface AdjustPlacement {
  zoom: number;
  posX: number;
  posY: number;
}

export interface AdjustSession extends AdjustPlacement {
  /** Identifies this opening, so the studio remounts on a different artwork. */
  id: number;
  imageSrc: string;
  /** The frame the artwork is seen through, e.g. "3:4". */
  aspectRatio: string;
  /** Called once, with the settled placement, when the check is pressed. */
  onSave: (placement: AdjustPlacement) => void;
}

interface AdjustState {
  session: AdjustSession | null;
  open: (session: Omit<AdjustSession, "id">) => void;
  close: () => void;
}

let nextId = 1;

export const useAdjustState = create<AdjustState>((set) => ({
  session: null,
  open: (session) => set({ session: { ...session, id: nextId++ } }),
  close: () => set((state) => (state.session ? { session: null } : state)),
}));
