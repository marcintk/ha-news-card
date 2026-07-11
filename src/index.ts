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
    overflow: hidden;
  }

  .news-title {
    color: #2196F3;
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
    padding: 6px 4px;
    vertical-align: top;
    word-wrap: break-word;
    white-space: normal;
    text-align: left;
  }

  .time {
    font-size: 14px;
    color: gray;
  }

  .poly-table {
    table-layout: auto;
  }

  .poly-icon-cell {
    vertical-align: top;
    padding-top: 2px;
  }

  .poly-icon {
    border-radius: 4px;
  }

  .poly-event-title {
    text-align: left;
    font-size: 15px;
    padding: 0 4px;
  }

  .poly-market-titles {
    text-align: left;
    font-size: 12px;
    padding: 0 4px;
  }

  .poly-market-titles span,
  .poly-num span {
    display: block;
  }

  .poly-num {
    text-align: right;
    font-size: 12px;
    padding: 0 4px;
  }

  .poly-summary {
    text-align: start;
    font-size: 10px;
    padding: 0 4px;
  }

  .poly-ends {
    text-align: end;
    font-size: 10px;
    padding: 0 4px;
  }
`;

const _STYLE_BLOCK = html`<style>${CARD_STYLES}</style>`;

class HaNewsCard extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config: CardConfig | null;
  private _hass: Hass | null;
  private _renderTimer: ReturnType<typeof setTimeout> | null;
  private _subscription: SubscriptionManager;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._renderTimer = null;
    this._subscription = new SubscriptionManager();
  }

  setConfig(config: CardConfig): void {
    if (!config.entity) throw new Error("entity is required");
    if (!config.plugin) throw new Error("plugin is required");
    this._config = config;
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

    const id = this._config?.entity;
    if (id && hass.states[id] !== prev?.states[id] && this._config) {
      this._scheduleRender();
    }
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
    const ids = new Set([this._config.entity]);
    this._subscription.subscribe(this._hass.connection, ids, () => this._scheduleRender());
  }

  disconnectedCallback(): void {
    if (this._renderTimer) {
      clearTimeout(this._renderTimer);
      this._renderTimer = null;
    }
    this._subscription.clear();
  }

  private _render(): void {
    try {
      if (!this._config || !this._hass) throw new Error("render called before config/hass set");
      const { entity, plugin, limit, market_limit, title, height } = this._config;
      const attrs = this._hass.states[entity]?.attributes ?? {};
      const haCardStyle = height
        ? `height:${height};min-height:${height};max-height:${height};`
        : undefined;

      const content =
        plugin === "rss"
          ? rssHtml(attrs as RssAttributes, limit ?? 5, title ?? entity)
          : plugin === "polymarket"
            ? polymarketHtml(attrs as PolymarketAttributes, limit ?? 5, market_limit ?? 3)
            : html`<div style="padding:8px;color:var(--error-color,red);">Unknown plugin: ${plugin}</div>`;

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
    return Math.max(1, Math.ceil(((this._config?.limit ?? 5) * 72) / 50));
  }

  static getStubConfig(): CardConfig {
    return {
      plugin: "rss",
      entity: "sensor.abc_feed",
      limit: 5,
      title: "ABC News",
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
