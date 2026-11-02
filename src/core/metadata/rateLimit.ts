import { MetadataError, MetadataSource } from "./types";

interface ProviderConfig {
  id: MetadataSource;
  /** Minimum gap between two requests to this provider. */
  minIntervalMs: number;
  /** How long to stop calling it after a failure. */
  cooldownMs: number;
}

interface ProviderRuntime {
  /** Tail of the serialised request chain. */
  chain: Promise<unknown>;
  lastStartedAt: number;
  cooldownUntil: number;
  consecutiveFailures: number;
}

export const PROVIDER_CONFIG: Record<MetadataSource, ProviderConfig> = {
  // 300ms fits Tenrai's 4 requests per second ceiling with a little room.
  tenrai: { id: "tenrai", minIntervalMs: 300, cooldownMs: 15_000 },
  anilist: { id: "anilist", minIntervalMs: 1200, cooldownMs: 30_000 },
};

const abortError = () => new DOMException("Aborted", "AbortError");

const runtime: Record<MetadataSource, ProviderRuntime> = {
  tenrai: {
    chain: Promise.resolve(),
    lastStartedAt: 0,
    cooldownUntil: 0,
    consecutiveFailures: 0,
  },
  anilist: {
    chain: Promise.resolve(),
    lastStartedAt: 0,
    cooldownUntil: 0,
    consecutiveFailures: 0,
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `task` with the provider's rate discipline applied. Everything is
 * chained onto a single promise so two callers can never overlap. A request
 * that is cancelled while queued leaves without spending the interval, so a
 * superseded keystroke never delays the query the user is actually waiting on.
 */
export function schedule<T>(
  source: MetadataSource,
  task: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const cfg = PROVIDER_CONFIG[source];
  const rt = runtime[source];

  const run = async (): Promise<T> => {
    if (signal?.aborted) throw abortError();
    const wait = rt.lastStartedAt + cfg.minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    if (signal?.aborted) throw abortError();
    rt.lastStartedAt = Date.now();
    return task();
  };

  // Swallow rejections on the stored chain so one failure cannot poison the
  // queue for subsequent callers.
  const result = rt.chain.then(run, run);
  rt.chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export function isProviderAvailable(source: MetadataSource) {
  return Date.now() >= runtime[source].cooldownUntil;
}

export function penalise(source: MetadataSource, error: unknown) {
  const cfg = PROVIDER_CONFIG[source];
  const rt = runtime[source];
  rt.consecutiveFailures += 1;

  // Honour an explicit Retry-After when the server exposes one cross-origin
  // (it often does not), otherwise back off exponentially.
  const hinted =
    error instanceof MetadataError && error.retryAfterMs
      ? error.retryAfterMs
      : cfg.cooldownMs * Math.min(rt.consecutiveFailures, 4);

  rt.cooldownUntil = Date.now() + hinted;
}

export function reward(source: MetadataSource) {
  runtime[source].consecutiveFailures = 0;
}

export function clearProviderCooldowns() {
  (Object.keys(runtime) as MetadataSource[]).forEach((source) => {
    runtime[source].cooldownUntil = 0;
    runtime[source].consecutiveFailures = 0;
  });
}
