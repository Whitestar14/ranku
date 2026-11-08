import { describe, expect, it } from "vitest";
import { resolveGlassEnabled } from "./useGlassEffects";

describe("resolveGlassEnabled", () => {
  it("follows the system while the choice is auto", () => {
    expect(resolveGlassEnabled("auto", false)).toBe(true);
    expect(resolveGlassEnabled("auto", true)).toBe(false);
    expect(resolveGlassEnabled(undefined, true)).toBe(false);
  });

  it("lets an explicit choice win over the system", () => {
    expect(resolveGlassEnabled("on", true)).toBe(true);
    expect(resolveGlassEnabled("off", false)).toBe(false);
  });
});
