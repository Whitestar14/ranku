type ResizeCallback = (size?: { width: number; height: number }) => void;

const callbacks = new Map<Element, Set<ResizeCallback>>();
let observer: ResizeObserver | null = null;

const ensureObserver = (): ResizeObserver | null => {
  if (observer || typeof ResizeObserver === "undefined") return observer;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const listeners = callbacks.get(entry.target);
      if (!listeners) continue;
      for (const callback of listeners) callback(entry.contentRect);
    }
  });
  return observer;
};

/**
 * Observes an element's size through one shared `ResizeObserver`.
 * Returns an unsubscribe function.
 */
export const observeResize = (
  element: Element,
  callback: ResizeCallback,
): (() => void) => {
  const shared = ensureObserver();
  if (!shared) return () => {};

  let listeners = callbacks.get(element);
  if (!listeners) {
    listeners = new Set();
    callbacks.set(element, listeners);
    shared.observe(element);
  }
  listeners.add(callback);

  return () => {
    const current = callbacks.get(element);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) {
      callbacks.delete(element);
      shared.unobserve(element);
    }
  };
};
