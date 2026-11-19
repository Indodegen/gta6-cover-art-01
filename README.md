# Neon Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Indodegen/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Indodegen/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Entry for the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) (`gta6-cover-art-01`).

Turn any photo and a caption into multi-panel GTA-poster-style cover art — offline, in your browser, with your photos never leaving your machine.

## What it does

- **6 multi-panel layouts** — Vice Grid (9 panels), Hero + Three, Tilted Snapshots, Full Bleed, Duo Split, Triptych.
- **Any photo** — upload your own photos or use the two free sample photos; fill several panels with one photo or several. Click a panel to select it, drag to move the photo, scroll to zoom, per-panel zoom slider.
- **6 sunset / neon grades** — Vice Sunset, Neon Night, Palm Gold, Teal Noir, Bubblegum, Mono Noir, with gradient-map overlays, sun rays, film grain, vignette and halftone title dots.
- **Bold caption lettering** — gradient title block with outline, script subtitle, badge ribbon and a 5-star heat meter.
- **Fast export** — one click exports PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080; "Export all 3 sizes" does all three at once.
- **Undo / redo** (Ctrl+Z / Ctrl+Y), Surprise-me randomizer, Ctrl+S quick export.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request, no dependencies. `app/` is plain static files.

## Originality

All art, lettering and effects are this app's own. No Rockstar Games logo, artwork or font is used anywhere. The two sample photos under `app/samples/` were made with an image model for make.fun and are free to use.

## License

MIT — see [LICENSE](LICENSE).
