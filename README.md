[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bongekanjing/gta6-cover-art-01-neon2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bongekanjing/gta6-cover-art-01-neon2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)
# Neon Coast Cover Studio

An offline browser web app that turns your photos and a caption into
GTA-style multi-panel cover art — the Vice City neon-sunset poster look —
and exports it as a PNG to share. No upload, no account, no network:
everything runs from the static files under `app/`.

## Try it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Open `http://localhost:8080`, add up to 4 photos (or use the sample
photos), pick a layout and a colour grade, edit the caption, click a panel
to crop and position it, then **Export all 3 sizes** — one click writes
PNGs at 1080×1080, 1080×1350 and 1920×1080.

## What it does

- **6 layouts** — Hero + Three, Four Panel Grid, Full Bleed, Tilted
  Snapshot, Triptych, Duo Split — each with inked poster frames.
- **5 colour grades** — Vice Sunset, Neon Nights, Golden Hour, Teal Noir,
  Rose Palm — gradient-map washes over the photos.
- **Any photo** — up to 4 photos from your machine; each panel takes any
  photo, with per-panel zoom and pan. One photo can fill several panels.
- **Caption lettering** — bold gradient title with a hard offset shadow,
  neon script subtitle, halftone title band, plus grain and vignette.
- **Undo / redo**, live preview, and one-click export in all three
  common post sizes.

## Originality

All art is generated from the user's own photos and drawn with canvas.
No Rockstar Games logo, wordmark, official artwork, character or font is
used or shipped; lettering uses system fonts only. The two sample photos
under `app/samples/` were made with an image model for make.fun and are
free to use.

## Screenshots

`shots.json` lists the four screenshots and the scenes that made them:
a square cover, the editor with a photo loaded, a portrait cover and a
wide cover — each rendered by the app itself in headless Chrome via
`?shot=cover` / `?shot=editor` (see `app/src/shots.js`).

## Files

- `app/index.html`, `app/style.css` — editor shell and styling.
- `app/src/cover.js` — the cover engine: layouts, grades, panel drawing,
  title band, grain and vignette.
- `app/src/main.js` — editor wiring: photo loading, controls, history,
  export.
- `app/src/shots.js` — screenshot scenes (`?shot=cover` / `?shot=editor`).
- `main.ts` — entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` (see `serve.ts` to try it locally).
- `shots.json` — the four screenshots and the scenes that made them.

## License

MIT — see `LICENSE`.
