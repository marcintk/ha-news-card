@node_modules/ha-card-shared/CLAUDE-SHARED.md @package.json

# ha-news-card

## Module Map

Every `src/*.ts` module has a corresponding `test/*.test.ts`. New source files must ship with their
test file.

| Source file           | Test file                   | Responsibility                                                                                       |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/index.ts`        | `test/index.test.ts`        | Custom element class, HA lifecycle hooks, slot rotation, render orchestration, CSS styles            |
| `src/render.ts`       | `test/render.test.ts`       | `rssHtml()`, `polymarketHtml()` — Lit HTML generators for each plugin type                           |
| `src/subscription.ts` | `test/subscription.test.ts` | `SubscriptionManager` — WebSocket subscribe/unsubscribe with stale-gen guard                         |
| `src/types.ts`        | _(types only, no logic)_    | All shared interfaces: `CardConfig`, `Source`, `RssAttributes`, `PolymarketAttributes`, `Hass`, etc. |

## Architecture Notes

- **Shadow DOM / Lit rendering**: Lit's `render()` patches the shadow DOM on every render —
  efficient diffing, no full `innerHTML` replacement.
- **Slot rotation**: `buildSlots()` flattens `config.sources` into a `Slot[]` — one entry per RSS
  entity or Polymarket entity. `_slotIdx` advances on a `setInterval` (`rotate_interval` seconds,
  default 10). Only one slot is rendered at a time.
- **WebSocket subscription**: card subscribes to `state_changed` events on first `set hass`;
  callback calls `_scheduleRender()`, which arms a 500 ms debounce timer. Rendering always uses
  `_hass.states`, not the event payload.
- **Security**: Lit auto-escapes all interpolated text values in `html` templates — no manual
  escaping needed in render paths.
- **Color theming**: overridable colours use a two-layer CSS variable pattern —
  `var(--ha-news-<name>-color, <theme-or-hardcoded-fallback>)`. The card injects
  `--ha-news-<name>-color` as an inline style on `<ha-card>` when the matching `CardConfig` option
  is set. Static styles stay static; only the variable value changes per render. New overridable
  colours follow the same pattern: add the CSS variable + fallback in `CARD_STYLES`, add the option
  to `CardConfig`, and inject it in `_render()`.
