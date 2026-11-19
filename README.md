# Neon Vice Cover Studio

[![make.fun bounty](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2fb3?style=flat-square)](https://make.fun/c/gta6-cover-art-01)
[![make.fun](https://img.shields.io/badge/built%20for-make.fun-7c3aed?style=flat-square)](https://make.fun)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffe259?style=flat-square)](./LICENSE)

A free, offline web app that turns your own photos into a multi-panel
GTA-style poster cover — the Vice City sunset / neon look, bold caption
lettering, exported as a PNG to share.

Built for the make.fun bounty
**[gta6-cover-art-01 — Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01)**.

## What it does

- **Any photo** — upload your own photos from your machine (nothing ever
  uploads), or start with the two free sample photos.
- **Crop and position each photo** — click a panel, drag to pan, scroll to
  zoom, per-panel zoom slider, reset crop.
- **Several panels, one or several photos** — six layouts: Hero Grid,
  Comic Nine, Tilted Snaps, Full Bleed, Split Duo and Story Strips. Fill
  every panel with one photo or shuffle photos across them.
- **Caption** — big condensed title with a sunset gradient and neon glow,
  an italic subtitle, six one-click presets, size and position controls.
- **Five colour grades** — Vice Sunset, Neon Nights, Golden Hour,
  Miami Teal and Noir Drive, plus a retro sun, skyline, palm silhouettes,
  halftone dots, film grain and vignette.
- **Export** — one click per size: **1080 × 1080**, **1080 × 1350** and
  **1920 × 1080** PNG. Undo/redo and a Surprise-me button included.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, font and image is a file
under `app/`. Serve `app/` with any static file server.

## Original art only

No Rockstar Games logo, artwork or font is used anywhere. The lettering is
Noto Sans Condensed Black (SIL Open Font License, see
`app/fonts/OFL.txt`), the sun, skyline, palms and halftone are drawn in
code, and the sample photos were made with an image model for make.fun.

## Layout

```text
app/
  index.html            editor page
  style.css             dark neon editor chrome
  src/
    main.js             bootstrap + sample photos
    editor.js           DOM wiring, drag/zoom, export
    cover-engine.js     canvas renderer: layouts, grades, title
    state.js            layouts, grades, presets, history
  fonts/                Noto Sans (OFL) + OFL.txt
  samples/              boulevard.jpg, pier.jpg (free to use)
screenshots/            cover + editor + exported covers
main.ts                 hands app/ + screenshots/ to /output + dossier.json
serve.ts                tiny static server for local tries
```

## Screenshots

`screenshots/` shows what the app makes and how it works:

1. `1-cover.png` — a wide 1920 × 1080 cover the app exported (Hero Grid,
   Vice Sunset grade), scaled to 1280 × 720.
2. `2-editor.png` — the editor in a browser with a photo loaded.
3. `3-cover-square.png` — a square 1080 × 1080 cover (Comic Nine,
   Neon Nights grade).
4. `4-cover-story.png` — a story 1080 × 1350 cover (Story Strips,
   Golden Hour grade), scaled to 1024 × 1280.

The screenshots were drawn with the project's own script
(`tools/make-screenshots.py`, PIL) from the same layouts, grades and
title treatment the app's canvas engine draws — no headless browser is
available on this machine — using the two free sample photos and
procedural photos drawn by the same script.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library (`vendor/makefun-app.ts`, unchanged from the kit).

## License

MIT — see [LICENSE](./LICENSE).
