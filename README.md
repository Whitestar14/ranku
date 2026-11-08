![Ranku banner](./public/banner.png)

# Ranku - modern anime ranking app

Ranku is a local-first board for ranking anime supporting three layouts (grid, ordered list and a tier list) and a shared library of images for storing posters across projects. It's built for those who want an easy, stress-free alternative to building 3x3 grids or creating seasonal anime listings without having to reach for an image editor.

Everything is stored in your browser.

[Website](https://tryranku.vercel.app) | [Contributing](#contributions)

## Capabilities

![Ranku demo](./public/demo.gif)

- Three board layouts of a grid up to 50 x 20, an ordered list, and a tier list
- A shared image library with collections, multi-select, bulk move/delete, and drag-and-drop in both directions between the library and any board
- Poster and cover search across anime, manga and characters on MyAnimeList (through Tenrai) and AniList, with automatic fallback when one is down or slow
- Per-tile crop and adjust
- Export to PNG or JPG at 1x, 2x or 3x, padded or trimmed to the artwork, or copy the board to the clipboard
- A blend of iOS-inspired design with some 8-bit aesthetics (I don't own an iOS device and so this is mostly guided by Medium articles and very loosely on Apple's HIG, therefore expect some roughness around the edges)
- Designed with mobile in mind

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm test
```

The app needs no server and no API keys. Search talks to Tenrai and AniList directly, and both CDNs serve posters with the CORS headers an export needs.

The Flask app in `backend/` still holds the old image and metadata proxy. Nothing calls it now, so its routes are parked behind `PROXY_ENABLED` in `backend/app.py`. It stays in the repo for the extra catalogues planned later.

## Known Issues

Tenrai is still in beta and its v1 endpoints are interim, so the provider is pinned to the shape those endpoints return today. If a poster fails to load it is retried a couple of times before the tile shows a placeholder, and an export simply leaves that tile blank rather than failing the whole render.

## Requirements

React 19, TypeScript, Zustand, TailwindCSS 4, Motion, dnd-kit, and html-to-image.

## Contributions

If you have a bug you want to fix or a feature you want to add, feel free to create a PR. All contributions are welcome.

## License

MIT

Built with &#x2764; and maintained by [Whitestar14](https://github.com/Whitestar14).
