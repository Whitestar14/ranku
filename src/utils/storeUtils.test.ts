import { describe, expect, it } from "vitest";
import type { GlobalState, Rank } from "@/types";
import {
  createId,
  exclusiveProjectImages,
  isImageTracked,
  isUntouchedWorkspace,
  projectImageSources,
  resizeCells,
  targetCollectionId,
  trackImage,
} from "./storeUtils";

const inbox = (): GlobalState["inbox"] => ({
  collections: [
    { id: "general", name: "General", items: [] },
    { id: "refs", name: "Refs", items: [] },
  ],
  activeCollectionId: "all-images",
  lastTargetCollectionId: "general",
});

describe("dock identity", () => {
  it("does not add the same image twice within a collection", () => {
    const state = inbox();
    expect(trackImage(state, "img-a")).toBe(true);
    expect(trackImage(state, "img-a")).toBe(false);
    expect(trackImage(state, "img-b")).toBe(true);
    expect(state.collections[0].items.map((i) => i.imageSrc)).toEqual([
      "img-b",
      "img-a",
    ]);
    expect(isImageTracked(state, "img-a")).toBe(true);
  });

  it("files new images into the last target collection", () => {
    const state = inbox();
    state.lastTargetCollectionId = "refs";
    trackImage(state, "img-a");
    expect(state.collections[1].items).toHaveLength(1);
  });

  it("allows the same image in two different collections", () => {
    const state = inbox();
    expect(trackImage(state, "img-a")).toBe(true);
    state.lastTargetCollectionId = "refs";
    expect(trackImage(state, "img-a")).toBe(true);
    expect(isImageTracked(state, "img-a", "general")).toBe(true);
    expect(isImageTracked(state, "img-a", "refs")).toBe(true);
  });
});

/** A board whose top-left `rows` × `cols` block is filled, like a 4x4 of art. */
const filledBlock = (size: number, cols: number) =>
  Array.from({ length: cols * cols }, (_, index) => ({
    id: `cell-${index}`,
    imageSrc:
      Math.floor(index / cols) < size && index % cols < size
        ? `img-${index}`
        : null,
    position: index,
  }));

describe("resizeCells", () => {
  it("keeps every image in its row and column when columns shrink", () => {
    const cells = filledBlock(4, 5);
    const next = resizeCells(cells, 5, 4, 4);

    expect(next).toHaveLength(16);
    next.forEach((cell, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      const expected = row < 4 && col < 4 ? `img-${row * 5 + col}` : null;
      expect(cell.imageSrc).toBe(expected);
    });
  });

  it("drops the last row when rows shrink and keeps the rest in place", () => {
    const cells = filledBlock(4, 5);
    const next = resizeCells(cells, 5, 4, 5);

    expect(next).toHaveLength(20);
    expect(next.map((cell) => cell.id)).toEqual(
      cells.slice(0, 20).map((cell) => cell.id),
    );
    expect(next[0].imageSrc).toBe("img-0");
    expect(next[13].imageSrc).toBe("img-13");
    expect(next[14].imageSrc).toBeNull();
  });

  it("pads with empty cells when the grid grows", () => {
    const cells = filledBlock(3, 3);
    const next = resizeCells(cells, 3, 4, 4);

    expect(next).toHaveLength(16);
    expect(next[0].imageSrc).toBe("img-0");
    expect(next[2].imageSrc).toBe("img-2");
    expect(next[3].imageSrc).toBeNull();
    expect(next[4].imageSrc).toBe("img-3");
    expect(next[4].id).toBe(cells[3].id);
  });

  it("keeps the aspect of the layout when width and height swap", () => {
    const cells = filledBlock(4, 5);
    const next = resizeCells(cells, 5, 5, 5);
    const ids = next.map((cell) => cell.id);

    expect(new Set(ids).size).toBe(25);
    expect(next[0].imageSrc).toBe("img-0");
    expect(next[24].imageSrc).toBeNull();
  });
});

describe("createId", () => {
  it("does not collide when several ids are minted in one tick", () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId("cell")));
    expect(ids.size).toBe(500);
  });
});

describe("isUntouchedWorkspace", () => {
  it("is true for one empty project and an empty dock", () => {
    const rank = {
      id: "r1",
      type: "ranking" as const,
      cells: [
        { id: "c1", imageSrc: null, position: 0 },
        { id: "c2", imageSrc: null, position: 1 },
      ],
      tierRows: [],
    };
    expect(
      isUntouchedWorkspace({
        ranks: { r1: rank } as never,
        inbox: inbox(),
      }),
    ).toBe(true);
  });

  it("is false once the dock holds anything", () => {
    const state = inbox();
    trackImage(state, "img-a");
    const rank = {
      id: "r1",
      type: "ranking" as const,
      cells: [{ id: "c1", imageSrc: null, position: 0 }],
      tierRows: [],
    };
    expect(
      isUntouchedWorkspace({
        ranks: { r1: rank } as never,
        inbox: state,
      }),
    ).toBe(false);
  });
});

describe("targetCollectionId", () => {
  it("falls back to the first collection in the aggregate view", () => {
    const state = inbox();
    expect(targetCollectionId(state)).toBe("general");
  });
});

const rank = (cells: string[], tierItems: string[] = []): Rank =>
  ({
    cells: cells.map((imageSrc, index) => ({
      id: `cell-${index}`,
      imageSrc,
      position: index,
    })),
    tierRows: tierItems.length
      ? [
          {
            id: "tier-s",
            label: "S",
            color: "#000000",
            items: tierItems.map((imageSrc, index) => ({
              id: `item-${index}`,
              imageSrc,
              position: index,
            })),
          },
        ]
      : [],
  }) as unknown as Rank;

describe("projectImageSources", () => {
  it("counts posters used by both board shapes", () => {
    expect(projectImageSources(rank(["a", "b"], ["c"]))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("exclusiveProjectImages", () => {
  it("returns only posters no surviving project uses", () => {
    const ranks = {
      doomed: rank(["shared", "exclusive"]),
      kept: rank(["shared"]),
    };
    expect(exclusiveProjectImages(ranks, ["doomed"])).toEqual(["exclusive"]);
  });

  it("includes tier items when deciding what is exclusive", () => {
    const ranks = {
      doomed: rank([], ["tier-only", "shared"]),
      kept: rank(["shared"]),
    };
    expect(exclusiveProjectImages(ranks, ["doomed"])).toEqual(["tier-only"]);
  });

  it("keeps a shared poster when every project is deleted", () => {
    const ranks = { a: rank(["shared"]), b: rank(["shared"]) };
    expect(exclusiveProjectImages(ranks, ["a", "b"])).toEqual(["shared"]);
  });

  it("ignores ids that are not projects", () => {
    expect(exclusiveProjectImages({ a: rank(["poster"]) }, ["missing"])).toEqual(
      [],
    );
  });
});
