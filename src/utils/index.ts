import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The app defines its type scale as Tailwind theme values (`text-body`,
 * `text-caption-1`, …). Stock tailwind-merge does not know them, so it treats
 * every one of them as a text colour and drops the variant's `text-primary`
 * when a caller adds a size. Registering the scale keeps colour and size in
 * separate conflict groups.
 */
const FONT_SIZES = [
  "caption-2",
  "caption-1",
  "footnote",
  "subheadline",
  "callout",
  "body",
  "headline",
  "title-3",
  "title-2",
  "title-1",
  "large-title",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
