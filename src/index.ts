/// <reference path="../node_modules/ha-card-shared/globals.d.ts" />
import { html, nothing, render } from "lit";
import { polymarketHtml, rssHtml } from "./render.js";
import { SubscriptionManager } from "./subscription.js";
import type { CardConfig, Hass, PolymarketAttributes, RssAttributes } from "./types.js";

const CARD_STYLES = `
  :host { display: block; }

  ha-card {
    padding: 2px;
    box-sizing: border-box;
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    color: var(--secondary-text-color, darkgray);
    font-size: 18px;
    line-height: 1.2;
    overflow: hidden;
  }

  .news-title {
    color: var(--ha-news-title-color, #2196F3);
    letter-spacing: 0.1em;
    padding: 2px;
    font-weight: normal;
  }

  .news-table {
    width: 100%;
    border-spacing: 0;
    table-layout: fixed;
  }

  .img-cell {
    padding: 4px;
    vertical-align: top;
  }

  .thumb {
    width: 75px;
    height: 67px;
    border-radius: 4px;
    object-fit: cover;
    display: block;
  }

  .text-cell {
    padding: 4px;
    vertical-align: top;
    word-wrap: break-word;
    white-space: normal;
    text-align: left;
    line-height: 1.3;
  }

  .text-inner {
    max-height: 67px;
    overflow: hidden;
  }

  .time {
    font-size: 14px;
    color: var(--secondary-text-color, darkgray);
  }

  .poly-table {
    table-layout: auto;
  }

  .poly-icon-cell {
    position: relative;
    width: 64px;
  }

  .poly-icon {
    position: absolute;
    top: 2px;
    left: 0;
    width: 60px;
    height: calc(100% - 2px);
    object-fit: cover;
    border-radius: 4px;
  }

  .poly-content-cell {
    vertical-align: top;
    padding: 0;
  }

  .poly-event-title {
    font-size: 15px;
    padding: 0 4px;
  }

  .poly-data-row {
    display: flex;
  }

  .poly-market-titles {
    flex: 1;
    font-size: 12px;
    padding: 0 4px;
  }

  .poly-market-titles span,
  .poly-num span {
    display: block;
  }

  .poly-num {
    width: 40px;
    text-align: right;
    font-size: 12px;
    padding: 0 4px;
  }

  .poly-footer {
    display: flex;
    font-size: 10px;
  }

  .poly-summary {
    flex: 1;
    padding: 0 4px;
  }

  .poly-ends {
    padding: 0 4px;
  }
`;

const _STYLE_BLOCK = html`<style>${CARD_STYLES}</style>`;

type RssSlot = { plugin: "rss"; entity: string; title: string; limit: number };
type PolySlot = { plugin: "polymarket"; entity: string; event_limit: number; market_limit: number };
type Slot = RssSlot | PolySlot;

function buildSlots(config: CardConfig): Slot[] {
  const slots: Slot[] = [];
  for (const source of config.sources) {
    if (source.plugin === "rss") {
      for (const ref of source.entities) {
        slots.push({
          plugin: "rss",
          entity: ref.entity,
          title: ref.title ?? ref.entity,
          limit: source.limit ?? 5,
        });
      }
    } else if (source.plugin === "polymarket") {
      slots.push({
        plugin: "polymarket",
        entity: source.entity,
        event_limit: source.event_limit ?? 5,
        market_limit: source.market_limit ?? 3,
      });
    }
  }
  return slots;
}

