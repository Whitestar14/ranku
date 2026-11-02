import React, { ReactNode, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
  useDndContext,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useStore } from "@/store/useStore";
import { useDragState, DragKind } from "@/state/dragState";
import { DRAG_TYPE, DROP_TYPE } from "@/constants/drag";
import { selectActiveRank } from "@/store/selectors";
import { aspectToCss } from "@/utils/ui";
import { requestDockExpand } from "@/utils/inboxDrag";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Star } from "lucide-react";

const PREVIEW_MAX = 124;

function previewSize(ratio?: string, width?: number, fallbackRatio = "3:4") {
  const source = ratio && ratio.includes(":") ? ratio : fallbackRatio;
  const [rw, rh] = source.split(":").map(Number);
  const safeRw = rw > 0 ? rw : 3;
  const safeRh = rh > 0 ? rh : 4;

  let w = Math.min(typeof width === "number" ? width : 120, PREVIEW_MAX);
  let h = (w * safeRh) / safeRw;
  if (h > PREVIEW_MAX) {
    h = PREVIEW_MAX;
    w = (h * safeRw) / safeRh;
  }
  return {
    width: Math.round(w),
    aspectRatio: `${safeRw} / ${safeRh}`,
  };
}

const CustomDragOverlay = () => {
  const { active } = useDndContext();
  const rank = useStore(selectActiveRank);
  if (!active?.data.current || !rank) return null;

  const data = active.data.current;

  if (data.type === DRAG_TYPE.TIER_ROW) {
    return (
      <div
        className="flex items-center justify-center px-5 py-3 material-thick rounded-tile pointer-events-none squircle"
        style={{
          backgroundColor: data.color || "var(--color-surface-elevated)",
          minWidth: 96,
          opacity: 0.95,
        }}
      >
        <span
          className="text-title-2 font-bold truncate"
          style={{ color: data.textColor || "#fff" }}
        >
          {data.label || ""}
        </span>
      </div>
    );
  }

  if (!data.imageSrc) return null;

  if (data.isRow) {
    return (
      <div
        className="flex items-center gap-4 p-3 material-thick squircle pointer-events-none"
        style={{
          width: data.width || "100%",
          opacity: 0.95,
          borderRadius: "var(--radius-tile)",
        }}
      >
        <div
          className="shrink-0 overflow-hidden squircle"
          style={{
            width: rank.aspectRatio === "1:1" ? 56 : 48,
            aspectRatio: aspectToCss(rank.aspectRatio),
            borderRadius: "var(--radius-mini)",
          }}
        >
          <RemoteImage
            src={data.imageSrc}
            alt=""
            noPlaceholder
            className="w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-headline font-semibold text-text truncate">
            {data.textLabel || ""}
          </div>
          {data.rating ? (
            <div className="flex items-center gap-1 text-caption-1 font-medium text-accent-yellow">
              <Star size={11} className="fill-accent-yellow" />
              <span>{data.rating}/10</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (data.type === DRAG_TYPE.TIER_ITEM) {
    const size = previewSize(data.aspectRatio, data.width, rank.aspectRatio);
    return (
      <div
        className="overflow-hidden pointer-events-none material squircle"
        style={{
          width: size.width,
          aspectRatio: size.aspectRatio,
          borderRadius: "var(--radius-tile)",
          opacity: 0.95,
          rotate: "-1.5deg",
          boxShadow: "var(--material-shadow-high)",
        }}
      >
        <RemoteImage
          src={data.imageSrc}
          alt=""
          noPlaceholder
          className="w-full h-full"
        />
      </div>
    );
  }

  const size = previewSize(data.aspectRatio, data.width, rank.aspectRatio);
  return (
    <div
      className="overflow-hidden pointer-events-none material squircle"
      style={{
        width: size.width,
        aspectRatio: size.aspectRatio,
        borderRadius: "var(--radius-tile)",
        opacity: 0.95,
        rotate: "-1.5deg",
        boxShadow: "var(--material-shadow-high)",
      }}
    >
      <RemoteImage
        src={data.imageSrc}
        alt=""
        noPlaceholder
        className="w-full h-full"
      />
    </div>
  );
};

const pointerOf = (event: Event | null): { x: number; y: number } | null => {
  if (!event) return null;
  if ("touches" in event) {
    const touch = (event as TouchEvent).touches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  const pointer = event as PointerEvent;
  return typeof pointer.clientX === "number"
    ? { x: pointer.clientX, y: pointer.clientY }
    : null;
};

/**
 * The preview is positioned from the pointer directly, not from the source
 * node's rect, so it always sits centred under the hand regardless of where the
 * tile was grabbed.
 */
const DragPreview: React.FC = () => {
  const { active, activatorEvent } = useDndContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const place = (x: number, y: number) => {
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      node.style.opacity = "1";
    };
    const start = pointerOf(activatorEvent as Event | null);
    if (start) place(start.x, start.y);

    const onMove = (event: PointerEvent) => place(event.clientX, event.clientY);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active, activatorEvent]);

  if (!active?.data.current) return null;

  return createPortal(
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] opacity-0 will-change-transform"
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <CustomDragOverlay />
      </div>
    </div>,
    document.body,
  );
};

interface ActivePayload {
  type: string;
  index?: number;
  id?: string;
  rowId?: string;
  collectionId?: string;
  imageSrc?: string;
  isRow?: boolean;
}

interface OverPayload {
  type: string;
  index?: number;
  rowId?: string;
}

interface DropContext {
  active: ActivePayload;
  over: OverPayload;
  store: ReturnType<typeof useStore.getState>;
}

interface DropHandler {
  from: string;
  to: string;
  /** Container reorders opt out of the landing pulse on the moved container. */
  silent?: boolean;
  run: (ctx: DropContext) => void;
}

const DROP_HANDLERS: DropHandler[] = [
  {
    from: DRAG_TYPE.TIER_ROW,
    to: DROP_TYPE.TIER_ROW,
    silent: true,
    run: ({ active, over, store }) => {
      const from = active.index;
      const to = over.index;
      if (from === undefined || to === undefined || from === to) return;
      store.handleReorderTierRows(from, to);
    },
  },
  {
    from: DRAG_TYPE.INBOX_ITEM,
    to: DROP_TYPE.CELL,
    run: ({ active, over, store }) => {
      if (over.index === undefined || !active.id || !active.collectionId)
        return;
      store.handleItemTransfer(
        { type: "inbox", collectionId: active.collectionId, itemId: active.id },
        { type: "cell", index: over.index },
      );
    },
  },
  {
    from: DRAG_TYPE.SEARCH_ITEM,
    to: DROP_TYPE.CELL,
    run: ({ active, over, store }) => {
      if (over.index === undefined || !active.imageSrc) return;
      store.handleItemTransfer(
        { type: "search", imageSrc: active.imageSrc },
        { type: "cell", index: over.index },
      );
    },
  },
  {
    from: DRAG_TYPE.CELL,
    to: DROP_TYPE.CELL,
    run: ({ active, over, store }) => {
      const from = active.index;
      const to = over.index;
      if (from === undefined || to === undefined || from === to) return;
      // A list row reorders; a board tile swaps.
      if (active.isRow) store.handleReorderCells(from, to);
      else store.handleSwapCells(from, to);
    },
  },
  {
    from: DRAG_TYPE.CELL,
    to: DROP_TYPE.DOCK,
    run: ({ active, store }) => {
      if (active.index === undefined) return;
      store.handleItemTransfer(
        { type: "cell", index: active.index },
        { type: "inbox" },
      );
    },
  },
  {
    from: DRAG_TYPE.INBOX_ITEM,
    to: DROP_TYPE.TIER_CELL,
    run: ({ active, over, store }) => {
      if (!over.rowId || !active.id || !active.collectionId) return;
      store.handleItemTransfer(
        { type: "inbox", collectionId: active.collectionId, itemId: active.id },
        { type: "tier", rowId: over.rowId, targetIndex: over.index ?? -1 },
      );
    },
  },
  {
    from: DRAG_TYPE.SEARCH_ITEM,
    to: DROP_TYPE.TIER_CELL,
    run: ({ active, over, store }) => {
      if (!over.rowId || !active.imageSrc) return;
      store.handleItemTransfer(
        { type: "search", imageSrc: active.imageSrc },
        { type: "tier", rowId: over.rowId, targetIndex: over.index ?? -1 },
      );
    },
  },
  {
    /* Tier item moved inside the tier list — including across rows, which used
       to be mistaken for a duplicate add. */
    from: DRAG_TYPE.TIER_ITEM,
    to: DROP_TYPE.TIER_CELL,
    run: ({ active, over, store }) => {
      if (!active.rowId || !active.id || !over.rowId) return;
      store.handleItemTransfer(
        { type: "tier", rowId: active.rowId, itemId: active.id },
        { type: "tier", rowId: over.rowId, targetIndex: over.index ?? -1 },
      );
    },
  },
  {
    from: DRAG_TYPE.TIER_ITEM,
    to: DROP_TYPE.DOCK,
    run: ({ active, store }) => {
      if (!active.rowId || !active.id) return;
      store.handleItemTransfer(
        { type: "tier", rowId: active.rowId, itemId: active.id },
        { type: "inbox" },
      );
    },
  },
  {
    from: DRAG_TYPE.TIER_ITEM,
    to: DROP_TYPE.CELL,
    run: ({ active, over, store }) => {
      if (!active.rowId || !active.id || over.index === undefined) return;
      store.handleItemTransfer(
        { type: "tier", rowId: active.rowId, itemId: active.id },
        { type: "cell", index: over.index },
      );
    },
  },
  {
    from: DRAG_TYPE.CELL,
    to: DROP_TYPE.TIER_CELL,
    run: ({ active, over, store }) => {
      if (active.index === undefined || !over.rowId) return;
      store.handleItemTransfer(
        { type: "cell", index: active.index },
        { type: "tier", rowId: over.rowId, targetIndex: over.index ?? -1 },
      );
    },
  },
];

const findDropHandler = (from?: string, to?: string): DropHandler | null =>
  from && to
    ? (DROP_HANDLERS.find((h) => h.from === from && h.to === to) ?? null)
    : null;

/** The dock is the topmost surface: while it is under the pointer, nothing
 *  behind it may answer a drop. */
const dockFirstCollision: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  const dock = collisions.find(
    (collision) =>
      collision.data?.droppableContainer.data.current?.type === DROP_TYPE.DOCK,
  );
  return dock ? [dock] : collisions;
};

/* ─── Provider ─────────────────────────────────────────────────────── */
export const GlobalDragDropProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 4 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 180, tolerance: 10 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  /* ── onDragStart ────────────────────────────────────────────────── */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeType = event.active.data.current?.type;
    if (
      activeType === DRAG_TYPE.INBOX_ITEM ||
      activeType === DRAG_TYPE.SEARCH_ITEM
    ) {
      useStore.getState().setIsDraggingFromDock(true);
    }

    // Publish to the ephemeral drag store so grid tiles and tier rows can
    // reveal their drop targets without subscribing to the persisted store.
    if (activeType) {
      useDragState.getState().beginDrag({
        kind: activeType as DragKind,
        index: event.active.data.current?.index,
        id: event.active.id as string,
      });
    }
  }, []);

  /* ── onDragEnd ──────────────────────────────────────────────────── */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    useStore.getState().setIsDraggingFromDock(false);
    useDragState.getState().endDrag();

    const { active, over, delta } = event;
    if (!over) return;

    /* A press that never travelled is not a drop. Collision detection is
       `pointerWithin`, so a click that stays put inside a dock card still
       resolves to whatever grid cell the card is sitting over, and the image
       teleported into the board. The mouse sensor already needs 4px to
       activate, so anything below that is a click that happened to cross the
       threshold without going anywhere. */
    if (Math.hypot(delta.x, delta.y) < 8) return;

    const activePayload = active.data.current as ActivePayload | undefined;
    const overPayload = over.data.current as OverPayload | undefined;
    const handler = findDropHandler(activePayload?.type, overPayload?.type);
    if (!activePayload || !overPayload || !handler) return;

    /* Tell the receiving surface a drop just landed on it, so it can play its
       landing animation. Done before the transfer runs so the pulse starts on
       the same frame the data moves. */
    if (!handler.silent) {
      useDragState.getState().setLastDrop(String(over.id));
    }

    /* A drag that began in the dock left it collapsed behind it — that is what
       auto-close is for — so the library is asked back once the drop has settled.
       Only for dock-originated drags: a board-to-board move never touched it. */
    if (
      activePayload.type === DRAG_TYPE.INBOX_ITEM ||
      activePayload.type === DRAG_TYPE.SEARCH_ITEM
    ) {
      requestDockExpand();
    }

    handler.run({
      active: activePayload,
      over: overPayload,
      store: useStore.getState(),
    });
  }, []);

  /* ── onDragCancel ────────────────────────────────────────────────── */
  const handleDragCancel = useCallback(() => {
    useStore.getState().setIsDraggingFromDock(false);
    useDragState.getState().endDrag();
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dockFirstCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragPreview />
    </DndContext>
  );
};
