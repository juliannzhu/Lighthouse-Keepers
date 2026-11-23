# Unity design system import

`Source/` contains the complete existing design-system package copied from `lighthouse-keepers-handoff/design-system`, including the token source, CSS and TypeScript palette representations, pixel-art kit, and all reference previews. The kit's sprites are procedural pixel maps in `Source/reference/lk-kit.js`; there were no separate sprite PNGs in the original design system.

`Runtime/LighthousePaletteCatalog.cs` is a Unity-native color lookup generated from `Source/tokens.json`. Use `LighthousePaletteCatalog.TryGetColor(themeId, role, out color)` or `TryGetHex(...)`. The default theme is `harbour-night`. Token role strings retain their source names, such as `sky-deep`, `beam-core`, and `surface-raised`.

The source-of-truth tokens remain in `Source/tokens.json`.
