/**
 * Last-resort diagnostics for failures that have no UI surface
 */
// oxlint-disable-next-line no-console
export const logError = (...args: unknown[]): void => console.error(...args);
