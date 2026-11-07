import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useAdjustState, type AdjustSession } from "@/state/adjustState";
import { aspectToCss } from "@/utils/ui";

/** Height budget for the frame; its width follows the project's ratio. */
const FRAME_HEIGHT = "62dvh";

const ratioOf = (aspectRatio: string): number => {
  const [width, height] = aspectRatio.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 3 / 4;
};

const Studio: React.FC<{ session: AdjustSession }> = ({ session }) => {
  const close = useAdjustState((state) => state.close);
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    zoom,
    posX,
    posY,
    imageStyle,
    isAdjustDragging,
    startAdjusting,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = usePanZoom(
    { zoom: session.zoom, posX: session.posX, posY: session.posY },
    frameRef,
  );

  /* The hook only routes wheel and pinch input while adjusting, and the
     studio is always adjusting: enter the mode once, for the whole visit. */
  useEffect(() => {
    startAdjusting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusTrap(panelRef, true, { autoFocus: false });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  const save = () => {
    session.onSave({ zoom, posX, posY });
    close();
  };

  return (
    <motion.div
      className="fixed inset-0 z-modal flex items-center justify-center overflow-hidden px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: "linear" }}
    >
      <motion.div
        className="absolute inset-0 backdrop-blur-xl"
        style={{ background: "rgba(0, 0, 0, 0.78)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12, ease: "linear" }}
        onClick={close}
      />

      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Crop and adjust image"
        className="relative flex flex-col items-center gap-3.5 outline-none select-none"
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{
          opacity: 0,
          scale: 0.98,
          y: 2,
          transition: { duration: 0.15, ease: "easeIn" },
        }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          ref={frameRef}
          className="relative overflow-hidden squircle touch-none bg-surface-secondary"
          style={{
            width: `min(calc(${FRAME_HEIGHT} * ${ratioOf(
              session.aspectRatio,
            )}), calc(100vw - 2rem))`,
            aspectRatio: aspectToCss(session.aspectRatio),
            borderRadius: "var(--radius-card)",
            boxShadow:
              "0 30px 90px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.16)",
            cursor: isAdjustDragging ? "grabbing" : "grab",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <RemoteImage
            src={session.imageSrc}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full pointer-events-none"
            style={imageStyle}
          />

          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-150 ${
              isAdjustDragging ? "opacity-100" : "opacity-75"
            }`}
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <span
              className="absolute inset-0"
              style={{
                borderRadius: "var(--radius-card)",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.35)",
              }}
            />
            {[
              "top-2.5 left-2.5 border-t-2 border-l-2 rounded-tl-lg",
              "top-2.5 right-2.5 border-t-2 border-r-2 rounded-tr-lg",
              "bottom-2.5 left-2.5 border-b-2 border-l-2 rounded-bl-lg",
              "bottom-2.5 right-2.5 border-b-2 border-r-2 rounded-br-lg",
            ].map((corner) => (
              <span
                key={corner}
                className={`absolute h-5 w-5 border-white/90 ${corner}`}
                style={{
                  filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55))",
                }}
              />
            ))}
          </div>
        </div>

        <p className="text-caption-1 font-medium text-muted">
          Drag to reposition, scroll or pinch to zoom
        </p>

        <div className="flex items-center gap-3">
          <Button
            variant="gray"
            size="lg"
            shape="pill"
            iconOnly
            aria-label="Cancel crop"
            icon={<X size={19} strokeWidth={2.4} />}
            onClick={close}
            className="material-thin"
          />
          <Button
            variant="filled"
            size="lg"
            shape="pill"
            iconOnly
            aria-label="Save crop"
            icon={<Check size={19} strokeWidth={2.6} />}
            onClick={save}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * The crop studio. Rendered once at the app root and driven by
 * `useAdjustState`, so every project type shares one framing experience.
 */
export const AdjustStudio: React.FC = () => {
  const session = useAdjustState((state) => state.session);

  return createPortal(
    <AnimatePresence>
      {session && <Studio key={session.id} session={session} />}
    </AnimatePresence>,
    document.body,
  );
};
