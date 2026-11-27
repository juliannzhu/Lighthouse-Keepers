# Tides, obstacles and islands

> Data: `design-system/data/obstacles.json`, `tides.json`, `islands.json`.
> Mockups: `design-system/reference/previews/TidePlans.html`, `Obstacles.html`, `Islands.html`.
> Status: **options for the team to choose from.** Everything marked "pick" is a menu, not a final list.

## Why the tides differ

The design doc has three tides of about three minutes each. If all three look the same, the second and third feel like repeats. Each tide therefore adds **one new idea** while the Keeper's job stays the same: hold the light steady. Difficulty comes from the *Pilot's* decisions getting richer, not from punishing lapses in attention.

| | Tide 1 · Still Water | Tide 2 · Kelp & Currents | Tide 3 · Storm Rising |
| --- | --- | --- | --- |
| Goal | Learn the loop | Make choices | Hold the light |
| New idea | Hidden rocks + first steady beam | Slow zones; a sandbar that rises mid-round | Currents and an iceberg shelf only a steady beam shows |
| Boats | 3–4 (rowboats, sailboats) | 4–5 (adds fishing boats) | 3 + the Storm Ship |
| Fog | light (`fogDensity` × 0.65) | medium (× 0.8) | thick + rain (× 1.0, `phase: 'storm'`) |
| Obstacles | buoys, driftwood, 2–3 hidden rocks | kelp bed, jellyfish, fishing net, trap line, sandbar, whale, hidden rock cluster | whirlpool, iceberg, sea stacks, shipwreck, ice floes, hidden currents, storm swell |
| Island | 1 small (Pebble Islet) | 1 medium (Crescent Isle) | 1 large (Arch Rock) |

## Rules that apply to every obstacle

1. **Nothing sinks a boat.** A boat that touches a rock, net or shelf stops, bobs for 2 s, and waits for the Pilot to draw a new route. Lost time, never lost boats.
2. **Hidden things appear only under a steady beam** (attention held for the full hold time). Once revealed, they stay revealed for the rest of the night and are inked onto the Bay Chart.
3. Obstacles in fog are drawn faded toward `fog`, like waiting boats. Obstacles in the beam are drawn at full colour.
4. Moving obstacles (driftwood, whale, floes, storm swell) move slowly, at most about one boat-length every 2 seconds. Nothing darts.
5. Nothing is brighter than `beam`. Jellyfish glow in `crest`, not in a bright colour.
6. Obstacle placements are hand-authored per tide (see `tides.json` → `place`, positions as fractions of the 240×135 scene), with a little random jitter (±4 px) so repeat nights feel fresh.

## Obstacle menu (pick)

**Small** (one boat-length or less): Channel buoy · Hidden rock · Driftwood log · Jellyfish bloom · Lobster trap line · Ice floe

**Medium** (blocks a lane): Rock cluster (hidden) · Kelp bed (half speed) · Sandbar (rises mid-tide) · Fishing net · Friendly whale (surfaces for ~8 s) · Current (hidden; pushes boats along its arrows) · Old shipwreck

**Large** (reshapes the bay): Sea stack · Whirlpool (a boat spins once and returns to where it entered) · Iceberg (hidden underwater shelf) · Storm swell (rolls across every ~20 s)

Each entry in `obstacles.json` has `id`, `name`, `size`, `tides` (which tides it may appear in), `reveal` (`always` | `steady`), optional `moves`, and `effect` (the gameplay rule).

## Islands (pick)

Islands are big, static obstacles that shape the routes. They are drawn procedurally from a footprint made of ellipses (minus "holes"), with a cliff under it and foam around it. See `drawIsland()` in `reference/lk-kit.js` and the `blobs`, `holes` and `cliff` fields in `islands.json`.

| Size | Islands | Gameplay hook |
| --- | --- | --- |
| Small | Pebble Islet, Seal Rock, Pine Islet | Landmarks; Pine Islet hides boats behind it from the beam |
| Medium | Crescent Isle, Twin Isles, Long Spit, Gull Cliff | Safe cove (boats inside never drift); lit-only shortcut channel; a wall across the bay; a shadow the beam can't reach |
| Large | Horseshoe Lagoon, Arch Rock, Pine Forest Isle, Old Keeper's Ruins, Turtle Island | Lagoon safe from currents; sail through the arch only while lit; cabin lights when boats dock; lighting the ruins earns a badge; turtle-shaped favourite |

Suggested: one island per tide, getting bigger each tide (small → medium → large).

## Implementation notes

- Add an `obstacles` layer between the fog/beam layer and the boats (the reference renderer does this through the `underlay` hook in `LK.harbour()`).
- Collision: give each obstacle a simple rectangle or circle hitbox in art pixels. Route drawing should snap away from *revealed* hazards but must allow routes through *unrevealed* ones (the Keeper's steady beam is what makes the Pilot's job easier).
- Slow zones (kelp, jellyfish) multiply boat speed by 0.5 while inside.
- The sandbar's appearance should be telegraphed: 3 seconds of shallow ripples before it rises.