class HaNewsCard extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config: CardConfig | null;
  private _hass: Hass | null;
  private _renderTimer: ReturnType<typeof setTimeout> | null;
  private _rotateTimer: ReturnType<typeof setInterval> | null;
  private _subscription: SubscriptionManager;
  private _slots: Slot[];
  private _slotIdx: number;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._renderTimer = null;
    this._rotateTimer = null;
    this._subscription = new SubscriptionManager();
    this._slots = [];
    this._slotIdx = 0;
  }

  setConfig(config: CardConfig): void {
    if (!config.sources?.length) throw new Error("sources is required");
    const slots = buildSlots(config);
    if (!slots.length) throw new Error("sources must contain at least one entity");
    this._config = config;
    this._slots = slots;
    this._slotIdx = 0;
    this._startRotation(config);
    this._subscription.clear();
    if (this._hass) {
      this._render();
      this._subscribe();
    }
  }

  set hass(hass: Hass) {
    const isFirst = !this._hass;
    const connChanged = !isFirst && this._hass?.connection !== hass.connection;
    const prev = this._hass;
    this._hass = hass;

    if (isFirst || connChanged) {
      if (connChanged) this._subscription.clear();
      if (this._config) this._render();
      this._subscribe();
      return;
    }

    const changed = this._slots.some((s) => hass.states[s.entity] !== prev?.states[s.entity]);
    if (changed) this._scheduleRender();
  }

  private _startRotation(config: CardConfig): void {
    if (this._rotateTimer) {
      clearInterval(this._rotateTimer);
      this._rotateTimer = null;
    }
    if (this._slots.length <= 1) return;
    const interval = (config.rotate_interval ?? 10) * 1000;
    this._rotateTimer = setInterval(() => {
      this._slotIdx = (this._slotIdx + 1) % this._slots.length;
      if (this._hass && this._config) this._render();
    }, interval);
  }

  private _scheduleRender(): void {
    if (this._renderTimer) return;
    this._renderTimer = setTimeout(() => {
      this._renderTimer = null;
      if (this._hass && this._config) this._render();
    }, 500);
  }

  private _subscribe(): void {
    if (!this._config || !this._hass?.connection) return;
    const ids = new Set(this._slots.map((s) => s.entity));
    this._subscription.subscribe(this._hass.connection, ids, () => this._scheduleRender());
  }

  disconnectedCallback(): void {
    if (this._renderTimer) {
      clearTimeout(this._renderTimer);
      this._renderTimer = null;
    }
    if (this._rotateTimer) {
      clearInterval(this._rotateTimer);
      this._rotateTimer = null;
    }
    this._subscription.clear();
  }

  private _render(): void {
    try {
      if (!this._config || !this._hass) throw new Error("render called before config/hass set");
      const slot = this._slots[this._slotIdx];
      const attrs = this._hass.states[slot.entity]?.attributes ?? {};
      const { height, title_color } = this._config;
      const haCardStyle =
        [
          height && `height:${height};min-height:${height};max-height:${height}`,
          title_color && `--ha-news-title-color:${title_color}`,
        ]
          .filter(Boolean)
          .join(";") || undefined;

      const content =
        slot.plugin === "rss"
          ? rssHtml(attrs as RssAttributes, slot.limit, slot.title)
          : polymarketHtml(attrs as PolymarketAttributes, slot.event_limit, slot.market_limit);

      render(
        html`${_STYLE_BLOCK}<ha-card style=${haCardStyle ?? nothing}>${content}</ha-card>`,
        this._root
      );
    } catch (e) {
      this._showError((e as Error).message);
      // biome-ignore lint/suspicious/noConsole: intentional render error logging
      console.error("ha-news-card render error:", e);
    }
  }

  private _showError(msg: string): void {
    render(
      html`<ha-card>
        <div style="padding:12px;color:var(--error-color,red);font-size:13px;">
          <b>ha-news-card error:</b><br />${msg}
        </div>
      </ha-card>`,
      this._root
    );
  }

  getCardSize(): number {
    if (this._config?.height) {
      const px = Number.parseInt(String(this._config.height), 10);
      if (Number.isFinite(px)) return Math.ceil(px / 50);
    }
    const slot = this._slots[this._slotIdx];
    const limit = slot?.plugin === "rss" ? slot.limit : (slot?.event_limit ?? 5);
    return Math.max(1, Math.ceil((limit * 72) / 50));
  }

  static getStubConfig(): CardConfig {
    return {
      sources: [
        { plugin: "rss", entities: [{ entity: "sensor.abc_feed", title: "ABC News" }], limit: 5 },
      ],
      rotate_interval: 10,
    };
  }
}

customElements.define("ha-news-card", HaNewsCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-news-card",
  name: "News Card",
  description: "Unified news card for RSS feeds and Polymarket events",
  preview: false,
});
