import { snapHtml } from "ha-card-shared/test-utils";
import { render, type TemplateResult } from "lit";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { polymarketHtml, rssHtml } from "../src/render.js";

function doc(template: TemplateResult): string {
  const el = document.createElement("div");
  render(template, el);
  return snapHtml(el.innerHTML);
}

const rssAttrs = {
  entries: [
    { title: "Story A", last_updated: 10 },
    { title: "Story B", last_updated: 5, image: "http://img/b.jpg" },
    { title: "Story C", last_updated: 120 },
  ],
};

describe("rssHtml", () => {
  it("renders feed with title", () => {
    expect(doc(rssHtml(rssAttrs, 5, "My Feed"))).toMatchSnapshot();
  });

  it("renders with limit=1 (single entry)", () => {
    expect(doc(rssHtml(rssAttrs, 1, "My Feed"))).toMatchSnapshot();
  });

  it("renders with empty entries", () => {
    expect(doc(rssHtml({ entries: [] }, 5, "Empty"))).toMatchSnapshot();
  });
});

describe("polymarketHtml", () => {
  const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z").getTime();
  const futureDate = new Date(FIXED_NOW + 86400 * 1000 * 10).toISOString();
  const pastDate = new Date(FIXED_NOW - 86400 * 1000 * 3).toISOString();

  const polyAttrs = {
    scene: 3,
    events: [
      {
        title: "Will event A happen?",
        icon: "http://icon/a.png",
        liquidity: 50000,
        volume24hr: 12000,
        endsAt: futureDate,
        markets: [
          { title: "Yes", liquidity: 30000, volume24hr: 8000, winPrice: 65.5 },
          { title: "No", liquidity: 20000, volume24hr: 4000, winPrice: 34.5 },
        ],
      },
    ],
  };

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterAll(() => vi.useRealTimers());

  it("renders standard event list", () => {
    expect(doc(polymarketHtml(polyAttrs, 5, 3))).toMatchSnapshot();
  });

  it("renders empty events", () => {
    expect(doc(polymarketHtml({ events: [] }, 5, 0))).toMatchSnapshot();
  });

  it("renders expired event", () => {
    const expiredAttrs = {
      ...polyAttrs,
      events: [{ ...polyAttrs.events[0], endsAt: pastDate }],
    };
    expect(doc(polymarketHtml(expiredAttrs, 5, 3))).toMatchSnapshot();
  });
});
