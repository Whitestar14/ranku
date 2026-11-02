import {
  cacheKey,
  clearCaches,
  clearInFlight,
  getInFlight,
  readCache,
  setInFlight,
  writeCache,
} from "./cache";
import { searchAniList } from "./providers/anilist";
import { searchTenrai } from "./providers/tenrai";
import {
  clearProviderCooldowns,
  isProviderAvailable,
  penalise,
  reward,
  schedule,
} from "./rateLimit";
import type {
  MediaResult,
  MetadataSource,
  SearchMode,
  SearchResponse,
  SourcePreference,
} from "./types";
import { MetadataError } from "./types";

export type { MetadataSource, SearchMode, SourcePreference } from "./types";
export {
  MetadataError,
  SOURCE_LABELS,
  type MediaResult,
  type SearchResponse,
} from "./types";

type Provider = (
  query: string,
  mode: SearchMode,
  signal: AbortSignal,
) => Promise<MediaResult[]>;

const PROVIDERS: Record<MetadataSource, Provider> = {
  tenrai: (q, m, s) => schedule("tenrai", () => searchTenrai(q, m, s), s),
  anilist: (q, m, s) => schedule("anilist", () => searchAniList(q, m, s), s),
};

/** How long the preferred catalogue gets alone before the other is asked too. */
const HEDGE_DELAY_MS = 650;

const preferenceToSource = (
  preference: SourcePreference | undefined,
): MetadataSource | null => {
  if (preference === "myanimelist") return "tenrai";
  if (preference === "anilist") return "anilist";
  return null;
};

/** The default order, used when the user has expressed no preference. */
const DEFAULT_ORDER: MetadataSource[] = ["tenrai", "anilist"];

const orderFor = (preference?: SourcePreference): MetadataSource[] => {
  const preferred = preferenceToSource(preference);
  if (!preferred) return DEFAULT_ORDER;
  return [preferred, ...DEFAULT_ORDER.filter((s) => s !== preferred)];
};

const describe = (error: unknown) =>
  error instanceof Error ? error.message : "failed";

interface RaceResult {
  source: MetadataSource;
  results: MediaResult[];
}

/**
 * Asks both catalogues, staggering them. The preferred one starts at once and
 * the other follows after a short grace period. Whichever answers first wins,
 * so a hanging request cannot hold the search hostage, and the loser is aborted
 * as soon as a winner is chosen.
 */
function raceProviders(
  order: MetadataSource[],
  query: string,
  mode: SearchMode,
  signal: AbortSignal,
): Promise<RaceResult> {
  return new Promise<RaceResult>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const failures: string[] = [];
    let pending = order.length;
    let served = false;
    let emptySource: MetadataSource | null = null;

    const cleanup = () => {
      signal.removeEventListener("abort", abort);
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };

    function abort() {
      if (settled) return;
      settled = true;
      controller.abort();
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal.addEventListener("abort", abort, { once: true });

    const fail = (message: string) => {
      failures.push(message);
      pending -= 1;
      if (settled || served || pending > 0) return;
      settled = true;
      cleanup();
      if (emptySource) {
        resolve({ source: emptySource, results: [] });
        return;
      }
      reject(
        new MetadataError(
          failures.length
            ? `Search is temporarily unavailable — ${failures.join("; ")}.`
            : "Search is temporarily unavailable.",
        ),
      );
    };

    const succeed = (source: MetadataSource, results: MediaResult[]) => {
      if (settled || served) return;
      if (results.length === 0 && pending > 1) {
        emptySource = source;
        pending -= 1;
        return;
      }
      settled = true;
      served = true;
      cleanup();
      controller.abort();
      resolve({ source, results });
    };

    order.forEach((source, index) => {
      const timer = setTimeout(
        () => {
          timers.delete(timer);
          if (served || controller.signal.aborted) {
            pending -= 1;
            return;
          }
          if (!isProviderAvailable(source)) {
            fail(`${source} is cooling down`);
            return;
          }
          PROVIDERS[source](query, mode, controller.signal)
            .then((results) => {
              reward(source);
              succeed(source, results);
            })
            .catch((error) => {
              if (controller.signal.aborted) return;
              penalise(source, error);
              fail(`${source}: ${describe(error)}`);
            });
        },
        index === 0 ? 0 : HEDGE_DELAY_MS,
      );
      timers.add(timer);
    });

    if (signal.aborted) abort();
  });
}

export interface SearchOptions {
  signal?: AbortSignal;
  /** Bypass the result cache — used by an explicit "Retry". */
  force?: boolean;
  /** Which catalogue to ask first. Defaults to MyAnimeList then AniList. */
  prefer?: SourcePreference;
}

export async function searchMetadata(
  query: string,
  mode: SearchMode,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { results: [], source: "tenrai", degraded: false };
  }

  const order = orderFor(options.prefer);
  // The preference is part of the key: switching catalogues must not serve the
  // previous catalogue's cached answer.
  const key = `${options.prefer ?? "auto"}:${cacheKey(mode, trimmed)}`;
  if (!options.force) {
    const cached = readCache(key);
    if (cached) return cached;
    const pending = getInFlight(key);
    if (pending) return pending;
  }

  const preferred = preferenceToSource(options.prefer);

  const task = (async (): Promise<SearchResponse> => {
    const signal = options.signal ?? new AbortController().signal;
    const winner = await raceProviders(order, trimmed, mode, signal);
    const response: SearchResponse = {
      results: winner.results,
      source: winner.source,
      degraded: Boolean(preferred) && winner.source !== preferred,
    };
    writeCache(key, response);
    return response;
  })().finally(() => clearInFlight(key));

  setInFlight(key, task);
  return task;
}

/** Clears caches and cooldowns. Used by an explicit user-triggered retry. */
export function resetMetadataService() {
  clearCaches();
  clearProviderCooldowns();
}
