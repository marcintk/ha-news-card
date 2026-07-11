# News Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![GitHub Release](https://img.shields.io/github/release/marcintk/ha-news-card.svg)](https://github.com/marcintk/ha-news-card/releases)
[![License](https://img.shields.io/github/license/marcintk/ha-news-card.svg)](https://github.com/marcintk/ha-news-card/blob/main/LICENSE)
[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/marcintk/ha-news-card)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/marcintk/ha-news-card/actions/workflows/build-and-test.yml)
[![Lines of code](https://sloc.xyz/github/marcintk/ha-news-card/?category=code)](https://github.com/marcintk/ha-news-card)
[![CI](https://github.com/marcintk/ha-news-card/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/marcintk/ha-news-card/actions/workflows/build-and-test.yml)

Home Assistant custom Lovelace card displaying news from RSS feeds and
[Polymarket](https://polymarket.com) prediction events — one card, multiple sources, a single
unified layout with a large thumbnail on the left and headline text on the right.

The card rotates through all configured entities on a timer, cycling from RSS feed to RSS feed to
Polymarket and back.

<table>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/marcintk/ha-news-card/main/docs/preview-rss.png" alt="RSS preview" /><br /><sub>RSS feed</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/marcintk/ha-news-card/main/docs/preview-polymarket.png" alt="Polymarket preview" /><br /><sub>Polymarket events</sub></td>
  </tr>
</table>

## Requirements

The card reads data from Home Assistant sensor entities. You need at least one of:

- **RSS plugin** — any HA integration that stores feed entries in a sensor's `attributes.entries`
  array (e.g. the [feedparser](https://github.com/custom-components/feedparser) HACS integration).
  Each entry should expose `title`, `last_updated` (minutes since published), and optionally `image`
  / `picture`.
- **Polymarket plugin** — a sensor whose attributes contain an `events` array of Polymarket
  prediction markets (e.g. a custom REST/template sensor scraping the Polymarket API). Each event
  should expose `title`, `icon`, `liquidity`, `volume24hr`, `endsAt`, and a `markets` array. The
  sensor is expected to rotate its own data (via `attributes.scene`); the card simply displays
  whatever the entity currently holds.

## Installation

### Via HACS (recommended)

1. In HACS → Frontend → click the three-dot menu → **Custom repositories**
   - Repository: `https://github.com/marcintk/ha-news-card` (exact URL)
   - Category: **Dashboard**
2. Search **News Card** → Install
3. Reload your browser
4. Add the card to your dashboard (see Configuration below)

### Manual

1. Download `card.js` from the
   [latest release](https://github.com/marcintk/ha-news-card/releases/latest)
2. Copy it to `<config>/www/ha-news-card/card.js` (create the folder if needed)
3. In Home Assistant → Settings → Dashboards → Resources → **Add resource**
   - URL: `/local/ha-news-card/card.js`
   - Resource type: **JavaScript module**
4. Reload your browser

## Configuration

Add a **Manual card** to your dashboard and paste one of the examples below.

### RSS feeds (rotating between multiple entities)

```yaml
type: custom:ha-news-card
rotate_interval: 10 # seconds per entity
height: 560px
sources:
  - plugin: rss
    entities:
      - entity: sensor.abc_feed
        title: ABC News
      - entity: sensor.wsj_feed
        title: Wall Street Journal
      - entity: sensor.bbc_feed
        title: BBC News
    limit: 7
```

### Polymarket events

```yaml
type: custom:ha-news-card
height: 400px
sources:
  - plugin: polymarket
    entity: sensor.polymarket_news
    event_limit: 5
    market_limit: 3
```

### Combined — RSS and Polymarket on one card

```yaml
type: custom:ha-news-card
rotate_interval: 10
height: 560px
sources:
  - plugin: rss
    entities:
      - entity: sensor.abc_feed
        title: ABC News
      - entity: sensor.bbc_feed
        title: BBC News
    limit: 7
  - plugin: polymarket
    entity: sensor.polymarket_news
    event_limit: 5
    market_limit: 3
```

The card rotates through each entity in order: ABC News → BBC News → Polymarket → ABC News → …

### Top-level options

| Option            | Type   | Default      | Description                                                                    |
| ----------------- | ------ | ------------ | ------------------------------------------------------------------------------ |
| `sources`         | list   | **required** | One or more plugin source blocks (see below)                                   |
| `rotate_interval` | number | `10`         | Seconds to display each entity before advancing to the next                    |
| `height`          | string | auto         | Card height as a CSS value, e.g. `560px`; omit to fit content                  |
| `title_color`     | string | `#2196F3`    | Feed title colour; any CSS value, e.g. `red`, `#ff0000`, `var(--accent-color)` |

### RSS source options

Defined under `sources` with `plugin: rss`.

| Option     | Type   | Default      | Description                                            |
| ---------- | ------ | ------------ | ------------------------------------------------------ |
| `entities` | list   | **required** | List of `{ entity, title? }` objects to rotate through |
| `limit`    | number | `5`          | Maximum number of entries to display per entity        |

### Polymarket source options

Defined under `sources` with `plugin: polymarket`.

| Option         | Type   | Default      | Description                                             |
| -------------- | ------ | ------------ | ------------------------------------------------------- |
| `entity`       | string | **required** | Home Assistant entity ID to read                        |
| `event_limit`  | number | `5`          | Maximum number of events to display                     |
| `market_limit` | number | `3`          | Maximum number of markets shown per event               |
| `title_length` | number | `50`         | Maximum characters of the event title before truncating |

## Plugins

### RSS

Reads `attributes.entries` from the entity, sorts by `last_updated` ascending (most recent first),
and renders each entry as a row with a **75 × 67 px thumbnail** on the left and the headline plus
relative age on the right. Alternating row backgrounds follow the HA theme
(`--primary-background-color` / `--secondary-background-color`).

Falls back to the Home Assistant logo (`https://brands.home-assistant.io/homeassistant/icon.png`)
when an entry has no image or the image URL fails to load.

### Polymarket

Reads `attributes.events` from the entity and renders each event as a single row:

| Area  | Content                                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Left  | Event icon, height fills the row and scales with `market_limit`                                                                                                |
| Right | Truncated event title (default 50 chars) · Numbered market titles with liquidity, 24 h volume, and win % · Total liquidity & volume · Time until market closes |

Numbers are abbreviated: `1.2K`, `3.4M`, `5.6G`. The header label is derived automatically from
`attributes.scene` as `PolyMarket (#<scene>)`. The Polymarket sensor is expected to rotate its own
data externally; the card re-renders whenever the entity state changes.

## Development

See [CLAUDE.md](CLAUDE.md) for build commands, contributing guidelines, and release instructions.
