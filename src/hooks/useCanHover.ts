import { useEffect, useState } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

/** True only where a real pointer exists, so touch-only UI can skip it. */
export function useCanHover() {
  const [canHover, setCanHover] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = () => setCanHover(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return canHover;
}
