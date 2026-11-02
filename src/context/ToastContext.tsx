import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createId } from "@/utils/storeUtils";
import { ToastContainer, ToastMessage, ToastType } from "@/components/ui/Toast";

const MAX_VISIBLE_TOASTS = 3;

type AddToast = (
  type: ToastType,
  message: string,
  actionLabel?: string,
  action?: () => void,
) => void;

const ToastContext = createContext<AddToast | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  /* Toasts raised in the same tick still need distinct ids to dismiss. */
  const nextId = useRef(0);

  const addToast = useCallback<AddToast>(
    (type, message, actionLabel, action) => {
      nextId.current += 1;
      const id = createId(`toast-${nextId.current}`);
      setToasts((prev) =>
        [...prev, { id, type, message, actionLabel, action }].slice(
          -MAX_VISIBLE_TOASTS,
        ),
      );
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export function useToast(): AddToast {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
