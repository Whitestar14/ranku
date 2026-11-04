/*
 * Draws the Ranku icon from the app's own bitmap alphabet and writes it as
 * SVG and PNG. Run with `node scripts/make-icons.mjs` after changing the art.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

/** The rail grey the about sheet sits on, one per theme. */
const BACKGROUND_DARK = [0x1c, 0x1c, 0x1e, 255];
const BACKGROUND_LIGHT = [0xf2, 0xf2, 0xf7, 255];

/* Three of the app accents rather than a full spectrum, which at 16px read as
   a pride flag instead of the brand. */
const PINK = [0xff, 0x37, 0x5f, 255];
const TEAL = [0x64, 0xd2, 0xff, 255];
const PURPLE = [0xbf, 0x5a, 0xf2, 255];

const hex = ([r, g, b]) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/** The R from src/components/pixel/pixelFont.ts, so icon and wordmark match. */
const GLYPH = [
  "####.",
  "#...#",
  "#...#",
  "####.",
  "#.#..",
  "#..#.",
  "#...#",
];

const GLYPH_W = GLYPH[0].length;
const GLYPH_H = GLYPH.length;

const ROW_COLORS = [PINK, PINK, TEAL, TEAL, PURPLE, PURPLE, PURPLE];
const rowColor = (row) => ROW_COLORS[row % ROW_COLORS.length];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Draws the icon on a rounded background. */
function render(size, { padding = 0.14, radius = 0.22 } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const corner = size * radius;
  const inner = size * (1 - padding * 2);
  const scale = Math.floor(inner / GLYPH_W) || 1;
  const glyphW = scale * GLYPH_W;
  const glyphH = scale * GLYPH_H;
  const ox = Math.round((size - glyphW) / 2);
  const oy = Math.round((size - glyphH) / 2);

  const insideRounded = (x, y) => {
    const cx = Math.min(x, size - 1 - x);
    const cy = Math.min(y, size - 1 - y);
    if (cx >= corner || cy >= corner) return true;
    const dx = corner - cx;
    const dy = corner - cy;
    return dx * dx + dy * dy <= corner * corner;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!insideRounded(x, y)) continue;
      const gx = Math.floor((x - ox) / scale);
      const gy = Math.floor((y - oy) / scale);
      const lit =
        x >= ox &&
        y >= oy &&
        gx >= 0 &&
        gy >= 0 &&
        gx < GLYPH_W &&
        gy < GLYPH_H &&
        GLYPH[gy][gx] === "#";
      const color = lit ? rowColor(gy) : BACKGROUND_DARK;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = color[3];
    }
  }
  return encodePng(size, size, px);
}

function svg() {
  const rows = GLYPH.map((row, y) => {
    let d = "";
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      let run = 1;
      while (row[x + run] === "#") run++;
      d += `M${x} ${y + 4.5}h${run}v1h-${run}z`;
      x += run - 1;
    }
    return d ? `  <path d="${d}" fill="${hex(rowColor(y))}"/>` : "";
  })
    .filter(Boolean)
    .join("\n");

  /* The badge follows the theme the way the app background does. */
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <style>
    .badge { fill: ${hex(BACKGROUND_DARK)}; }
    @media (prefers-color-scheme: light) { .badge { fill: ${hex(BACKGROUND_LIGHT)}; } }
  </style>
  <rect class="badge" width="16" height="16" rx="3.5"/>
  <g transform="translate(4.5 0)">
${rows}
  </g>
</svg>
`;
}

writeFileSync("public/favicon.svg", svg());
writeFileSync("public/favicon-32.png", render(32, { padding: 0.1, radius: 0.2 }));
writeFileSync("public/apple-touch-icon.png", render(180, { padding: 0.2, radius: 0.16 }));
writeFileSync("public/icon-512.png", render(512, { padding: 0.2, radius: 0.16 }));
process.stdout.write("icons written\n");
