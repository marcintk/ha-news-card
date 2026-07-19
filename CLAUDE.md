@node_modules/ha-card-shared/CLAUDE-SHARED.md

# ha-news-card

## Design Invariants

Durable behavioral/UX constraints. Preserve unless the user explicitly changes them.

- RSS entries render newest-first: sorted ascending by `last_updated` (minutes ago), sliced to
  `limit`
- Slot rotation (`_rotateTimer`) only activates for multi-entity RSS — Polymarket is always a single
  slot
- State subscription fires `_scheduleRender()` (500 ms debounce); render always reads
  `_hass.states`, never the event payload
- Theming: `--ha-news-title-color` CSS variable injected via inline style on `<ha-card>`; two-layer
  pattern with fallback in `CARD_STYLES`
- Error state: renders inline `<ha-card>` with red message — never throws to the HA framework
- Image fallback: `onImgError` swaps broken images to the HA brand icon

## Architecture Notes

- **Slots**: `setConfig()` builds `_slots: Slot[]` from `config.source` — one per RSS entity or one
  for a Polymarket source. `_slotIdx` rotates on `setInterval` (`rotate_every` seconds, default 60).
- **Render trigger**: state change events fire `_scheduleRender()` (500 ms debounce). Rendering
  always reads `_hass.states` — never the event payload.
- **Color theming**: two-layer CSS variable pattern — `var(--ha-news-<name>-color, <fallback>)`. To
  add a new overridable color: add the variable + fallback in `CARD_STYLES`, add the option to
  `CardConfig`, inject it as an inline style on `<ha-card>` in `_render()`.
