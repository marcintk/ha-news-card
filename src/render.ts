import { html, type TemplateResult } from "lit";
import type { PolymarketAttributes, RssAttributes } from "./types.js";

const DEFAULT_IMAGE = "https://brands.home-assistant.io/homeassistant/icon.png";

function onImgError(e: Event): void {
  const img = e.target as HTMLImageElement;
  if (img.src !== DEFAULT_IMAGE) img.src = DEFAULT_IMAGE;
}

function formatTimeMins(mins: number): string {
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatRelativeTime(datetime: string): string {
  const seconds = (Date.now() - new Date(datetime).getTime()) / 1000;
  const abs = Math.abs(seconds);
  const intervals: { limit: number; name: string }[] = [
    { limit: 31536000, name: "year" },
    { limit: 2592000, name: "month" },
    { limit: 86400, name: "day" },
    { limit: 3600, name: "hr" },
    { limit: 60, name: "min" },
    { limit: 1, name: "sec" },
  ];
  for (const iv of intervals) {
    if (abs >= iv.limit) {
      const count = Math.floor(abs / iv.limit);
      return seconds < 0
        ? `in ${count} ${iv.name}${count === 1 ? "" : "s"}`
        : `${count} ${iv.name}${count === 1 ? "" : "s"} ago`;
    }
  }
  return `${Math.floor(abs)} secs ago`;
}

export function humanNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function rowBg(i: number): string {
  return i % 2 ? "var(--primary-background-color)" : "var(--secondary-background-color)";
}

export function rssHtml(attrs: RssAttributes, limit: number, title: string): TemplateResult {
  const entries = [...(attrs.entries ?? [])]
    .sort((a, b) => (a.last_updated ?? 0) - (b.last_updated ?? 0))
    .slice(0, limit);

  return html`
    <div class="news-title">${title}</div>
    <table class="news-table">
      <colgroup>
        <col style="width:78px" />
        <col />
      </colgroup>
      ${entries.map(
        (item, i) => html`
          <tr style="background-color:${rowBg(i)}">
            <td class="img-cell">
              <img src="${item.image ?? item.picture ?? DEFAULT_IMAGE}" class="thumb" @error=${onImgError} />
            </td>
            <td class="text-cell">
              <div class="text-inner">${item.title}<span class="time">&nbsp;(${formatTimeMins(item.last_updated ?? 0)})</span></div>
            </td>
          </tr>
        `
      )}
    </table>
  `;
}

export function polymarketHtml(
  attrs: PolymarketAttributes,
  eventLimit: number,
  marketLimit: number,
  titleLength = 50
): TemplateResult {
  const events = (attrs.events ?? []).slice(0, eventLimit);
  const scene = attrs.scene ?? "unknown";

  return html`
    <div class="news-title">PolyMarket (#${scene})</div>
    <table class="news-table poly-table">
      <colgroup>
        <col style="width:78px" />
        <col />
      </colgroup>
      ${events.map((event, i) => {
        const bg = rowBg(i);
        const title =
          event.title.length > titleLength ? `${event.title.slice(0, titleLength)}…` : event.title;
        const markets = event.markets.slice(0, marketLimit);
        return html`
          <tr style="background-color:${bg}">
            <td class="poly-icon-cell">
              <img src="${event.icon}" class="poly-icon" @error=${onImgError} />
            </td>
            <td class="poly-content-cell">
              <div class="poly-event-title">${title}</div>
              <div class="poly-data-row">
                <div class="poly-market-titles">
                  ${markets.map((m, mi) => html`<span>${mi + 1}. ${m.title}</span>`)}
                </div>
                <div class="poly-num">
                  ${markets.map((m) => html`<span>${humanNumber(m.liquidity)}</span>`)}
                </div>
                <div class="poly-num">
                  ${markets.map((m) => html`<span>${humanNumber(m.volume24hr)}</span>`)}
                </div>
                <div class="poly-num">
                  ${markets.map((m) => html`<span>${Number.parseFloat(String(m.winPrice)).toFixed(1)}%</span>`)}
                </div>
              </div>
              <div class="poly-footer">
                <span class="poly-summary">L:${humanNumber(event.liquidity)}&nbsp;V:${humanNumber(event.volume24hr)}</span>
                <span class="poly-ends">ends ${formatRelativeTime(event.endsAt)}</span>
              </div>
            </td>
          </tr>
        `;
      })}
    </table>
  `;
}
