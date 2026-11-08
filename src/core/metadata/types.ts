export type MetadataSource = "tenrai" | "anilist";
export type SearchMode = "anime" | "manga" | "characters";
export type SourcePreference = "auto" | "myanimelist" | "anilist";

/** Human labels, so the UI never has to know provider ids. */
export const SOURCE_LABELS: Record<MetadataSource, string> = {
  tenrai: "MyAnimeList",
  anilist: "AniList",
};

export interface MediaResult {
  /** Globally unique across providers: `${source}:${id}`. */
  id: string;
  source: MetadataSource;
  /** MyAnimeList id, when the provider exposes one. */
  malId?: number;
  title: string;
  /** Best resolution available. */
  imageUrl: string;
  /** Small resolution, for grid thumbnails. */
  thumbnailUrl: string;
  favorites?: number;
  subtitle?: string;
}

export interface SearchResponse {
  results: MediaResult[];
  source: MetadataSource;
  /** True when the primary provider was unavailable and we fell back. */
  degraded: boolean;
}

export class MetadataError extends Error {
  constructor(
    message: string,
    readonly kind: "network" | "rate-limit" | "server" | "empty" = "server",
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "MetadataError";
  }
}
