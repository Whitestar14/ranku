import { afterEach, describe, expect, it, vi } from "vitest";
import { searchTenrai } from "./tenrai";

const respond = (body: unknown, status = 200) =>
  vi
    .stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

const signal = () => new AbortController().signal;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchTenrai", () => {
  it("maps entries onto the shared result shape", async () => {
    respond({
      data: [
        {
          mal_id: 16498,
          title: "Shingeki no Kyojin",
          title_english: "Attack on Titan",
          favorites: 1200,
          images: {
            jpg: {
              image_url: "https://cdn/small.jpg",
              large_image_url: "https://cdn/large.jpg",
            },
          },
        },
      ],
    });

    const [result] = await searchTenrai("titan", "anime", signal());

    expect(result).toEqual({
      id: "tenrai:16498",
      source: "tenrai",
      malId: 16498,
      title: "Attack on Titan",
      imageUrl: "https://cdn/large.jpg",
      thumbnailUrl: "https://cdn/small.jpg",
      favorites: 1200,
    });
  });

  it("asks the right catalogue and keeps series searches safe", async () => {
    respond({ data: [] });
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await searchTenrai("titan", "anime", signal());
    await searchTenrai("berserk", "manga", signal());
    await searchTenrai("mikasa", "characters", signal());

    const [animeUrl, mangaUrl, characterUrl] = fetchMock.mock.calls.map((call) =>
      new URL(String((call as unknown[])[0])),
    );
    expect(animeUrl.pathname).toBe("/v1/anime");
    expect(animeUrl.searchParams.get("sfw")).toBe("true");
    expect(mangaUrl.pathname).toBe("/v1/manga");
    expect(mangaUrl.searchParams.get("sfw")).toBe("true");
    expect(characterUrl.pathname).toBe("/v1/characters");
    expect(characterUrl.searchParams.get("sfw")).toBeNull();
  });

  it("falls back to the romaji title and skips entries without art", async () => {
    respond({
      data: [
        { mal_id: 1, title: "Romaji Only", images: { jpg: {} } },
        {
          mal_id: 2,
          title: "With Art",
          images: { webp: { large_image_url: "https://cdn/art.webp" } },
        },
      ],
    });

    const results = await searchTenrai("x", "anime", signal());

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("With Art");
    expect(results[0].imageUrl).toBe("https://cdn/art.webp");
    expect(results[0].thumbnailUrl).toBe("https://cdn/art.webp");
  });

  it("surfaces a rate limit as a metadata error with a retry hint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("{}", { status: 429, headers: { "retry-after": "3" } }),
      ),
    );

    await expect(searchTenrai("x", "anime", signal())).rejects.toMatchObject({
      kind: "rate-limit",
      retryAfterMs: 3000,
    });
  });
});
