# News Card

Bug or feature request? [Open an issue][new-issue]. Idea, question, or setup to share? [Start a
discussion][discussions].

[![hacs_badge][hacs-shield]][hacs] [![GitHub Release][releases-shield]][releases]
[![License][license-shield]][license] ![Maintenance][maintenance-shield]
[![Coverage][coverage-shield]][ci] [![Downloads][downloads-shield]][releases]

[![CI][ci-shield]][ci] [![CodeQL][codeql-shield]][codeql]
[![OpenSSF Scorecard][scorecard-shield]][scorecard] [![Socket.dev][socket-shield]][socket]

Home Assistant custom Lovelace card displaying news from RSS feeds and
[Polymarket](https://polymarket.com) prediction events — one card, one plugin, a single unified
layout with a large thumbnail on the left and headline text on the right.

Each card uses a single plugin (`rss` or `polymarket`). An RSS card rotates through its configured
entities on a timer; a Polymarket card re-renders whenever the entity state changes.

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
  prediction markets (e.g. the [ha_polymarket](https://github.com/marcintk/ha_polymarket) HACS
  integration). Each event should expose `title`, `icon`, `liquidity`, `volume24hr`, `endsAt`, and a
  `markets` array. The sensor is expected to rotate its own data (via `attributes.scene`); the card
  simply displays whatever the entity currently holds.

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
height: 560px
source:
  plugin: rss
  rotate_every: 10 # seconds per entity
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
source:
  plugin: polymarket
  entity: sensor.polymarket_news
  event_limit: 5
  market_limit: 3
```

### Top-level options

| Option         | Type    | Default      | Description                                                                    |
| -------------- | ------- | ------------ | ------------------------------------------------------------------------------ |
| `source`       | object  | **required** | Plugin source block (see below); one plugin per card                           |
| `height`       | string  | auto         | Card height as a CSS value, e.g. `560px`; omit to fit content                  |
| `title_color`  | string  | `#2196F3`    | Feed title colour; any CSS value, e.g. `red`, `#ff0000`, `var(--accent-color)` |
| `show_version` | boolean | `false`      | Show the card version in the top-right corner                                  |

### RSS source options

Set `source.plugin: rss`.

| Option         | Type   | Default      | Description                                            |
| -------------- | ------ | ------------ | ------------------------------------------------------ |
| `entities`     | list   | **required** | List of `{ entity, title? }` objects to rotate through |
| `limit`        | number | `5`          | Maximum number of entries to display per entity        |
| `rotate_every` | number | `60`         | Seconds to display each entity before advancing        |

### Polymarket source options

Set `source.plugin: polymarket`.

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
relative age on the right. Alternating row backgrounds follow the HA theme: even rows use
`--ha-card-background` (blends with the card surface), odd rows use `--secondary-background-color`.

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

<!-- Reference links -->

[new-issue]: https://github.com/marcintk/ha-news-card/issues/new
[discussions]: https://github.com/marcintk/ha-news-card/discussions
[hacs]: https://hacs.xyz
[hacs-shield]: https://img.shields.io/badge/HACS-Custom-orange.svg
[releases]: https://github.com/marcintk/ha-news-card/releases
[releases-shield]: https://img.shields.io/github/release/marcintk/ha-news-card.svg
[license]: https://github.com/marcintk/ha-news-card/blob/main/LICENSE
[license-shield]: https://img.shields.io/github/license/marcintk/ha-news-card.svg
[maintenance-shield]: https://img.shields.io/maintenance/yes/2026
[ci]: https://github.com/marcintk/ha-news-card/actions/workflows/card-build-and-test.yml
[ci-shield]:
  https://github.com/marcintk/ha-news-card/actions/workflows/card-build-and-test.yml/badge.svg
[coverage-shield]: https://img.shields.io/badge/coverage-100%25-brightgreen
[downloads-shield]:
  https://img.shields.io/github/downloads/marcintk/ha-news-card/total?label=downloads
[codeql]: https://github.com/marcintk/ha-news-card/security/code-scanning
[codeql-shield]:
  https://img.shields.io/github/actions/workflow/status/marcintk/ha-news-card/codeql-analysis.yml?branch=main&label=CodeQL
[scorecard]: https://securityscorecards.dev/viewer/?uri=github.com/marcintk/ha-news-card
[scorecard-shield]:
  https://img.shields.io/ossf-scorecard/github.com/marcintk/ha-news-card?label=OpenSSF&style=flat
[socket]: https://github.com/marcintk/ha-news-card/blob/main/socket.yml
[socket-shield]: https://img.shields.io/badge/Socket.dev-Firewall%20%2B%20Scanning-fb3387.svg
