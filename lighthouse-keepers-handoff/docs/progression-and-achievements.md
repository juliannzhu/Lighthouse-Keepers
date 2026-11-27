# Progression and achievements

> Data: `design-system/data/badges.json`, `ranks.json`, `lampLight.json`, `chartRegions.json`, `passengers.json`, `economy.json`.
> Mockups: `design-system/reference/previews/Logbook.html`, `KeeperRank.html`, `BayChart.html`, `RescueAlbum.html`, `LanternString.html`.
> Status: **five options for the team to choose from.** They can be combined; see the suggested combos at the end.

## Ground rules for any reward system in this game

These come from the design doc's biggest risk: practice turning into pressure.

1. **Cumulative only.** Points, badges and collections never go down, reset or expire.
2. **No streaks that can break.** Missed days cost nothing.
3. **Team results only.** Rewards come from what the Keeper and Pilot did together. Nothing compares the child to other children, and there are no leaderboards.
4. **Reward positive events, never count lapses.** Count steady beams, flares and boats home, never "time below threshold".
5. **No attention numbers on the child's screens.** Progress bars show badge progress, not attention.
6. **No random rewards.** The child can always see what they're working toward.

## Option A · Keeper's Logbook (badges)

18 badges in 5 groups: Light, Rescue, Explorer, Together, Keeper. Each badge is a medallion with a bronze, silver or gold ring (`hull`, `crest`, `lamp`), a sprite in the middle, a description and an 8-segment progress bar. Earning a badge pays 5–20 sea stars by tier.
*Rewards:* long-term goals, variety. *Build cost:* low (counters + one screen).

## Option B · Keeper Rank (levels)

"Lamp light" points from everything (1 per passenger, 2 per steady beam, 5 per flare, 10 per night, 15 per Storm Ship) climb 6 ranks: Deckhand → Lamp Lighter → Keeper → Head Keeper → Harbour Master → Lighthouse Legend. The rank screen is a tower whose windows light floor by floor, with the Keeper avatar standing at their current floor. Ranks unlock things that can't be bought: lighthouse styles, the captain cap, golden lamp glass, and their name on the door.
*Rewards:* a clear sense of growing. *Build cost:* low.

## Option C · Bay Chart (exploration map)

The design doc already says revealed rocks stay on a chart of the bay. This option makes that a collection. The chart is drawn as an ink map on chart paper (`sail` paper, `hull-dark` ink). It is split into 4 named regions (Gull Point, Kelp Shallows, Whale Deep, Storm Reach), and uncharted squares are fogged. Each steady-beam reveal inks something in; finishing a region pays sea stars and a decoration.
*Rewards:* curiosity; ties directly to steady beams. *Build cost:* medium (persistent reveal map).

## Option D · Rescue Album (collection)

Every boat carries named passengers (Fisher Fran, Old Gus, Captain Rowe…). The first time one comes home, their sticker fills in. Unmet ones show as a silhouette with "???". A "Special guests" page collects the whale, seals, puffin and otter from obstacles and islands.
*Rewards:* collecting and characters; makes rescue feel personal. *Build cost:* medium (passenger names on boats + album screen). Avatars reuse `LK.avatar()` with different hats, coats and skins.

## Option E · Lantern String (attendance without streaks)

Each finished night adds a lantern to a string across the harbour. Lanterns never go out. Every 7th is a big festival lantern that triggers a harbour festival at the next Dawn (bunting and lit boats, **no fireworks or flashing**) and pays 10–20 sea stars.
*Rewards:* coming back; safe for kids who miss days. *Build cost:* low.

## Suggested combinations

- **Minimum version (fits the 6-week timeline):** Sea stars + shop, plus **E** (Lantern String) and a 6–8-badge subset of **A**.
- **Richer:** sea stars + shop + **A** + **B**. Badges and ranks share the same counters.
- **Most on-theme:** **C** (Bay Chart) + **D** (Rescue Album). Both grow out of the core loop: revealing with the beam and bringing people home.

## Counters to store per family (all options use these)

`passengersHome`, `boatsHome`, `steadyBeams`, `flares`, `stormShipsHome`, `nightsPlayed`, `routesCompleted`, `rocksRevealed`, `chartCells[]`, `passengersMet[]`, `specialGuestsSeen[]`, `decorationsOwned[]`, `decorationsPlaced{slot: id}`, `seaStars`, `lampLight`.
Store them locally (e.g. `localStorage` or a small JSON file through the Node bridge). Nothing needs a server.
