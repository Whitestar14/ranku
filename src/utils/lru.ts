/** Evicts the oldest insertions from a Map or Set until it fits `max`. */
export const boundCache = (
  store: Map<unknown, unknown> | Set<unknown>,
  max: number,
): void => {
  while (store.size > max) {
    const oldest = (store instanceof Map ? store.keys() : store.values()).next()
      .value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
};
