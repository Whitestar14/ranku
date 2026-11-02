import { MetadataError } from "./types";

const DEFAULT_TIMEOUT_MS = 7_000;

/** Reads Retry-After (seconds) when the browser is allowed to see it. */
function retryAfterFrom(response: Response): number | undefined {
  try {
    const header = response.headers.get("retry-after");
    if (!header) return undefined;
    const seconds = Number(header);
    return Number.isFinite(seconds) ? seconds * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const external = init.signal;
  const onAbort = () => controller.abort();
  external?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (external?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new MetadataError("The service took too long to answer.", "network");
    }
    throw new MetadataError("Could not reach the service.", "network");
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }

  if (response.status === 429) {
    throw new MetadataError(
      "Rate limited.",
      "rate-limit",
      retryAfterFrom(response),
    );
  }
  if (response.status >= 500) {
    throw new MetadataError("Service is unavailable.", "server");
  }
  if (!response.ok) {
    throw new MetadataError(`Request failed (${response.status}).`);
  }
  return response.json();
}
