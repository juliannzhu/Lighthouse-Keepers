# Lighthouse Keepers

A two-player cooperative EEG neurofeedback game for children with ADHD and a parent (CS 399, Fall 2026).

## What's in this folder

| Path | What it is |
| --- | --- |
| `CLAUDE.md` | Instructions Claude reads automatically when it works in this repo |
| `docs/design-document.md` | The team's design document |
| `docs/design-system.md` | Art direction and UI rules |
| `docs/tides-and-obstacles.md` | How the three tides differ; obstacle and island menus |
| `docs/shop-and-decorating.md` | Sea stars, the shop popup, the bag and decorate mode |
| `docs/progression-and-achievements.md` | Five reward-system options to choose from |
| `design-system/tokens.json` | All colours (7 palettes), fonts, spacing and art scale — the source of truth |
| `design-system/tokens.css` / `palettes.ts` | The same values for HTML screens / for Phaser |
| `design-system/data/` | JSON catalogues: obstacles, tides, islands, decorations, slots, badges, ranks, chart regions, passengers, economy, sprites |
| `design-system/reference/index.html` | Every mockup in every palette (open through a local server) |
| `design-system/reference/lk-kit.js` | Prototype pixel-art renderer the mockups use |

The live design system is also on Claude (private until shared): https://claude.ai/artifact/NvQSpR1v9tnfcuAfaGmVFH

## Viewing the mockups

Run a tiny server from the repo root:

```
python3 -m http.server 8000
```

Then open http://localhost:8000/design-system/reference/ and use the Palette menu at the top. The Shop and Decorate mockups are interactive: switch tabs, buy things, and put decorations on or take them off.
