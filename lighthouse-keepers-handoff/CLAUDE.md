# CLAUDE.md — Lighthouse Keepers

This repo is **Lighthouse Keepers**, a CS 399 team project (Tarunvir Randhawa, Juliann Zhu, Mane Muradyan, Bella Chen, Fall 2026). It is a two-player cooperative EEG neurofeedback game for children with ADHD (aged about 7–12) and a parent. The child (the **Keeper**) wears a consumer EEG headset, and their sustained attention powers a lighthouse beam that cuts through fog. The parent (the **Harbour Pilot**) draws routes that guide boats home through the lit water. Neither player can win alone, and there is no losing state.

Read these before writing code:

1. `docs/design-document.md`: the full design document. It explains what the game is, why it works this way, the session structure and the EEG rules.
2. `docs/design-system.md`: the art direction and UI rules, including the colour, feedback, interface and copy rules.
3. `docs/tides-and-obstacles.md`: how Tide 1, 2 and 3 differ, the obstacle menu and the island shapes.
4. `docs/shop-and-decorating.md`: sea stars, the full-screen shop, the bag and decorate mode.
5. `docs/progression-and-achievements.md`: five reward-system options and the ground rules all of them follow.
6. `design-system/tokens.json`: the source of truth for every colour, font, spacing and art-scale value.
7. `design-system/data/*.json`: catalogues for obstacles, tides, islands, decorations, slots, badges, ranks, chart regions, passengers, the economy, and every sprite as pixel strings.
8. `design-system/reference/`: a working prototype of all the art and screens in plain JS and canvas. Open `reference/index.html` through a local server to see every screen in every palette.

## Stack (from the design doc)

- **Game:** Phaser 3 + TypeScript web app.
- **Bridge:** a Node.js process that reads the EEG headset and sends attention and signal-quality values to the game and to the parent's settings screen over WebSockets.
- **Simulator:** a keyboard simulator replaces the headset during development, so the game must run without hardware.
- **Timeline:** six weeks. The Storm Ship, decorations, the shop and reward systems are optional if time runs short.

If the repo doesn't have a project scaffold yet, use Vite + TypeScript + Phaser 3, with the bridge in its own `bridge/` folder. Confirm with the team before adding other major dependencies.

## Core game loop

The Keeper holds attention → the beam widens → the Pilot draws a route → the boat moves through lit water. Boats wait in darkness and never sink. Hidden obstacles appear only under a **steady beam** (attention above the threshold for the full hold time). **Three steady beams trigger a flare** that lights the whole bay. The result = passengers rescued, compared only with the family's own past sessions.

**A session is one night, about 12 minutes:**
1. Lamp Lighting (~1 min): the headset connects and the lamp frost clears as the signal improves.
2. Calm Waters (~1 min): no boats. The beam responds and a guide shows an upright, calm posture.
3. Three Tides (3 × ~3 min, short rests between). Each tide adds one new idea; see `docs/tides-and-obstacles.md`.
4. Storm Ship (end of tide 3): a big ship in thick fog. Its channel is found only with a steady beam.
5. Dawn (~1 min): the fog lifts, the remaining boats are towed in, the team summary appears, sea stars are earned, and the child can shop and decorate.

## Non-negotiable rules

