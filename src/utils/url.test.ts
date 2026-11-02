import { describe, expect, it } from "vitest";
import { isValidImageUrl } from "./url";
import { imageKey } from "./imageKey";

describe("isValidImageUrl", () => {
  it("accepts absolute http and https URLs", () => {
    expect(isValidImageUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isValidImageUrl("  http://example.com/b.png  ")).toBe(true);
  });

  it("rejects relative or non-http values", () => {
    expect(isValidImageUrl("/posters/a.jpg")).toBe(false);
    expect(isValidImageUrl("ftp://example.com/a.jpg")).toBe(false);
    expect(isValidImageUrl("javascript:alert(1)")).toBe(false);
    expect(isValidImageUrl("")).toBe(false);
    expect(isValidImageUrl("   ")).toBe(false);
  });
});

describe("imageKey", () => {
  it("keeps short sources readable", () => {
    expect(imageKey("https://example.com/a.jpg")).toBe(
      "https://example.com/a.jpg",
    );
  });

  it("compresses a long source to a stable, short key", () => {
    const src = `data:image/webp;base64,${"A".repeat(4000)}`;
    const key = imageKey(src);

    expect(key.length).toBeLessThan(32);
    expect(imageKey(src)).toBe(key);
    expect(key).toMatch(/^\d+:[a-z0-9]+$/);
  });

  it("separates long sources that differ in one character", () => {
    const a = `data:image/webp;base64,${"A".repeat(4000)}`;
    const b = `data:image/webp;base64,${"A".repeat(3999)}B`;
    expect(imageKey(a)).not.toBe(imageKey(b));
  });
});
