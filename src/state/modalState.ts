import { create } from "zustand";

/** An opt-in extra carried by a confirmation, e.g. purging the library. */
export interface ConfirmToggle {
  label: string;
  hint?: string;
  defaultOn?: boolean;
}

/** Visibility flags for the app's dialogs, and the confirm sheet's request */
interface ConfirmRequest {
  isOpen: boolean;
  title: string;
  message: string;
  toggle?: ConfirmToggle;
  onConfirm: (checked: boolean) => void;
}

interface ModalState {
  isExportOpen: boolean;
  isAboutOpen: boolean;
  confirm: ConfirmRequest;

  openExport: () => void;
  closeExport: () => void;
  openAbout: () => void;
  closeAbout: () => void;

  requestConfirm: (
    title: string,
    message: string,
    action: (checked: boolean) => void,
    toggle?: ConfirmToggle,
  ) => void;
  closeConfirm: () => void;
}

const emptyConfirm: ConfirmRequest = {
  isOpen: false,
  title: "",
  message: "",
  onConfirm: () => {},
};

export const useModalState = create<ModalState>((set) => ({
  isExportOpen: false,
  isAboutOpen: false,
  confirm: emptyConfirm,

  openExport: () => set({ isExportOpen: true }),
  closeExport: () => set({ isExportOpen: false }),
  openAbout: () => set({ isAboutOpen: true }),
  closeAbout: () => set({ isAboutOpen: false }),

  requestConfirm: (title, message, action, toggle) =>
    set({
      confirm: {
        isOpen: true,
        title,
        message,
        toggle,
        onConfirm: (checked) => {
          action(checked);
          set({ confirm: emptyConfirm });
        },
      },
    }),
  closeConfirm: () => set({ confirm: emptyConfirm }),
}));
