import { html, nothing, type TemplateResult } from "lit";
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
  const fmt = (n: number, u: string) =>
    seconds < 0 ? `in ${n} ${u}${n === 1 ? "" : "s"}` : `${n} ${u}${n === 1 ? "" : "s"} ago`;
  if (abs >= 31536000) return fmt(Math.floor(abs / 31536000), "year");
  if (abs >= 2592000) return fmt(Math.floor(abs / 2592000), "month");
  if (abs >= 86400) return fmt(Math.floor(abs / 86400), "day");
  if (abs >= 3600) return fmt(Math.floor(abs / 3600), "hr");
  if (abs >= 60) return fmt(Math.floor(abs / 60), "min");
  if (abs >= 1) return fmt(Math.floor(abs), "sec");
  return `${Math.floor(abs)} secs ago`;
}

export function humanNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function rowBg(i: number): string {
  return i % 2
    ? "var(--secondary-background-color)"
    : "var(--ha-card-background, var(--card-background-color, transparent))";
}

export function rssHtml(attrs: RssAttributes, limit: number, title: string): TemplateResult {
  const entries = [...(attrs.entries ?? [])]
    .sort((a, b) => (a.last_updated ?? 0) - (b.last_updated ?? 0))
    .slice(0, limit);

  return html`
    <div class="news-title">${title}</div>
    <table class="news-table">
      <colgroup>
        <col class="img-col" />
        <col />
      </colgroup>
      ${entries.map(
        (item, i) => html`
          <tr style="background-color:${rowBg(i)}">
            <td class="rss-img-cell">
              <img src="${item.image ?? item.picture ?? DEFAULT_IMAGE}" class="rss-thumb" @error=${onImgError} />
            </td>
            <td class="rss-text-cell">
              <div class="rss-text-inner">${item.title}<span class="rss-time">&nbsp;(${formatTimeMins(item.last_updated ?? 0)})</span></div>
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
        <col class="img-col" />
        <col />
      </colgroup>
      ${events.map((event, i) => {
        const bg = rowBg(i);
        const title =
          event.title.length > titleLength ? `${event.title.slice(0, titleLength)}…` : event.title;
        const markets = Array.from({ length: marketLimit }, (_, i) => event.markets[i] ?? null);
        return html`
          <tr style="background-color:${bg}">
            <td class="poly-img-cell">
              <img src="${event.icon}" class="poly-thumb" @error=${onImgError} />
            </td>
            <td class="poly-text-cell">
              <div class="poly-event-title">${title}</div>
              <div class="poly-data-row">
                <div class="poly-market-titles">
                  ${markets.map((m, mi) => html`<span>${m ? `${mi + 1}. ${m.title}` : nothing}</span>`)}
                </div>
                <div class="poly-num">
                  ${markets.map((m) => html`<span>${m ? humanNumber(m.liquidity) : nothing}</span>`)}
                </div>
                <div class="poly-num">
                  ${markets.map((m) => html`<span>${m ? humanNumber(m.volume24hr) : nothing}</span>`)}
                </div>
                <div class="poly-num">
                  ${markets.map((m) => html`<span>${m ? `${m.winPrice.toFixed(1)}%` : nothing}</span>`)}
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
