import { describe, expect, it } from "vitest";
import {
  DEFAULT_CARD_RADIUS,
  resolveBoardBackground,
  resolveBoardStyle,
} from "./boardStyle";
import { autoBoardBackground } from "@/theme/palettes";
import { createBlankRank } from "./storage";

const makeBoard = (overrides: Parameters<typeof Object.assign>[1] = {}) =>
  Object.assign(createBlankRank("ranking"), overrides);

describe("resolveBoardStyle", () => {
  it("keeps a zero radius and zero gap seamless", () => {
    const board = resolveBoardStyle(
      makeBoard({ style: "card", borderRadius: 0, gap: 0 }),
    );
    expect(board.radius).toBe(0);
    expect(board.gap).toBe(0);
    expect(board.isCard).toBe(false);
  });

  it("reads the legacy Card preset as a default radius", () => {
    const board = resolveBoardStyle(
      makeBoard({ style: "card", borderRadius: undefined, gap: 8 }),
    );
    expect(board.radius).toBe(DEFAULT_CARD_RADIUS);
    expect(board.isCard).toBe(true);
  });

  it("does not resurrect the legacy seamless preset's radius", () => {
    const board = resolveBoardStyle(
      makeBoard({ style: "seamless", borderRadius: undefined, gap: 0 }),
    );
    expect(board.radius).toBe(0);
    expect(board.isCard).toBe(false);
  });

  it("treats either a gap or a radius as a card layout", () => {
    expect(resolveBoardStyle(makeBoard({ borderRadius: 12, gap: 0 })).isCard).toBe(
      true,
    );
    expect(resolveBoardStyle(makeBoard({ borderRadius: 0, gap: 6 })).isCard).toBe(
      true,
    );
  });
});

describe("resolveBoardBackground", () => {
  it("passes fixed colours through untouched", () => {
    expect(resolveBoardBackground("#123456", { isDark: true })).toBe("#123456");
  });

  it("follows dark mode", () => {
    expect(resolveBoardBackground("auto", { isDark: true })).toBe("#1c1c1e");
    expect(autoBoardBackground(true)).toBe("#1c1c1e");
  });

  it("follows light mode", () => {
    const dark = autoBoardBackground(true);
    const light = autoBoardBackground(false);
    expect(dark).not.toBe(light);
    expect(light).toBe("#ffffff");
  });
});
