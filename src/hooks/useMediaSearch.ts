import { useCallback, useEffect, useRef, useState } from "react";
import {
  MetadataError,
  resetMetadataService,
  searchMetadata,
  SOURCE_LABELS,
  type MediaResult,
  type SearchMode,
  type SourcePreference,
} from "@/core/metadata";

class OfflineError extends Error {}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export type SearchErrorKind = "offline" | "unavailable" | "unknown";

export interface SearchError {
  kind: SearchErrorKind;
  /** Raw provider text, for the detail line of the error pane. */
  detail?: string;
}

interface UseMediaSearchOptions {
  query: string;
  mode: SearchMode;
  /** Which catalogue to ask first. */
  prefer: SourcePreference;
}

export function useMediaSearch({ query, mode, prefer }: UseMediaSearchOptions) {
  const [results, setResults] = useState<MediaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SearchError | null>(null);
  const [answeredBy, setAnsweredBy] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  /** Monotonic id so a slow response can never overwrite a newer one. */
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (
      term: string,
      searchMode: SearchMode,
      source: SourcePreference,
      force = false,
    ) => {
      const id = ++requestId.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        if (!navigator.onLine) throw new OfflineError();

        if (force) resetMetadataService();
        const response = await searchMetadata(term, searchMode, {
          signal: controller.signal,
          force,
          prefer: source,
        });

        if (id !== requestId.current) return; // superseded
        setResults(response.results);
        setAnsweredBy(SOURCE_LABELS[response.source]);
        setDegraded(response.degraded);
        setHasSearched(true);
      } catch (err) {
        if (id !== requestId.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
        setHasSearched(true);
        setError({
          kind:
            err instanceof OfflineError
              ? "offline"
              : err instanceof MetadataError
                ? "unavailable"
                : "unknown",
          detail: err instanceof Error ? err.message : undefined,
        });
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [],
  );

  // Debounced search on query/mode/source change.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      requestId.current++;
      abortRef.current?.abort();
      abortRef.current = null;
      setResults([]);
      setHasSearched(false);
      setError(null);
      setLoading(false);
      setDegraded(false);
      setAnsweredBy(null);
      return;
    }
    const timer = setTimeout(() => runSearch(term, mode, prefer), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, mode, prefer, runSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const retry = useCallback(
    () => runSearch(query.trim(), mode, prefer, true),
    [runSearch, query, mode, prefer],
  );

  return {
    results,
    loading,
    error,
    degraded,
    answeredBy,
    hasSearched,
    retry,
  };
}
