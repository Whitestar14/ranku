import { fetchJson } from "../http";
import { MetadataError, MediaResult, SearchMode } from "../types";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const PER_PAGE = 20;

const ANILIST_ANIME_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: ANIME, sort: [FAVOURITES_DESC], isAdult: false) {
        id
        idMal
        title { english romaji userPreferred }
        coverImage { extraLarge large medium }
        favourites
      }
    }
  }
`;

const ANILIST_MANGA_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: MANGA, sort: [FAVOURITES_DESC], isAdult: false) {
        id
        idMal
        title { english romaji userPreferred }
        coverImage { extraLarge large medium }
        favourites
      }
    }
  }
`;

const ANILIST_CHARACTER_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      characters(search: $search, sort: [FAVOURITES_DESC]) {
        id
        name { full native userPreferred }
        image { large medium }
        favourites
      }
    }
  }
`;

/** One query per mode, so adding a catalogue entry is a single line. */
const QUERY_FOR: Record<SearchMode, string> = {
  anime: ANILIST_ANIME_QUERY,
  manga: ANILIST_MANGA_QUERY,
  characters: ANILIST_CHARACTER_QUERY,
};

interface AniListMedia {
  id: number;
  idMal?: number;
  title?: { english?: string; romaji?: string; userPreferred?: string };
  coverImage?: { extraLarge?: string; large?: string; medium?: string };
  favourites?: number;
}

interface AniListCharacter {
  id: number;
  name?: { full?: string; native?: string; userPreferred?: string };
  image?: { large?: string; medium?: string };
  favourites?: number;
}

interface AniListPayload {
  data?: {
    Page?: { media?: AniListMedia[]; characters?: AniListCharacter[] };
  };
  errors?: { message: string }[];
}

function toMedia(media: AniListMedia): MediaResult[] {
  const image =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.coverImage?.medium;
  if (!image) return [];
  return [
    {
      id: `anilist:${media.id}`,
      source: "anilist" as const,
      malId: media.idMal,
      title:
        media.title?.english ||
        media.title?.romaji ||
        media.title?.userPreferred ||
        "Unknown",
      imageUrl: image,
      thumbnailUrl: media.coverImage?.medium || image,
      favorites: media.favourites,
    },
  ];
}

function toCharacter(character: AniListCharacter): MediaResult[] {
  const image = character.image?.large || character.image?.medium;
  if (!image) return [];
  return [
    {
      id: `anilist:${character.id}`,
      source: "anilist" as const,
      title:
        character.name?.full ||
        character.name?.userPreferred ||
        character.name?.native ||
        "Unknown",
      imageUrl: image,
      thumbnailUrl: character.image?.medium || image,
      favorites: character.favourites,
    },
  ];
}

export async function searchAniList(
  query: string,
  mode: SearchMode,
  signal: AbortSignal
): Promise<MediaResult[]> {
  const init: RequestInit = {
    method: "POST",
    signal,
    mode: "cors",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: QUERY_FOR[mode],
      variables: { search: query, perPage: PER_PAGE },
    }),
  };

  const payload = (await fetchJson(
    ANILIST_ENDPOINT,
    init,
  )) as AniListPayload;
  if (payload.errors?.length) {
    throw new MetadataError(payload.errors[0].message);
  }

  const page = payload.data?.Page;
  if (mode !== "characters") return (page?.media ?? []).flatMap(toMedia);
  return (page?.characters ?? []).flatMap(toCharacter);
}
