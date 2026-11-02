import { useLayoutEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { selectTheme, selectPreferences } from "@/store/selectors";
import { accentForeground } from "@/theme/palettes";

const TRANSPARENCY_QUERY = "(prefers-reduced-transparency: reduce)";

/** Applies the active appearance and accent to `<html>`. */
export function useAppTheme(isLoaded: boolean) {
  const theme = useStore(selectTheme);
  const preferences = useStore(selectPreferences);
  const reduceGlassEffects = preferences.reduceGlassEffects ?? false;
  const [systemReduce, setSystemReduce] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(TRANSPARENCY_QUERY).matches,
  );

  useLayoutEffect(() => {
    const query = window.matchMedia(TRANSPARENCY_QUERY);
    const onChange = () => setSystemReduce(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    if (!isLoaded || !theme) return;
    const root = document.documentElement;

    const isDark = theme.isDark ?? true;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);

    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}

    root.style.setProperty("--color-primary", theme.accentColor);
    root.style.setProperty(
      "--color-on-accent",
      accentForeground(theme.accentColor),
    );

    const meta = document.querySelector('meta[name="theme-color"]');
    const pageColor = getComputedStyle(root)
      .getPropertyValue("--color-background")
      .trim();
    if (meta && pageColor) meta.setAttribute("content", pageColor);
  }, [theme, isLoaded]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute(
      "data-reduce-glass",
      reduceGlassEffects || systemReduce,
    );
    root.toggleAttribute("data-no-grain", preferences.disableGrain ?? false);
  }, [reduceGlassEffects, systemReduce, preferences.disableGrain]);
}