These come from the design doc and the research behind it (Antle et al.'s strong concepts). Don't trade them away for convenience.

- **The beam never goes fully dark.** Below the threshold it narrows to a lamp glow (`lamp`).
- **Smooth the attention signal and ease beam changes over about 1 second.**
- **No numeric attention score on the child's screen.** Numbers appear only on the parent's settings screen.
- **No losing state and no failure colours.** Nothing sinks a boat: a bump means a 2-second bob and a new route. Poor signal shows as frost (`frost`), never red.
- **No flashing or strobing.** The flare and festivals are slow blooms. No fireworks.
- **The Keeper has no input during rounds** (brain-free input). All routing is the Pilot's. **The HUD Shop button sleeps during tides** and opens only at rests, in Calm Waters and at Dawn.
- **Rewards are cumulative and team-based.** No streaks that break, no leaderboards, no random rewards, no real money, and sea stars are never taken away.
- **Report team results only**, e.g. "Together you brought 14 passengers home."
- **The parent adjusts settings between rounds**, never mid-round.
- **Copy:** calm, short, physical and encouraging. Never "Focus!" and never "Not enough stars" ("4 more stars to go"). Sentence case, no emoji.
- **Text is at least 16px** in game.

## Art rules (summary — full version in `docs/design-system.md`)

- Draw at **240 × 135 art pixels** and scale by integers only. In Phaser: `pixelArt: true`, `roundPixels: true`, and a game size of 240×135 with `Scale.FIT` or integer zoom.
- **Use colours only from `design-system/palettes.ts`** (generated from tokens.json). Never hard-code hex values.
- The beam (`beam`, `beam-core`) is always the brightest thing on screen.
- Blend with 4×4 ordered (Bayer) dithering, not alpha gradients. Give sprites 1px `outline` borders.
- HUD goes in the corners only: tide panel + Shop button top-left, steady-beam pips top-right, boats home bottom-left, guide bubble bottom-right.
- The parent screens are **not** pixel art (Atkinson Hyperlegible `parent-*` styles).

## Using the design-system files

- `tokens.json` is the source of truth. If it changes, regenerate `tokens.css` and `palettes.ts`.
- `palettes.ts` exports `PALETTES[themeId]` (camelCase roles such as `seaDeep` and `beamCore`), `toHex()` for Phaser, `DEFAULT_THEME` and `ART`.
- `data/sprites.json` contains every sprite as an array of strings, one character per pixel, mapped to colour roles (key in `data/sprites.README.json`). Build Phaser textures from these at boot for the active palette, so a palette swap only needs a texture regeneration.
- `data/*.json` catalogues are the content. Import them rather than retyping lists. They are prototype content, so the team may trim them.
- `reference/lk-kit.js` is **prototype reference, not production code**. Port its ideas to TypeScript:
  - `harbour()`: the scene renderer (sky, sea, fog noise, beam cone, island, lighthouse, rocks, boats, route). Its `underlay` hook shows where obstacles and islands go, which is between the beam and the boats.
  - `lit()` inside `harbour()`: the beam formula. The cone half-angle is `0.035 + 0.3 × attention`, its length is `(0.32 + 0.78 × attention) × width`, and it fades in between attention 0.08 and 0.25.
  - `drawObstacle()`, `drawIsland()` (islands from ellipse footprints + holes + cliff), `paintTower()`, `decoratedScene()` (slot anchors), `itemTile()`, `badge()`, `bayChart()`.

## Open design decisions (the team hasn't chosen yet)

Build with the defaults below. Keep each choice a config value so it can change later. Ask the user when a choice matters.

| Decision | Options | Default until decided |
| --- | --- | --- |
| Palette | `harbour-night`, `sea-glass`, `slate-lantern`, `deep-fjord`, `dusk-harbour`, `foggy-dawn`, `storm-ink` | `harbour-night` (+ `storm-ink` as high-contrast setting) |
| Fog style | banded, dithered, puffy | banded |
| Lighthouse | classic striped, stubby, stone + cottage | classic striped |
| Art resolution | 160×90, 240×135, 320×180 | 240×135 |
| Obstacles per tide | menu in `data/obstacles.json` | the plans in `data/tides.json` |
| Islands | 12 shapes in `data/islands.json` | Pebble Islet → Crescent Isle → Arch Rock |
| Decorations | 66 items in `data/decorations.json` | all; trim if needed |
| Reward system | A Logbook, B Keeper Rank, C Bay Chart, D Rescue Album, E Lantern String | minimum: sea stars + shop + E + a few A badges |
| Shop during tides | asleep (default) / opens and pauses the tide | asleep |

## Suggested build order (minimum version first)

1. Scaffold Phaser + TS at 240×135 with integer scaling. Load the palette and build sprite textures from `data/sprites.json`.
2. Attention input: a keyboard simulator (for example, hold Space) and a WebSocket client feeding one smoothed `attention` (0–1) plus `signalQuality`.
3. Scene: sky, sea, fog, and the beam driven by `attention`; the steady-beam timer, then the flare.
4. Boats: spawn at the fog edge, wait in darkness, follow the Pilot's route through lit water, dock.
5. The Pilot's route drawing and the passenger counter.
6. Session flow: Lamp Lighting → Calm Waters → three Tides with rests → Dawn summary.
7. Tide variety: load `data/tides.json` and add obstacles one tide at a time (Tide 1 first).
8. Parent settings screen (HTML is fine).
9. Node EEG bridge.
10. Sea stars + shop popup + decorate mode (`docs/shop-and-decorating.md`); save to `localStorage`.
11. Chosen reward system(s) (`docs/progression-and-achievements.md`).
12. Optional: Storm Ship, islands, Keeper avatar choice.
