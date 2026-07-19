@node_modules/ha-card-shared/CLAUDE-SHARED.md @package.json

# ha-news-card

## Module Map

Every `src/*.ts` module has a corresponding `test/*.test.ts`. New source files must ship with their
test file.

| Source file     | Test file                | Responsibility                                                                                       |
| --------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `src/index.ts`  | `test/index.test.ts`     | Custom element class, HA lifecycle hooks, slot rotation, render orchestration, CSS styles            |
| `src/render.ts` | `test/render.test.ts`    | `rssHtml()`, `polymarketHtml()` — Lit HTML generators for each plugin type                           |
| `src/types.ts`  | _(types only, no logic)_ | All shared interfaces: `CardConfig`, `Source`, `RssAttributes`, `PolymarketAttributes`, `Hass`, etc. |

## Architecture Notes

- **Slots**: `setConfig()` builds `_slots: Slot[]` from `config.source` — one per RSS entity or one
  for a Polymarket source. `_slotIdx` rotates on `setInterval` (`rotate_every` seconds, default 60).
- **Render trigger**: state change events fire `_scheduleRender()` (500 ms debounce). Rendering
  always reads `_hass.states` — never the event payload.
- **Color theming**: two-layer CSS variable pattern — `var(--ha-news-<name>-color, <fallback>)`. To
  add a new overridable color: add the variable + fallback in `CARD_STYLES`, add the option to
  `CardConfig`, inject it as an inline style on `<ha-card>` in `_render()`.
