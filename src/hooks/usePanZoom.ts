import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observeResize } from "@/utils/resizeObserver";

export interface PanZoomState {
  zoom: number;
  posX: number;
  posY: number;
}

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 4;
const WHEEL_SENSITIVITY = 1.0018;

const clampZoom = (z: number) => Math.min(Math.max(MIN_ZOOM, z), MAX_ZOOM);
const clampPercent = (p: number) => Math.min(Math.max(0, p), 100);
const finite = (value: number | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readPlacement = (state: Partial<PanZoomState>): PanZoomState => ({
  zoom: clampZoom(finite(state.zoom, 1)),
  posX: clampPercent(finite(state.posX, 50)),
  posY: clampPercent(finite(state.posY, 50)),
});

const fitZoomFor = ({ boxW, boxH, coverW, coverH }: Geometry) =>
  Math.min(1, boxW / coverW, boxH / coverH);

interface Geometry {
  boxW: number;
  boxH: number;
  /** Size of the image once `object-fit: cover` has been applied. */
  coverW: number;
  coverH: number;
}

export function usePanZoom(
  initialState: Partial<PanZoomState> = {},
  containerRef: React.RefObject<HTMLElement | null>,
  onUpdate?: (state: PanZoomState) => void,
  /** The element the artwork sits in, which also owns the dimming overlay. */
  wheelTargetRef: React.RefObject<HTMLElement | null> = containerRef,
) {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isAdjustDragging, setIsAdjustDragging] = useState(false);
  const [placement, setPlacement] = useState(() => readPlacement(initialState));
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  const zoomFloor = geometry ? fitZoomFor(geometry) : MIN_ZOOM;
  const zoomFloorRef = useRef(zoomFloor);
  zoomFloorRef.current = zoomFloor;

  const saved = useRef<PanZoomState>(placement);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const setZoom = (value: number) =>
    setPlacement((prev) => ({
      ...prev,
      zoom: Math.min(Math.max(zoomFloorRef.current, value), MAX_ZOOM),
    }));

  const measure = useCallback(
    (size?: { width: number; height: number }) => {
      const box = containerRef.current;
      if (!box) return;

      const width = size?.width ?? box.clientWidth;
      const height = size?.height ?? box.clientHeight;
      const img = box.querySelector("img");
      const naturalW = img?.naturalWidth ?? 0;
      const naturalH = img?.naturalHeight ?? 0;
      if (!width || !height || !naturalW || !naturalH) return;
      const cover = Math.max(width / naturalW, height / naturalH);
      setGeometry({
        boxW: width,
        boxH: height,
        coverW: naturalW * cover,
        coverH: naturalH * cover,
      });
    },
    [containerRef],
  );

  useEffect(() => {
    measure();
    const box = containerRef.current;
    if (!box) return;
    const unobserve = observeResize(box, measure);
    const onLoad = () => measure();
    box.addEventListener("load", onLoad, true);
    return () => {
      unobserve();
      box.removeEventListener("load", onLoad, true);
    };
  }, [measure, containerRef]);

  useEffect(() => {
    if (!geometry) return;
    setPlacement((prev) =>
      prev.zoom >= zoomFloor ? prev : { ...prev, zoom: zoomFloor },
    );
  }, [geometry, zoomFloor]);

  const { zoom: inputZoom, posX: inputPosX, posY: inputPosY } = initialState;
  useEffect(() => {
    if (isAdjusting) return;
    const next = readPlacement({
      zoom: inputZoom,
      posX: inputPosX,
      posY: inputPosY,
    });
    saved.current = next;
    setPlacement(next);
  }, [isAdjusting, inputZoom, inputPosX, inputPosY]);

  const panRange = useMemo(() => {
    if (!geometry) return null;
    return {
      x: Math.max(0, (geometry.coverW * placement.zoom - geometry.boxW) / 2),
      y: Math.max(0, (geometry.coverH * placement.zoom - geometry.boxH) / 2),
    };
  }, [geometry, placement.zoom]);

  const imageStyle = useMemo<React.CSSProperties>(() => {
    const { zoom, posX, posY } = placement;
    if (!geometry) {
      return {
        objectPosition: `${posX}% ${posY}%`,
        transform: `scale(${zoom})`,
      };
    }
    const overflow = panRange ?? { x: 0, y: 0 };
    return {
      width: geometry.coverW,
      height: geometry.coverH,
      left: (geometry.boxW - geometry.coverW) / 2,
      top: (geometry.boxH - geometry.coverH) / 2,
      maxWidth: "none",
      objectFit: "fill",
      objectPosition: "center",
      transformOrigin: "center",
      transform: `translate(${((posX - 50) / 50) * overflow.x}px, ${
        ((posY - 50) / 50) * overflow.y
      }px) scale(${zoom})`,
    };
  }, [geometry, panRange, placement]);

  const panBy = (dx: number, dy: number) => {
    if (!panRange) return;
    setPlacement((prev) => ({
      zoom: prev.zoom,
      posX:
        panRange.x > 0
          ? clampPercent(prev.posX + (dx / panRange.x) * 50)
          : prev.posX,
      posY:
        panRange.y > 0
          ? clampPercent(prev.posY + (dy / panRange.y) * 50)
          : prev.posY,
    }));
  };

  const distanceBetweenPointers = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      last.current = { x: e.clientX, y: e.clientY };
      setIsAdjustDragging(true);
    } else {
      // A second finger cancels the drag and starts a pinch instead.
      last.current = null;
      pinch.current = {
        distance: distanceBetweenPointers(),
        zoom: placement.zoom,
      };
    }
    measure();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      const start = pinch.current;
      const distance = distanceBetweenPointers();
      if (start && start.distance > 0 && distance > 0) {
        setZoom(start.zoom * (distance / start.distance));
      }
      return;
    }

    const previous = last.current;
    if (!previous) return;
    last.current = { x: e.clientX, y: e.clientY };
    panBy(e.clientX - previous.x, e.clientY - previous.y);
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      last.current = null;
      pinch.current = null;
      setIsAdjustDragging(false);
    } else {
      pinch.current = null;
      const [remaining] = [...pointers.current.values()];
      last.current = remaining ?? null;
    }
  };

  useEffect(() => {
    if (!isAdjusting) return;
    // listen to the whole tile since the overlay is a
    // sibling of the image and wheel events won't reach the image wrapper
    const box = wheelTargetRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPlacement((prev) => ({
        ...prev,
        zoom: Math.min(
          Math.max(
            zoomFloorRef.current,
            prev.zoom * WHEEL_SENSITIVITY ** -e.deltaY,
          ),
          MAX_ZOOM,
        ),
      }));
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [isAdjusting, wheelTargetRef]);

  const resetGesture = () => {
    pointers.current.clear();
    last.current = null;
    pinch.current = null;
    setIsAdjustDragging(false);
  };

  const startAdjusting = () => {
    setPlacement(saved.current);
    measure();
    setIsAdjusting(true);
  };

  const stopAdjusting = () => {
    setPlacement(saved.current);
    resetGesture();
    setIsAdjusting(false);
  };

  const saveAdjustments = () => {
    saved.current = placement;
    onUpdate?.(placement);
    resetGesture();
    setIsAdjusting(false);
  };

  return {
    isAdjusting,
    isAdjustDragging,
    zoom: placement.zoom,
    posX: placement.posX,
    posY: placement.posY,
    imageStyle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: endPointer,
    handlePointerCancel: endPointer,
    startAdjusting,
    stopAdjusting,
    saveAdjustments,
    setZoom,
  };
}
