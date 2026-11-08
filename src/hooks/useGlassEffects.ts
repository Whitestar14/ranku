import { useEffect, useState } from "react";
import type { GlassEffectsPreference } from "@/types";

const TRANSPARENCY_QUERY = "(prefers-reduced-transparency: reduce)";

const canQuery = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

/** The OS-level "reduce transparency" setting. */
export function useSystemReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(
    () => canQuery() && window.matchMedia(TRANSPARENCY_QUERY).matches,
  );

  useEffect(() => {
    if (!canQuery()) return;
    const query = window.matchMedia(TRANSPARENCY_QUERY);
    const onChange = () => setReduce(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduce;
}

/**
 * Whether blur and transparency should be drawn.
 *
 * An explicit choice wins over the OS: the system preference seeds the first
 * boot, but it must not keep glass off after someone turns it on themselves.
 * That is why `glassEffects` is three-state rather than a "reduce" boolean.
 */
export const resolveGlassEnabled = (
  preference: GlassEffectsPreference | undefined,
  systemReduce: boolean,
): boolean => {
  if (preference === "on") return true;
  if (preference === "off") return false;
  return !systemReduce;
};
