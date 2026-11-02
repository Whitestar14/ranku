/** Window event asking the dock to re-open. See `requestDockExpand`. */
export const DOCK_EXPAND_EVENT = "dock-expand";

/** Window event asking the dock to open if closed and close if open. */
export const DOCK_TOGGLE_EVENT = "dock-toggle";

export function requestDockToggle() {
  window.dispatchEvent(new CustomEvent(DOCK_TOGGLE_EVENT));
}

export function requestDockExpand(ms = 320) {
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(DOCK_EXPAND_EVENT));
  }, ms);
}
