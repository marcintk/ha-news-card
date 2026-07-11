import { describe, expect, it, vi } from "vitest";
import "../src/index.js";

function makeHass(entityId: string, attrs = {}) {
  return {
    connection: {
      subscribeEvents: vi.fn().mockResolvedValue(() => {}),
    },
    states: { [entityId]: { attributes: attrs } },
  };
}

function makeCard() {
  return document.createElement("ha-news-card") as HTMLElement & {
    setConfig: (c: object) => void;
    hass: unknown;
    getCardSize: () => number;
  };
}

describe("HaNewsCard", () => {
  it("registers custom element", () => {
    expect(customElements.get("ha-news-card")).toBeDefined();
  });

  it("throws without entity", () => {
    const card = makeCard();
    expect(() => card.setConfig({ plugin: "rss" })).toThrow("entity is required");
  });

  it("throws without plugin", () => {
    const card = makeCard();
    expect(() => card.setConfig({ entity: "sensor.abc_feed" })).toThrow("plugin is required");
  });

  it("renders rss card", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", title: "ABC News" });
    card.hass = makeHass("sensor.abc_feed", {
      entries: [{ title: "Headline 1", last_updated: 3 }],
    });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector(".news-title")?.textContent).toBe("ABC News");
    expect(shadow.querySelector(".text-cell")?.textContent).toContain("Headline 1");
  });

  it("renders polymarket card", () => {
    const card = makeCard();
    card.setConfig({ plugin: "polymarket", entity: "sensor.polymarket_news" });
    card.hass = makeHass("sensor.polymarket_news", {
      scene: 2,
      events: [
        {
          title: "Big event",
          icon: "http://icon.png",
          liquidity: 1000,
          volume24hr: 500,
          endsAt: new Date(Date.now() + 86400 * 1000).toISOString(),
          markets: [],
        },
      ],
    });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector(".news-title")?.textContent).toContain("#2");
    expect(shadow.querySelector(".poly-event-title")?.textContent).toContain("Big event");
  });

  it("getCardSize uses height when set", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", height: "500px" });
    expect(card.getCardSize()).toBe(10);
  });

  it("getCardSize estimates rows from limit", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", limit: 5 });
    expect(card.getCardSize()).toBe(8);
  });
});
