import { fetchJson } from "../http";
import { MediaResult, SearchMode } from "../types";

/**
 * Tenrai serves the MyAnimeList catalogue over a Jikan v4 compatible API. It is
 * still beta and `/v1` is interim, so the shape here is pinned to v1.
 */
const TENRAI_BASE = "https://api.tenrai.org/v1";
const PER_PAGE = 20;

interface TenraiImages {
  jpg?: { image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; large_image_url?: string };
}

interface TenraiEntry {
  mal_id: number;
  title?: string;
  title_english?: string;
  name?: string;
  favorites?: number;
  images?: TenraiImages;
}

export async function searchTenrai(
  query: string,
  mode: SearchMode,
  signal: AbortSignal,
): Promise<MediaResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(PER_PAGE),
    order_by: "favorites",
    sort: "desc",
  });
  if (mode === "anime") params.set("sfw", "true");

  const payload = (await fetchJson(
    `${TENRAI_BASE}/${mode}?${params.toString()}`,
    { signal },
  )) as { data?: TenraiEntry[] };

  return (payload.data ?? []).flatMap((entry) => {
    const images = entry.images?.webp ?? entry.images?.jpg;
    const image = images?.large_image_url || images?.image_url;
    if (!image) return [];
    return [
      {
        id: `tenrai:${entry.mal_id}`,
        source: "tenrai" as const,
        malId: entry.mal_id,
        title: entry.title_english || entry.title || entry.name || "Unknown",
        imageUrl: image,
        thumbnailUrl: images?.image_url || image,
        favorites: entry.favorites,
      },
    ];
  });
}
