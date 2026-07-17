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

const rssConfig = (entity = "sensor.abc_feed", title = "ABC News", limit?: number) => ({
  source: { plugin: "rss", entities: [{ entity, title }], ...(limit ? { limit } : {}) },
});

const polyConfig = (entity = "sensor.polymarket_news", opts: Record<string, unknown> = {}) => ({
  source: { plugin: "polymarket", entity, ...opts },
});

describe("HaNewsCard", () => {
  it("registers custom element", () => {
    expect(customElements.get("ha-news-card")).toBeDefined();
  });

  it("throws without source", () => {
    const card = makeCard();
    expect(() => card.setConfig({})).toThrow("source is required");
  });

  it("throws when source has unknown plugin", () => {
    const card = makeCard();
    expect(() => card.setConfig({ source: { plugin: "unknown" as "rss" } })).toThrow(
      "source must contain at least one entity"
    );
  });

  it("falls back to entity id when rss title is omitted", () => {
    const card = makeCard();
    card.setConfig({ source: { plugin: "rss", entities: [{ entity: "sensor.abc_feed" }] } });
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    expect(card.shadowRoot?.querySelector(".news-title")?.textContent).toBe("sensor.abc_feed");
  });

  it("renders rss card", () => {
    const card = makeCard();
    card.setConfig(rssConfig());
    card.hass = makeHass("sensor.abc_feed", {
      entries: [{ title: "Headline 1", last_updated: 3 }],
    });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector(".news-title")?.textContent).toBe("ABC News");
    expect(shadow.querySelector(".rss-text-cell")?.textContent).toContain("Headline 1");
  });

  it("renders with explicit height applied to ha-card", () => {
    const card = makeCard();
    card.setConfig({ ...rssConfig(), height: "300px" });
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    const haCard = card.shadowRoot!.querySelector("ha-card") as HTMLElement;
    expect(haCard?.getAttribute("style")).toContain("300px");
  });

  it("applies title_color as CSS variable on ha-card", () => {
    const card = makeCard();
    card.setConfig({ ...rssConfig(), title_color: "red" });
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    const haCard = card.shadowRoot!.querySelector("ha-card") as HTMLElement;
    expect(haCard?.getAttribute("style")).toContain("--ha-news-title-color:red");
  });

  it("handles missing entity in hass states", () => {
    const card = makeCard();
    card.setConfig(rssConfig());
    card.hass = { connection: makeConn(), states: {} };
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("ABC News");
  });

  it("renders polymarket card", () => {
    const card = makeCard();
    card.setConfig(polyConfig());
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

  it("renders when setConfig called after hass is set", () => {
    const card = makeCard();
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    card.setConfig(rssConfig("sensor.abc_feed", "Late Config"));
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("Late Config");
  });

  it("re-renders on connection change", () => {
    const card = makeCard();
    card.setConfig(rssConfig());
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    card.hass = makeHass("sensor.abc_feed", { entries: [] }); // new connection object
    expect(card.shadowRoot!.querySelector("ha-card")).toBeTruthy();
  });

  it("schedules re-render when entity state changes", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig(rssConfig());
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
    expect(card.shadowRoot!.querySelector(".rss-text-cell")?.textContent).toContain("New");
    vi.useRealTimers();
  });

  it("debounces rapid state changes", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig(rssConfig());
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
    expect(card.shadowRoot!.querySelector(".rss-text-cell")?.textContent).toContain("B");
    vi.useRealTimers();
  });

  it("timer no-ops when hass is cleared before firing", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig(rssConfig());
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
    card.setConfig(rssConfig());
    card.hass = {
      connection: conn,
      states: { "sensor.abc_feed": { attributes: { entries: [] } } },
    };
    capturedCb!({ data: { entity_id: "sensor.abc_feed" } });
    vi.runAllTimers();
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("ABC News");
    vi.useRealTimers();
  });

  it("disconnectedCallback clears subscription and timers", () => {
    const card = makeCard();
    card.setConfig(rssConfig());
    card.hass = makeHass("sensor.abc_feed", {});
    expect(() => card.disconnectedCallback()).not.toThrow();
  });

  it("disconnectedCallback cancels pending render timer", () => {
    vi.useFakeTimers();
    const card = makeCard();
    const conn = makeConn();
    card.setConfig(rssConfig());
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
    card.setConfig(rssConfig());
    card.hass = {
      connection: makeConn(),
      get states(): never {
        throw new Error("hass error");
      },
    };
    expect(card.shadowRoot!.textContent).toContain("ha-news-card error");
  });

  it("does nothing when _render called without config", () => {
    const card = makeCard();
    (card as any)._hass = { states: {} };
    (card as any)._render();
    expect(card.shadowRoot!.textContent).toBe("");
  });

  it("getStubConfig returns source config", () => {
    const Cls = customElements.get("ha-news-card") as unknown as { getStubConfig(): object };
    const cfg = Cls.getStubConfig() as any;
    expect(cfg.source.plugin).toBe("rss");
    expect(cfg.source.entities[0].entity).toBe("sensor.abc_feed");
  });

  it("getCardSize uses height when set", () => {
    const card = makeCard();
    card.setConfig({ ...rssConfig(), height: "500px" });
    expect(card.getCardSize()).toBe(10);
  });

  it("getCardSize falls through for non-numeric height", () => {
    const card = makeCard();
    card.setConfig({ ...rssConfig(), height: "auto" });
    expect(card.getCardSize()).toBe(8);
  });

  it("getCardSize estimates rows from rss limit", () => {
    const card = makeCard();
    card.setConfig(rssConfig("sensor.abc_feed", "Feed", 5));
    expect(card.getCardSize()).toBe(8);
  });

  it("getCardSize uses default limit when limit not set", () => {
    const card = makeCard();
    card.setConfig(rssConfig());
    expect(card.getCardSize()).toBe(8);
  });

  it("getCardSize uses event_limit for polymarket slot", () => {
    const card = makeCard();
    card.setConfig(polyConfig("sensor.polymarket_news", { event_limit: 5 }));
    expect(card.getCardSize()).toBe(8);
  });

  it("rotates to next slot after rotate_every", () => {
    vi.useFakeTimers();
    const conn = makeConn();
    const card = makeCard();
    card.setConfig({
      source: {
        plugin: "rss",
        entities: [
          { entity: "sensor.abc_feed", title: "ABC" },
          { entity: "sensor.wsj_feed", title: "WSJ" },
        ],
        rotate_every: 10,
      },
    });
    card.hass = {
      connection: conn,
      states: {
        "sensor.abc_feed": { attributes: { entries: [] } },
        "sensor.wsj_feed": { attributes: { entries: [] } },
      },
    };
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("ABC");
    vi.advanceTimersByTime(10000);
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("WSJ");
    vi.advanceTimersByTime(10000);
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("ABC");
    vi.useRealTimers();
  });

  it("hass update with unchanged state skips re-render", () => {
    vi.useFakeTimers();
    const conn = makeConn();
    const card = makeCard();
    card.setConfig(rssConfig());
    const state = { attributes: { entries: [] } };
    const hass = { connection: conn, states: { "sensor.abc_feed": state } };
    card.hass = hass;
    card.hass = hass; // same state reference — no change
    expect((card as any)._renderTimer).toBeNull();
    vi.useRealTimers();
  });

  it("rotation uses default interval when rotate_every not set", () => {
    vi.useFakeTimers();
    const conn = makeConn();
    const card = makeCard();
    card.setConfig({
      source: {
        plugin: "rss",
        entities: [
          { entity: "sensor.abc_feed", title: "ABC" },
          { entity: "sensor.wsj_feed", title: "WSJ" },
        ],
      },
      // no rotate_every — defaults to 60s
    });
    card.hass = {
      connection: conn,
      states: {
        "sensor.abc_feed": { attributes: { entries: [] } },
        "sensor.wsj_feed": { attributes: { entries: [] } },
      },
    };
    vi.advanceTimersByTime(60000);
    expect(card.shadowRoot?.querySelector(".news-title")?.textContent).toBe("WSJ");
    vi.useRealTimers();
  });

  it("rotation timer no-ops when hass cleared before firing", () => {
    vi.useFakeTimers();
    const conn = makeConn();
    const card = makeCard();
    card.setConfig({
      source: {
        plugin: "rss",
        entities: [
          { entity: "sensor.abc_feed", title: "ABC" },
          { entity: "sensor.wsj_feed", title: "WSJ" },
        ],
        rotate_every: 10,
      },
    });
    card.hass = {
      connection: conn,
      states: {
        "sensor.abc_feed": { attributes: { entries: [] } },
        "sensor.wsj_feed": { attributes: { entries: [] } },
      },
    };
    (card as any)._hass = null;
    expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
    vi.useRealTimers();
  });

  it("getCardSize returns default when called before setConfig", () => {
    const card = makeCard();
    expect(card.getCardSize()).toBeGreaterThanOrEqual(1);
  });

  it("no rotation timer when only one slot", () => {
    const card = makeCard();
    card.setConfig(rssConfig());
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    expect((card as any)._rotateTimer).toBeNull();
  });

  it("disconnectedCallback clears rotate timer", () => {
    vi.useFakeTimers();
    const card = makeCard();
    card.setConfig({
      source: {
        plugin: "rss",
        entities: [
          { entity: "sensor.abc_feed", title: "ABC" },
          { entity: "sensor.wsj_feed", title: "WSJ" },
        ],
        rotate_every: 10,
      },
    });
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    card.disconnectedCallback();
    expect((card as any)._rotateTimer).toBeNull();
    expect(() => vi.runAllTimers()).not.toThrow();
    vi.useRealTimers();
  });

  it("setConfig resets slot index and restarts rotation", () => {
    vi.useFakeTimers();
    const conn = makeConn();
    const card = makeCard();
    const twoFeedConfig = {
      source: {
        plugin: "rss" as const,
        entities: [
          { entity: "sensor.abc_feed", title: "ABC" },
          { entity: "sensor.wsj_feed", title: "WSJ" },
        ],
        rotate_every: 10,
      },
    };
    card.setConfig(twoFeedConfig);
    card.hass = {
      connection: conn,
      states: {
        "sensor.abc_feed": { attributes: { entries: [] } },
        "sensor.wsj_feed": { attributes: { entries: [] } },
      },
    };
    vi.advanceTimersByTime(10000); // advance to WSJ
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("WSJ");
    card.setConfig(twoFeedConfig);
    card.hass = {
      connection: conn,
      states: {
        "sensor.abc_feed": { attributes: { entries: [] } },
        "sensor.wsj_feed": { attributes: { entries: [] } },
      },
    };
    expect(card.shadowRoot!.querySelector(".news-title")?.textContent).toBe("ABC");
    vi.useRealTimers();
  });

  it("no rotation timer for polymarket source", () => {
    const card = makeCard();
    card.setConfig(polyConfig());
    card.hass = makeHass("sensor.polymarket_news", { scene: 1, events: [] });
    expect((card as any)._rotateTimer).toBeNull();
  });

  it("shows version badge when show_version is true", () => {
    const card = makeCard();
    card.setConfig({ ...rssConfig(), show_version: true });
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    expect(card.shadowRoot!.querySelector(".card-version")).not.toBeNull();
  });

  it("hides version badge when show_version is not set", () => {
    const card = makeCard();
    card.setConfig(rssConfig());
    card.hass = makeHass("sensor.abc_feed", { entries: [] });
    expect(card.shadowRoot!.querySelector(".card-version")).toBeNull();
  });
});
