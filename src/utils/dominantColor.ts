import { FALLBACK_TIER_COLOR } from "@/constants/tierColors";
import { boundCache } from "./lru";
import { imageKey } from "./imageKey";

const CACHE_LIMIT = 300;
const cache = new Map<string, string>();
const inFlight = new Set<string>();
const listeners = new Map<string, Set<(color: string) => void>>();

const SAMPLE_SIZE = 8;

/**
 * Samples the image down to an 8×8 grid and returns the most saturated
 * frequent bucket
 */
function sample(src: string, key: string): string | null {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";

  const done = (value: string | null) => {
    // Drop the decoded bitmap as soon as the sample is taken; a board full of
    // image loads would otherwise hold a second full-size decode per tile.
    img.onload = null;
    img.onerror = null;
    img.src = "";
    inFlight.delete(key);
    if (!value) return;
    cache.set(key, value);
    boundCache(cache, CACHE_LIMIT);
    listeners.get(key)?.forEach((fn) => fn(value));
  };

  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return done(null);

      ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      // Bucket by coarse RGB so near-identical shades collapse together, then
      // keep the bucket with the most total colourfulness.
      const buckets = new Map<
        string,
        { r: number; g: number; b: number; score: number }
      >();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lightness = (max + min) / 2;
        const saturation =
          max === min
            ? 0
            : (max - min) / (255 - Math.abs(2 * lightness - 255) || 1);

        const score =
          saturation * (1 - Math.abs(lightness / 255 - 0.5) * 2) + 0.05;
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.r += r;
          existing.g += g;
          existing.b += b;
          existing.score += score;
        } else {
          buckets.set(key, { r, g, b, score });
        }
      }

      let best: { r: number; g: number; b: number; score: number } | null =
        null;
      for (const bucket of buckets.values()) {
        if (!best || bucket.score > best.score) best = bucket;
      }
      if (!best) return done(null);

      const count = SAMPLE_SIZE * SAMPLE_SIZE;
      const r = Math.round(best.r / count);
      const g = Math.round(best.g / count);
      const b = Math.round(best.b / count);
      done(`rgb(${r} ${g} ${b})`);
    } catch {
      // A tainted canvas (cross-origin without CORS headers) throws here.
      done(null);
    }
  };

  img.onerror = () => done(null);
  img.src = src;
  return null;
}

/**
 * Returns the cached colour for `src`, kicking off a sample if there is not one
 * yet.
 */
export function dominantColor(src: string): string | undefined {
  if (!src) return undefined;
  const key = imageKey(src);
  const hit = cache.get(key);
  if (hit) return hit;
  if (!inFlight.has(key)) {
    inFlight.add(key);
    sample(src, key);
  }
  return undefined;
}

/**
 * Subscribes to a source's colour. Returns an unsubscribe function, and the
 * colour immediately if it is already known.
 */
export function subscribeDominantColor(
  src: string,
  onColor: (color: string) => void,
): () => void {
  const key = imageKey(src);
  const existing = cache.get(key);
  if (existing) {
    onColor(existing);
    return () => {};
  }
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(onColor);
  dominantColor(src);
  return () => {
    set!.delete(onColor);
    if (set!.size === 0) listeners.delete(key);
  };
}

export function normalizeTierColor(
  value: string,
  fallback = FALLBACK_TIER_COLOR,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return fallback;
}
