import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, RotateCcw, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useCropState, type CropSession } from "@/state/cropState";
import { aspectToCss, ratioValue } from "@/utils/ui";

/* The frame is bounded on both axes. Without the width cap a 16:9 artwork on a
   desktop monitor grew to more than a thousand pixels and pushed the controls
   off-screen, which made cropping feel different on every project. */
const FRAME_MAX_WIDTH = "min(46rem, calc(100vw - 3.5rem))";
const FRAME_HEIGHT = "62dvh";
/** Room kept for the hint, the controls, and the window padding. */
const CHROME_HEIGHT = "15rem";

const HUD_VISIBLE_MS = 1100;
const DEFAULT_ZOOM = 1;

const frameWidthFor = (aspectRatio: string) => {
  const ratio = ratioValue(aspectRatio);
  return `min(calc(${FRAME_HEIGHT} * ${ratio}), calc((100dvh - ${CHROME_HEIGHT}) * ${ratio}), ${FRAME_MAX_WIDTH})`;
};

const CropSurface: React.FC<{ session: CropSession }> = ({ session }) => {
  const close = useCropState((state) => state.close);
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    zoom,
    posX,
    posY,
    imageStyle,
    isInteracting,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    resetPlacement,
  } = usePanZoom(
    { zoom: session.zoom, posX: session.posX, posY: session.posY },
    frameRef,
    { interactive: true },
  );

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

  /* ---------- Zoom readout ---------- */
  /* The percentage is only useful while the gesture is happening, so it fades
     out on its own instead of permanently covering a corner of the artwork. */
  const [isZoomHudVisible, setIsZoomHudVisible] = useState(false);
  const hudTimer = useRef<number | undefined>(undefined);
  const lastZoom = useRef(zoom);

  const flashZoomHud = useCallback(() => {
    setIsZoomHudVisible(true);
    window.clearTimeout(hudTimer.current);
    hudTimer.current = window.setTimeout(
      () => setIsZoomHudVisible(false),
      HUD_VISIBLE_MS,
    );
  }, []);

  useEffect(() => {
    if (zoom === lastZoom.current) return;
    lastZoom.current = zoom;
    flashZoomHud();
  }, [zoom, flashZoomHud]);

  useEffect(() => () => window.clearTimeout(hudTimer.current), []);

  const save = () => {
    session.onSave({ zoom, posX, posY });
    close();
  };

  const isDefault =
    Math.abs(zoom - DEFAULT_ZOOM) < 0.005 && posX === 50 && posY === 50;

  return (
    <motion.div
      className="fixed inset-0 z-modal flex items-center justify-center overflow-hidden px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: "linear" }}
    >
      {/* A deep scrim without blur, the standard overlay alpha behind glass:
          cropping belongs to the same material system as every other overlay
          instead of carrying a bespoke extra-dark tint. */}
      <motion.div
        className="immersive-scrim absolute inset-0"
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
        className="relative flex flex-col items-center gap-4 outline-none select-none"
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
        <div className="relative">
          {/* A mat around the crop window: the artwork sits in something, so
              the frame reads as a window you can move the picture behind. */}
          <div
            className="material-card relative p-2.5"
            style={{ borderRadius: "calc(var(--radius-card) + 10px)" }}
          >
            <div
              ref={frameRef}
              className="relative overflow-hidden touch-none bg-black/45"
              style={{
                width: frameWidthFor(session.aspectRatio),
                aspectRatio: aspectToCss(session.aspectRatio),
                borderRadius: "var(--radius-card)",
                boxShadow:
                  "0 0 0 1px rgba(255, 255, 255, 0.24), 0 26px 70px rgba(0, 0, 0, 0.5)",
                cursor: isInteracting ? "grabbing" : "grab",
              }}
              onWheel={flashZoomHud}
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

              {/* The crop ring: a permanent hairline plus four corner brackets,
                  so the window keeps reading as a frame even against flat art. */}
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-150 ${
                  isInteracting ? "opacity-100" : "opacity-90"
                }`}
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <span
                  className="absolute inset-0"
                  style={{
                    borderRadius: "var(--radius-card)",
                    boxShadow:
                      "inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 0 0 2px rgba(0, 0, 0, 0.22)",
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
                    className={`absolute h-6 w-6 border-white/95 ${corner}`}
                    style={{
                      filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6))",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Zoom readout, pinned above the mat and out of the artwork's way. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2"
          >
            <AnimatePresence>
              {isZoomHudVisible && (
                <motion.span
                  initial={{ opacity: 0, y: 4, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -2, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="inline-flex h-8 items-center rounded-full material-popover px-3.5
                             text-caption-1 font-semibold tabular-nums text-text"
                >
                  {Math.round(zoom * 100)}%
                </motion.span>
              )}
            </AnimatePresence>
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
            aria-label="Reset framing"
            title="Reset framing"
            icon={<RotateCcw size={18} strokeWidth={2.3} />}
            onClick={resetPlacement}
            disabled={isDefault}
            className="material-thin"
          />
          <Button
            variant="gray"
            size="lg"
            shape="pill"
            iconOnly
            aria-label="Cancel crop"
            title="Cancel"
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
            title="Save"
            icon={<Check size={19} strokeWidth={2.6} />}
            onClick={save}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * The crop overlay. Rendered once at the app root and driven by `useCropState`,
 * so every project type shares one framing experience.
 */
export const CropOverlay: React.FC = () => {
  const session = useCropState((state) => state.session);

  return createPortal(
    <AnimatePresence>
      {session && <CropSurface key={session.id} session={session} />}
    </AnimatePresence>,
    document.body,
  );
};
