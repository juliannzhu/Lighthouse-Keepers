# Shop and decorating

> Data: `design-system/data/decorations.json`, `categories.json`, `slots.json`, `economy.json`.
> Mockups: `design-system/reference/previews/ShopPopup.html`, `DecorateMode.html`, `DecorationCatalog.html`.

## The pieces

1. **Sea stars**: the currency. They are earned from team results (see `economy.json`) and never taken away.
2. **The Sea Star Shop**: a full-screen popup opened from a **Shop** button on the HUD. The child buys decorations here.
3. **The bag**: everything the child owns.
4. **Decorate mode**: a dedicated screen between rounds where the child puts things from their bag onto the lighthouse, or takes them off.

## When the shop can open (important)

The design doc says the Keeper has **no input during rounds** (brain-free input, Antle et al. sec. 5.3). A shop the child can open mid-tide would break attention training. So:

- The Shop button is **always visible** on the HUD, in the top-left next to the tide panel. It shows the sea-star count.
- It is **active during rests between tides, during Calm Waters, and at Dawn**.
- **During a tide it "sleeps"**: it is dimmed and disabled, with a small label "Opens at the next rest". Tapping it does nothing, and it gives no error.
- If the team wants it openable mid-tide anyway, opening it must **pause the tide** (beam, boats and timer). Record that as a team decision.

## Shop popup layout (960×540 stage, covers the whole screen)

- **Awning** strip across the top (alternating `stripe` / `tower`, scalloped bottom edge in `outline`) so it reads as a market stall.
- **Header row:** "Sea Star Shop" (`game-heading`) · purse panel with the star sprite, the number and "sea stars" · **Close ×** button.
- **Left:** 8 category tabs with icons: Toppers, Lights, Paint, Garden, Friends, Dock, Sky, Seasonal. The active tab uses `accent`.
- **Centre:** a 4-column grid of item cards (sprite on `surface`, name, price with star icon). Optional "Today's pick" banner (dashed `accent` border). Tags: NEW, RARE, and the season name.
- **Right:** a preview panel showing **the child's own lighthouse with the item tried on**, the item name, a one-line blurb, where it goes, and the buy button.
- **Buy button states:**
  - Can afford: "Buy for 10".
  - Owned: "In your bag" (disabled).
  - Can't afford: "4 more stars to go" (disabled, never red, never "Not enough").
- **After buying:** a small "Added to your bag!" toast shows for about 1.5 s. Stars update immediately.
- **Accessibility:** every control is a real button; the focus ring is `ink`, 4px; text is ≥16px, except captions at 13–14px.

## Decorate mode (between rounds, and from the shop)

- **Left:** the lighthouse at 6× on its island. Empty spots show a small **+** marker (in `crest`; the selected spot is in `beam`). Tapping a marker filters the bag to things that fit that spot.
- **Right:** a "Your bag" panel with category tabs and a 3-column grid. Each card shows the sprite, the name, where it goes, and one button:
  - **Put on**: the spot is empty.
  - **Swap in**: the spot is taken; the old item goes back to the bag.
  - **Take off**: the item is on the lighthouse; the card has a green ON badge and border.
- **Top bar:** sea-star count, **Shop** button (opens the popup) and **Done**.
- Changes save instantly. There is no "Are you sure?" dialog.

## Spots (slots)

Each spot holds **one** item. See `slots.json` for the anchor offsets relative to the lighthouse base (classic tower, base at `bx, by`).

| Spot | What goes there |
| --- | --- |
| Roof top | flags, weathervane, star, bell, windsock, crown |
| Balcony | bunting, string lights, lanterns, garland, icicles |
| Tower paint | 8 paint styles; always has one (Classic stripes is free and can't be removed, only swapped) |
| Window | curtains, plant, paper star |
| Door | wreath, mat, door lantern, flower arch, boots |
| Garden (left) and Garden (right) | 20 garden items; either side |
| Friend | 8 animals (cat, pup, puffin, seal pup, crab, turtle, otter, Canada goose) |
| Dock | buoy, trap, life ring, anchor, rowboat, rod, crates, dock lantern |
| Sky | kite, hot-air balloon, gulls, paper plane, fireflies |

## Catalogue

66 items in 8 categories, priced 0–12 sea stars. A typical night earns 12–20, so owning everything takes about 25–30 nights. That suits a training programme of many sessions. Seasonal items show in the shop only in their season. Rank rewards (see `progression-and-achievements.md`) are not for sale.

`decorations.json` entry: `id`, `name`, `category`, `slots` (array), `price`, `sprite` (key in `LK.SPRITES`, or null for paint), `blurb`, and optionally `tag` (`new` | `rare`), `season`, `paint` + `color` (paint items), `owned` (starter item).

## Rules

- No random boxes, no timers, no prices that change, no real money.
- Never show the sea-star count during a tide, only on the HUD Shop button (which is asleep then), at rests and at Dawn.
- Decorations show in the main game scene too: the lighthouse the Keeper sees during play is the decorated one.
