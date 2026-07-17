/// <reference path="../node_modules/ha-card-shared/globals.d.ts" />
import { html, nothing, render } from "lit";
import CARD_STYLES from "./card.css";
import { polymarketHtml, rssHtml } from "./render.js";
import { SubscriptionManager } from "./subscription.js";
import type { CardConfig, Hass, PolymarketAttributes, RssAttributes, RssSource } from "./types.js";

type RssSlot = { plugin: "rss"; entity: string; title: string; limit: number };
type PolySlot = {
  plugin: "polymarket";
  entity: string;
  event_limit: number;
  market_limit: number;
  title_length: number;
};
type Slot = RssSlot | PolySlot;

function buildSlots(config: CardConfig): Slot[] {
  const { source } = config;
  if (source.plugin === "rss") {
    return source.entities.map((ref) => ({
      plugin: "rss" as const,
      entity: ref.entity,
      title: ref.title ?? ref.entity,
      limit: source.limit ?? 5,
    }));
  }
  if (source.plugin === "polymarket") {
    return [
      {
        plugin: "polymarket" as const,
        entity: source.entity,
        event_limit: source.event_limit ?? 5,
        market_limit: source.market_limit ?? 3,
        title_length: source.title_length ?? 50,
      },
    ];
  }
  return [];
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
    if (!config.source) throw new Error("source is required");
    const slots = buildSlots(config);
    if (!slots.length) throw new Error("source must contain at least one entity");
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
    if (this._slots[0]?.plugin !== "rss" || this._slots.length <= 1) return;
    const interval = ((config.source as RssSource).rotate_every ?? 60) * 1000;
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
      if (!this._config || !this._hass) return;
      const slot = this._slots[this._slotIdx];
      const attrs = this._hass.states[slot.entity]?.attributes ?? {};
      const { height, title_color } = this._config;
      const heightStyle = height
        ? `height:${height};min-height:${height};max-height:${height}`
        : "";
      const colorStyle = title_color ? `--ha-news-title-color:${title_color}` : "";
      const haCardStyle = [heightStyle, colorStyle].filter(Boolean).join(";") || undefined;

      const content =
        slot.plugin === "rss"
          ? rssHtml(attrs as RssAttributes, slot.limit, slot.title)
          : polymarketHtml(
              attrs as PolymarketAttributes,
              slot.event_limit,
              slot.market_limit,
              slot.title_length
            );

      const versionBadge = this._config.show_version
        ? html`<div class="card-version">v${__CARD_VERSION__}</div>`
        : nothing;
      render(
        html`<style>${CARD_STYLES}</style><ha-card style=${haCardStyle ?? nothing}>${versionBadge}${content}</ha-card>`,
        this._root
      );
    } catch (e) {
      render(
        html`<ha-card>
          <div style="padding:12px;color:var(--error-color,red);font-size:13px;">
            <b>ha-news-card error:</b><br />${(e as Error).message}
          </div>
        </ha-card>`,
        this._root
      );
      // biome-ignore lint/suspicious/noConsole: intentional render error logging
      console.error("ha-news-card render error:", e);
    }
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
      source: {
        plugin: "rss",
        entities: [{ entity: "sensor.abc_feed", title: "ABC News" }],
        limit: 5,
        rotate_every: 60,
      },
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
