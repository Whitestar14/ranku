import { describe, expect, it } from "vitest";
import { DEFAULT_ASPECT, aspectToCss, widthForHeight } from "./ui";

describe("aspectToCss", () => {
  it("turns a ratio into a CSS value", () => {
    expect(aspectToCss("16:9")).toBe("16 / 9");
  });

  it("falls back to the default ratio", () => {
    expect(aspectToCss()).toBe("3 / 4");
    expect(aspectToCss("nonsense")).toBe("3 / 4");
  });

  it("does not emit a zero or negative side", () => {
    expect(aspectToCss("0:9")).toBe("3 / 9");
    expect(aspectToCss("4:-2")).toBe("4 / 4");
  });
});

describe("widthForHeight", () => {
  it("sizes a tile from the chosen ratio", () => {
    expect(widthForHeight("3:4", 120)).toBe(90);
    expect(widthForHeight("1:1", 120)).toBe(120);
    expect(widthForHeight("16:9", 90)).toBe(160);
  });

  it("uses the default ratio when none is set", () => {
    expect(widthForHeight(undefined, 120)).toBe(widthForHeight(DEFAULT_ASPECT, 120));
  });
});
