import React from "react";

/**
 * The pixel icon set.
 */
const ICONS = {
  upload: [
    "....#....",
    "...###...",
    "..#.#.#..",
    "....#....",
    "....#....",
    ".........",
    "#.......#",
    "#.......#",
    "#########",
  ],
  image: [
    "#########",
    "#.......#",
    "#.....#.#",
    "#....###.",
    "#...#####",
    "#..#..#.#",
    "#.#####.#",
    "#.......#",
    "#########",
  ],
  library: [
    ".........",
    "###.####.",
    "#.#.#..#.",
    "#.#.#..#.",
    "#.#.#..#.",
    "#.#.#..#.",
    "#.#.#..#.",
    "###.####.",
    ".........",
  ],
  settings: [
    "..#...#..",
    "..#...#..",
    "#########",
    "##.....##",
    "#...#...#",
    "##.....##",
    "#########",
    "..#...#..",
    "..#...#..",
  ],
  search: [
    ".#####...",
    "#.....#..",
    "#.....#..",
    "#.....#..",
    ".#####...",
    "....##...",
    ".....##..",
    "......##.",
    ".........",
  ],
  plus: [
    ".........",
    "....#....",
    "....#....",
    "....#....",
    "#########",
    "....#....",
    "....#....",
    "....#....",
    ".........",
  ],
  /** The three project types. They are the app's top-level nouns, so they get
   *  the same hand-cut treatment as the furniture around them. */
  grid: [
    "####.####",
    "####.####",
    "####.####",
    "####.####",
    ".........",
    "####.####",
    "####.####",
    "####.####",
    "####.####",
  ],
  list: [
    "#..#####.",
    "#..#####.",
    ".........",
    "#..#####.",
    "#..#####.",
    ".........",
    "#..#####.",
    "#..#####.",
    ".........",
  ],
  tiers: [
    "##..###..",
    "##..###..",
    "##..###..",
    "#########",
    "##..###..",
    "##..###..",
    "#########",
    "##..###..",
    "##..###..",
  ],
  /** Status glyphs. */
  check: [
    ".........",
    ".........",
    ".......#.",
    "......#..",
    "#....#...",
    ".#..#....",
    "..##.....",
    ".........",
    ".........",
  ],
  alert: [
    "....#....",
    "...###...",
    "...###...",
    "...###...",
    "...###...",
    ".........",
    "...###...",
    ".........",
    ".........",
  ],
  info: [
    "....#....",
    ".........",
    "...##....",
    "....#....",
    "....#....",
    "....#....",
    "...###...",
    ".........",
    ".........",
  ],
  /** An image frame with a stroke through it: the universal "no preview". */
  broken: [
    ".........",
    "#########",
    "#......##",
    "#.....#.#",
    "#....#..#",
    "#...#...#",
    "#..#....#",
    "#########",
    ".........",
  ],
} as const;

export type PixelIconName = keyof typeof ICONS;

interface IconGeometry {
  d: string;
  cells: number;
}

const geometryCache = new Map<PixelIconName, IconGeometry>();

/** Icons may be any grid size; the path is centred in a square viewBox. */
const iconGeometry = (name: PixelIconName): IconGeometry => {
  const cached = geometryCache.get(name);
  if (cached) return cached;

  const rows = ICONS[name] as readonly string[];
  const width = Math.max(...rows.map((row) => row.length));
  const height = rows.length;
  const cells = Math.max(width, height);
  const offsetX = Math.floor((cells - width) / 2);
  const offsetY = Math.floor((cells - height) / 2);

  let d = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      let run = 1;
      while (row[x + run] === "#") run++;
      d += `M${x + offsetX} ${y + offsetY}h${run}v1h-${run}z`;
      x += run - 1;
    }
  });

  const geometry = { d, cells };
  geometryCache.set(name, geometry);
  return geometry;
};

interface PixelIconProps {
  name: PixelIconName;
  /** Rendered edge length in px; a multiple of 9 keeps every pixel square. */
  size?: number;
  className?: string;
  /** Accessible name. Omit when the icon sits next to a visible label. */
  label?: string;
}

/**
 * An icon registry entry as a ready-made component.
 */
export const pixelIcon = (
  name: PixelIconName,
): React.FC<{ size?: number; className?: string; strokeWidth?: number }> =>
  function PixelGlyph({ size, className, strokeWidth: _ignored }) {
    return <PixelIcon name={name} size={size} className={className} />;
  };

export const PixelIcon: React.FC<PixelIconProps> = ({
  name,
  size = 18,
  className,
  label,
}) => {
  const { d, cells } = iconGeometry(name);
  return (
    <svg
      viewBox={`0 0 ${cells} ${cells}`}
      width={size}
      height={size}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={d} />
    </svg>
  );
};
