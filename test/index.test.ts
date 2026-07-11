import { describe, expect, it, vi } from "vitest";
import "../src/index.js";

function makeConn() {
  return { subscribeEvents: vi.fn().mockResolvedValue(() => {}) };
}

function makeHass(entityId: string, attrs = {}, conn = makeConn()) {
  return {
    connection: conn,
    states: { [entityId]: { attributes: attrs } },
  };
}

function makeCard() {
  return document.createElement("ha-news-card") as HTMLElement & {
    setConfig: (c: object) => void;
    hass: unknown;
    getCardSize: () => number;
    disconnectedCallback: () => void;
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

  it("renders with explicit height applied to ha-card", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", height: "300px" });
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    const haCard = card.shadowRoot!.querySelector("ha-card") as HTMLElement;
    expect(haCard?.getAttribute("style")).toContain("300px");
  });

  it("handles missing entity in hass states", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", title: "Feed" });
    card.hass = { connection: makeConn(), states: {} };
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("Feed");
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

  it("renders unknown plugin error inline", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    (card as any)._config.plugin = "unknown";
    card.hass = makeHass("sensor.abc_feed", {});
    expect(card.shadowRoot!.textContent).toContain("Unknown plugin");
  });

  it("renders when setConfig called after hass is set", () => {
    const card = makeCard();
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", title: "Late Config" });
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("Late Config");
  });

  it("re-renders on connection change", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", title: "Feed" });
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    card.hass = makeHass("sensor.abc_feed", { entries: [] }); // new connection object
    expect(card.shadowRoot!.querySelector("ha-card")).toBeTruthy();
  });

  it("schedules re-render when entity state changes", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [] } } },
    };
    card.hass = {
      connection: conn,
      states: {
        "sensor.abc_feed": { attributes: { entries: [{ title: "New", last_updated: 1 }] } },
      },
    };
    vi.runAllTimers();
    expect(card.shadowRoot!.querySelector(".text-cell")?.textContent).toContain("New");
    vi.useRealTimers();
  });

  it("debounces rapid state changes", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [] } } },
    };
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [{ title: "A", last_updated: 1 }] } } },
    };
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [{ title: "B", last_updated: 2 }] } } },
    };
    vi.runAllTimers();
    expect(card.shadowRoot!.querySelector(".text-cell")?.textContent).toContain("B");
    vi.useRealTimers();
  });

  it("timer no-ops when hass is cleared before firing", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    card.hass = { connection: conn, states: { "sensor.abc_feed": { attributes: {} } } };
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [] } } },
    };
    (card as any)._hass = null;
    expect(() => vi.runAllTimers()).not.toThrow();
    vi.useRealTimers();
  });

  it("re-renders via subscription event", () => {
    vi.useFakeTimers();
    let capturedCb!: (e: { data: { entity_id: string } }) => void;
    const conn = {
      subscribeEvents: vi.fn().mockImplementation((cb: typeof capturedCb) => {
        capturedCb = cb;
        return Promise.resolve(() => {});
      }),
    };
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", title: "Feed" });
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [] } } },
    };
    capturedCb!({ data: { entity_id: "sensor.abc_feed" } });
    vi.runAllTimers();
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("Feed");
    vi.useRealTimers();
  });

  it("disconnectedCallback clears subscription", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    card.hass = makeHass("sensor.abc_feed", {});
    expect(() => card.disconnectedCallback()).not.toThrow();
  });

  it("disconnectedCallback cancels pending render timer", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    card.hass = { connection: conn, states: { "sensor.abc_feed": { attributes: {} } } };
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [] } } },
    };
    card.disconnectedCallback();
    expect(() => vi.runAllTimers()).not.toThrow();
    vi.useRealTimers();
  });

  it("shows error card when hass state access throws", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    card.hass = {
      connection: makeConn(),
      get states(): never {
        throw new Error("hass error");
      },
    };
    expect(card.shadowRoot!.textContent).toContain("ha-news-card error");
  });

  it("shows error when _render called without config", () => {
    const card = makeCard();
    (card as any)._hass = { states: {} };
    (card as any)._render();
    expect(card.shadowRoot!.textContent).toContain("ha-news-card error");
  });

  it("getStubConfig returns sensible defaults", () => {
    const Cls = customElements.get("ha-news-card") as unknown as { getStubConfig(): object };
    expect(Cls.getStubConfig()).toMatchObject({ plugin: "rss", entity: "sensor.abc_feed" });
  });

  it("getCardSize uses height when set", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", height: "500px" });
    expect(card.getCardSize()).toBe(10);
  });

  it("getCardSize falls through for non-numeric height", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", height: "auto" });
    expect(card.getCardSize()).toBe(8);
  });

  it("getCardSize estimates rows from limit", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed", limit: 5 });
    expect(card.getCardSize()).toBe(8);
  });

  it("getCardSize uses default limit when limit not set", () => {
    const card = makeCard();
    card.setConfig({ plugin: "rss", entity: "sensor.abc_feed" });
    expect(card.getCardSize()).toBe(8);
  });
});
