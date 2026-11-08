import { afterEach, describe, expect, it, vi } from "vitest";
import { searchAniList } from "./anilist";

const signal = () => new AbortController().signal;

interface SentQuery {
  query: string;
  variables: { search: string; perPage: number };
}

/** Stubs fetch, returning `body` and exposing the GraphQL request it received. */
const capture = (body: unknown) => {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return () =>
    JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    ) as SentQuery;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchAniList", () => {
  it("asks for manga covers in manga mode", async () => {
    const sent = capture({
      data: {
        Page: {
          media: [
            {
              id: 30013,
              idMal: 2,
              title: { english: "Berserk", romaji: "Berserk" },
              coverImage: {
                extraLarge: "https://cdn/berserk-xl.jpg",
                medium: "https://cdn/berserk-m.jpg",
              },
              favourites: 9000,
            },
          ],
        },
      },
    });

    const [result] = await searchAniList("berserk", "manga", signal());

    const request = sent();
    expect(request.query).toContain("type: MANGA");
    expect(request.query).not.toContain("type: ANIME");
    expect(request.variables.search).toBe("berserk");
    expect(result).toMatchObject({
      id: "anilist:30013",
      malId: 2,
      title: "Berserk",
      imageUrl: "https://cdn/berserk-xl.jpg",
      thumbnailUrl: "https://cdn/berserk-m.jpg",
      favorites: 9000,
    });
  });

  it("reads the character branch in character mode", async () => {
    const sent = capture({
      data: {
        Page: {
          characters: [
            {
              id: 1,
              name: { full: "Mikasa Ackerman" },
              image: { large: "https://cdn/mikasa-l.jpg" },
            },
          ],
        },
      },
    });

    const [result] = await searchAniList("mikasa", "characters", signal());

    expect(sent().query).toContain("characters(");
    expect(result.title).toBe("Mikasa Ackerman");
    expect(result.imageUrl).toBe("https://cdn/mikasa-l.jpg");
  });
});
