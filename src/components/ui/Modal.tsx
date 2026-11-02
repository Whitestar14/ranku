import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Rows and bars that draw their own dividers and padding. */
  footerFlush?: boolean;
  /**
   * `action` is the compact alert/sheet used for confirmations. It is narrower,
   * keeps its title inside the body instead of a raised header, and its footer
   * is always flush so the actions read as one block.
   */
  variant?: "panel" | "action";
  /** Compact alerts can share the panel's own entrance. */
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  headerAction?: React.ReactNode;
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  footerFlush = false,
  variant = "panel",
  ariaLabel,
  className,
  contentClassName,
  headerAction,
  showClose = false,
}) => {
  const isAction = variant === "action";
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        /* The direct child of AnimatePresence must be the motion element;
           otherwise the shell unmounts immediately and the panel's exit never
           gets a frame to run. */
        <motion.div
          key="modal-shell"
          className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6 overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "linear" }}
            className="absolute inset-0 bg-overlay"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? title}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.98,
              y: 2,
              transition: {
                duration: 0.15,
                ease: "easeIn",
              },
            }}
            transition={{
              duration: 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "relative w-full max-h-[85dvh] flex flex-col overflow-hidden outline-none",
              "material-thick squircle rounded-panel",
              isAction ? "max-w-70" : "max-w-100",
              className,
            )}
          >
            {title &&
              (isAction ? (
                <div className="relative shrink-0 px-3 pt-5 pb-1 text-center">
                  <h2 className="text-body font-semibold text-text leading-tight">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-1 text-footnote text-muted leading-snug">
                      {description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative shrink-0 px-12 pb-3 pt-4 text-center border-b border-hairline">
                  <h2 className="text-headline font-semibold text-text truncate">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-0.5 text-footnote text-muted leading-snug">
                      {description}
                    </p>
                  )}
                  {headerAction && (
                    <div className="absolute right-3 top-2.5 flex items-center">
                      {headerAction}
                    </div>
                  )}
                  {showClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="absolute left-2 top-2 flex items-center justify-center w-8 h-8 rounded-full
                                 text-muted hover:text-text hover:bg-hover transition-colors touch-target"
                    >
                      <X className="w-4 h-4" strokeWidth={2.4} />
                    </button>
                  )}
                </div>
              ))}

            {children != null && (
              <div
                className={cn(
                  isAction ? "px-5 pb-4" : "px-5 py-4",
                  "overflow-y-auto scrollbar-ios",
                  contentClassName,
                )}
              >
                {children}
              </div>
            )}

            {footer &&
              (isAction || footerFlush ? (
                <div className="shrink-0 pt-3">{footer}</div>
              ) : (
                <div className="shrink-0 border-t border-hairline px-4 py-3 flex flex-col gap-2">
                  {footer}
                </div>
              ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
