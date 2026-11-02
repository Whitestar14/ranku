/**
 * Compact cache key for an image source. Uploaded images are base64 data URLs,
 * sometimes hundreds of kilobytes; using the source itself as a Map key keeps
 * every byte alive and makes each lookup hash the whole string.
 */
export const imageKey = (src: string): string => {
  if (src.length <= 256) return src;

  let hash = 2166136261;
  for (let i = 0; i < src.length; i += 1) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${src.length}:${(hash >>> 0).toString(36)}`;
};
