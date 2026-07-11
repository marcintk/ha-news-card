# News Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![GitHub Release](https://img.shields.io/github/release/marcintk/ha-news-card.svg)](https://github.com/marcintk/ha-news-card/releases)
[![License](https://img.shields.io/github/license/marcintk/ha-news-card.svg)](https://github.com/marcintk/ha-news-card/blob/main/LICENSE)
[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/marcintk/ha-news-card)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/marcintk/ha-news-card/actions/workflows/build-and-test.yml)
[![Lines of code](https://sloc.xyz/github/marcintk/ha-news-card/?category=code)](https://github.com/marcintk/ha-news-card)
[![CI](https://github.com/marcintk/ha-news-card/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/marcintk/ha-news-card/actions/workflows/build-and-test.yml)

Home Assistant custom Lovelace card displaying news from RSS feeds and
[Polymarket](https://polymarket.com) prediction events — one card, two plugins, a single unified
layout with a large thumbnail on the left and headline text on the right.

## Requirements

The card reads data from Home Assistant sensor entities. You need at least one of:

- **RSS plugin** — any HA integration that stores feed entries in a sensor's `attributes.entries`
  array (e.g. the [feedparser](https://github.com/custom-components/feedparser) HACS integration).
  Each entry should expose `title`, `last_updated` (minutes since published), and optionally `image`
  / `picture`.
- **Polymarket plugin** — a sensor whose attributes contain a `events` array of Polymarket
  prediction markets (e.g. a custom REST/template sensor scraping the Polymarket API). Each event
  should expose `title`, `icon`, `liquidity`, `volume24hr`, `endsAt`, and a `markets` array.

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

### RSS feed

```yaml
type: custom:ha-news-card
plugin: rss
entity: sensor.abc_feed
title: ABC News
limit: 7
height: 560px
```

### Polymarket events

```yaml
type: custom:ha-news-card
plugin: polymarket
entity: sensor.polymarket_news
limit: 5
market_limit: 3
height: 400px
```

### Options

| Option         | Type   | Default      | Description                                                   |
| -------------- | ------ | ------------ | ------------------------------------------------------------- |
| `plugin`       | string | **required** | Data source: `rss` or `polymarket`                            |
| `entity`       | string | **required** | Home Assistant entity ID to read                              |
| `title`        | string | entity ID    | Header label shown above the card (RSS only)                  |
| `limit`        | number | `5`          | Maximum number of entries / events to display                 |
| `market_limit` | number | `3`          | Max markets shown per Polymarket event (polymarket only)      |
| `height`       | string | auto         | Card height as a CSS value, e.g. `400px`; omit to fit content |

## Plugins

### RSS

Reads `attributes.entries` from the entity, sorts by `last_updated` ascending (most recent first),
and renders each entry as a row with a **75 × 67 px thumbnail** on the left and the headline plus
relative age on the right. Alternating row backgrounds follow the HA theme
(`--primary-background-color` / `--secondary-background-color`).

Falls back to `https://brands.home-assistant.io` when an entry has no image.

### Polymarket

Reads `attributes.events` from the entity and renders each event as a three-row group:

| Row | Content                                                            |
| --- | ------------------------------------------------------------------ |
| 1   | Event icon (spans all rows) + truncated event title (max 55 chars) |
| 2   | Numbered market titles · Liquidity · 24 h volume · Win %           |
| 3   | Total liquidity & volume · Time until market closes                |

Numbers are abbreviated: `1.2K`, `3.4M`, `5.6G`. The header label is derived automatically from
`attributes.scene` as `PolyMarket (#<scene>)`.

## Development

See [CLAUDE.md](CLAUDE.md) for build commands, contributing guidelines, and release instructions.
