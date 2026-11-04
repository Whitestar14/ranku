import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaResult } from "./types";

vi.mock("./providers/anilist", () => ({ searchAniList: vi.fn() }));
vi.mock("./providers/tenrai", () => ({ searchTenrai: vi.fn() }));

import { searchAniList } from "./providers/anilist";
import { searchTenrai } from "./providers/tenrai";
import { resetMetadataService, searchMetadata } from "./index";

const anilist = vi.mocked(searchAniList);
const tenrai = vi.mocked(searchTenrai);

const hits = (source: "anilist" | "tenrai"): MediaResult[] => [
  {
    id: `${source}:1`,
    source,
    title: "Naruto",
    imageUrl: `https://img.test/${source}.jpg`,
    thumbnailUrl: `https://img.test/${source}.jpg`,
  },
];

const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => {
  resetMetadataService();
  anilist.mockReset();
  tenrai.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("searchMetadata", () => {
  it("answers with the chosen catalogue without waiting for the fallback", async () => {
    anilist.mockResolvedValue(hits("anilist"));

    const result = await searchMetadata("naruto", "anime", { prefer: "anilist" });

    expect(result.source).toBe("anilist");
    expect(result.degraded).toBe(false);
    expect(tenrai).not.toHaveBeenCalled();
  });

  it("keeps the chosen catalogue alive past the old 650ms hedge", async () => {
    vi.useFakeTimers();
    anilist.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(hits("anilist")), 1000),
        ),
    );

    const pending = searchMetadata("naruto", "anime", { prefer: "anilist" });
    await vi.advanceTimersByTimeAsync(900);

    // A slow first request (DNS, TLS, CORS preflight) must not be pre-empted.
    expect(tenrai).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    const result = await pending;

    expect(result.source).toBe("anilist");
    expect(result.degraded).toBe(false);
    expect(tenrai).not.toHaveBeenCalled();
  });

  it("falls back and reports the swap when the chosen catalogue fails", async () => {
    vi.useFakeTimers();
    anilist.mockRejectedValue(new Error("boom"));
    tenrai.mockResolvedValue(hits("tenrai"));

    const pending = searchMetadata("naruto", "anime", { prefer: "anilist" });
    await vi.advanceTimersByTimeAsync(1700);
    const result = await pending;

    expect(result.source).toBe("tenrai");
    expect(result.degraded).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("hedges sooner when no catalogue was chosen", async () => {
    vi.useFakeTimers();
    anilist.mockImplementation(() => new Promise(() => {}));
    tenrai.mockResolvedValue(hits("tenrai"));

    const pending = searchMetadata("naruto", "anime");
    await vi.advanceTimersByTimeAsync(700);
    const result = await pending;

    expect(result.source).toBe("tenrai");
    expect(result.degraded).toBe(false);
  });

  it("stops calling a provider that just failed", async () => {
    vi.useFakeTimers();
    anilist.mockRejectedValue(new Error("429"));
    tenrai.mockResolvedValue(hits("tenrai"));

    const first = searchMetadata("naruto", "anime", { prefer: "anilist" });
    await vi.advanceTimersByTimeAsync(1700);
    await first;

    const second = searchMetadata("sasuke", "anime", { prefer: "anilist" });
    await vi.advanceTimersByTimeAsync(1700);
    const result = await second;

    expect(anilist).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("tenrai");
  });

  it("serves a repeated search from the cache", async () => {
    anilist.mockResolvedValue(hits("anilist"));

    await searchMetadata("naruto", "anime", { prefer: "anilist" });
    await searchMetadata("naruto", "anime", { prefer: "anilist" });
    await settle();

    expect(anilist).toHaveBeenCalledTimes(1);
  });

  it("does not ask anything for a one character query", async () => {
    const result = await searchMetadata("n", "anime", { prefer: "anilist" });

    expect(result.results).toEqual([]);
    expect(anilist).not.toHaveBeenCalled();
    expect(tenrai).not.toHaveBeenCalled();
  });
});
