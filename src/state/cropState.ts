import { create } from "zustand";

/**
 * The framing the tile renderer stores: zoom scale plus object-position.
 * "Crop" is the product-facing name for the same placement.
 */
export interface CropPlacement {
  zoom: number;
  posX: number;
  posY: number;
}

export interface CropSession extends CropPlacement {
  /** Identifies this opening, so the overlay remounts on a different artwork. */
  id: number;
  imageSrc: string;
  /** The frame the artwork is seen through, e.g. "3:4". */
  aspectRatio: string;
  /** Called once, with the settled placement, when the check is pressed. */
  onSave: (placement: CropPlacement) => void;
}

interface CropState {
  session: CropSession | null;
  open: (session: Omit<CropSession, "id">) => void;
  close: () => void;
}

let nextId = 1;

export const useCropState = create<CropState>((set) => ({
  session: null,
  open: (session) => set({ session: { ...session, id: nextId++ } }),
  close: () => set((state) => (state.session ? { session: null } : state)),
}));
