import { describe, expect, it } from "vitest";
import { boundCache } from "./lru";

describe("boundCache", () => {
  it("evicts the oldest key from a Map, not a value", () => {
    const cache = new Map<string, string>();
    cache.set("a", "value-a");
    cache.set("b", "value-b");
    cache.set("c", "value-c");

    boundCache(cache, 2);

    expect([...cache.keys()]).toEqual(["b", "c"]);
    expect(cache.get("b")).toBe("value-b");
  });

  it("leaves a Map under the limit untouched", () => {
    const cache = new Map([["a", 1]]);
    boundCache(cache, 5);
    expect(cache.size).toBe(1);
  });

  it("evicts the oldest member of a Set", () => {
    const cache = new Set(["a", "b", "c"]);
    boundCache(cache, 2);
    expect([...cache]).toEqual(["b", "c"]);
  });
});
