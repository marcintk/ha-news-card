# ha-news-card

TypeScript + Rollup → `dist/card.js` | Vitest | Biome + Prettier | HACS plugin

## Commands

```bash
npm install
npm run build          # bundle src/ → dist/card.js
npm run build:prod     # minified build (VERSION env var stamps the bundle)
npm run dev            # rollup watch mode
npm test               # run tests
npm run test:watch     # vitest watch mode
npm run test:coverage  # run with coverage (must stay at 100%)
npm run typecheck      # tsc --noEmit
npm run check          # biome lint + format (src/ and test/, auto-fix)
npm run format:md      # prettier for markdown files
npm run check:ci       # CI gate: typecheck + biome check + prettier check
```

<important if="you are writing or modifying tests, or about to report a task/slice complete">
Run `npm run test:coverage` (not bare `npm test`) before considering work or a slice done — only the
`--coverage` flag enforces the 100% thresholds configured in `vitest.config.mjs`. `npm test` runs the
same suite without checking those thresholds, so a slice can look green under `npm test` while still
failing CI's `test:coverage` gate.
</important>

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
