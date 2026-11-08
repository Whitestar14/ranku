import { useLayoutEffect } from "react";
import { useStore } from "@/store/useStore";
import { selectTheme, selectPreferences } from "@/store/selectors";
import { accentForeground } from "@/theme/palettes";
import {
  resolveGlassEnabled,
  useSystemReduceTransparency,
} from "@/hooks/useGlassEffects";

/** Applies the active appearance and accent to `<html>`. */
export function useAppTheme(isLoaded: boolean) {
  const theme = useStore(selectTheme);
  const preferences = useStore(selectPreferences);
  const systemReduce = useSystemReduceTransparency();
  const glassEnabled = resolveGlassEnabled(
    preferences.glassEffects,
    systemReduce,
  );

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
    root.toggleAttribute("data-reduce-glass", !glassEnabled);
    root.toggleAttribute("data-no-grain", preferences.disableGrain ?? false);
  }, [glassEnabled, preferences.disableGrain]);
}
