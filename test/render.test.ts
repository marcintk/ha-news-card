import { render, type TemplateResult } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { humanNumber, polymarketHtml, rssHtml } from "../src/render.js";

function doc(template: TemplateResult): HTMLElement {
  const el = document.createElement("div");
  render(template, el);
  return el;
}

describe("humanNumber", () => {
  it("formats billions", () => expect(humanNumber(1_500_000_000)).toBe("1.5G"));
  it("formats millions", () => expect(humanNumber(2_300_000)).toBe("2.3M"));
  it("formats thousands", () => expect(humanNumber(4_700)).toBe("4.7K"));
  it("formats small numbers", () => expect(humanNumber(42)).toBe("42"));
});

describe("rssHtml", () => {
  const attrs = {
    entries: [
      { title: "Story A", last_updated: 10 },
      { title: "Story B", last_updated: 5, image: "http://img/b.jpg" },
      { title: "Story C", last_updated: 120 },
    ],
  };

  it("renders title", () => {
    const el = doc(rssHtml(attrs, 5, "My Feed"));
    expect(el.querySelector(".news-title")?.textContent).toBe("My Feed");
  });

  it("sorts by last_updated ascending (smallest = most recent)", () => {
    const el = doc(rssHtml(attrs, 5, "Feed"));
    const cells = el.querySelectorAll(".rss-text-cell");
    expect(cells[0]?.textContent).toContain("Story B");
    expect(cells[1]?.textContent).toContain("Story A");
    expect(cells[2]?.textContent).toContain("Story C");
  });

  it("sorts entries with missing last_updated as 0", () => {
    const el = doc(
      rssHtml(
        {
          entries: [
            { title: "Has Time", last_updated: 5 },
            { title: "No Time" },
            { title: "Mid Time", last_updated: 3 },
          ],
        },
        5,
        "F"
      )
    );
    const cells = el.querySelectorAll(".rss-text-cell");
    expect(cells[0]?.textContent).toContain("No Time"); // 0
    expect(cells[1]?.textContent).toContain("Mid Time"); // 3
    expect(cells[2]?.textContent).toContain("Has Time"); // 5
  });

  it("handles missing entries array", () => {
    const el = doc(rssHtml({}, 5, "Feed"));
    expect(el.querySelectorAll(".rss-text-cell")).toHaveLength(0);
  });

  it("respects limit", () => {
    const el = doc(rssHtml(attrs, 2, "Feed"));
    expect(el.querySelectorAll(".rss-text-cell")).toHaveLength(2);
  });

  it("shows minutes ago", () => {
    const el = doc(rssHtml(attrs, 5, "Feed"));
    expect(el.querySelectorAll(".rss-time")[0]?.textContent).toContain("5m ago");
  });

  it("shows hours ago", () => {
    const el = doc(rssHtml({ entries: [{ title: "X", last_updated: 90 }] }, 1, "Feed"));
    expect(el.querySelector(".rss-time")?.textContent).toContain("1h ago");
  });

  it("shows days ago", () => {
    const el = doc(rssHtml({ entries: [{ title: "X", last_updated: 1500 }] }, 1, "Feed"));
    expect(el.querySelector(".rss-time")?.textContent).toContain("1d ago");
  });

  it("uses image field", () => {
    const el = doc(rssHtml(attrs, 5, "Feed"));
    const imgs = el.querySelectorAll<HTMLImageElement>(".rss-thumb");
    expect(imgs[0]?.src).toContain("b.jpg");
  });

  it("falls back to picture field when image absent", () => {
    const el = doc(
      rssHtml({ entries: [{ title: "X", picture: "http://img/pic.jpg" }] }, 1, "Feed")
    );
    expect(el.querySelector<HTMLImageElement>(".rss-thumb")?.src).toContain("pic.jpg");
  });

  it("falls back to default image when no image or picture", () => {
    const el = doc(rssHtml({ entries: [{ title: "X" }] }, 1, "Feed"));
    expect(el.querySelector<HTMLImageElement>(".rss-thumb")?.src).toContain(
      "brands.home-assistant.io"
    );
  });

  it("replaces broken image src with HA fallback on error", () => {
    const el = doc(rssHtml({ entries: [{ title: "X", image: "http://bad/img.jpg" }] }, 1, "Feed"));
    const img = el.querySelector<HTMLImageElement>(".rss-thumb")!;
    img.dispatchEvent(new Event("error"));
    expect(img.src).toContain("brands.home-assistant.io/homeassistant/icon.png");
  });

  it("does not loop when fallback image itself errors", () => {
    const el = doc(rssHtml({ entries: [{ title: "X" }] }, 1, "Feed"));
    const img = el.querySelector<HTMLImageElement>(".rss-thumb")!;
    // src is already the fallback — firing error again must not change it
    const before = img.src;
    img.dispatchEvent(new Event("error"));
    expect(img.src).toBe(before);
  });
});

describe("polymarketHtml", () => {
  const futureDate = new Date(Date.now() + 86400 * 1000 * 10).toISOString(); // 10 days out → plural
  const attrs = {
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

  afterEach(() => vi.useRealTimers());

  it("renders scene in title", () => {
    const el = doc(polymarketHtml(attrs, 5, 3));
    expect(el.querySelector(".news-title")?.textContent).toContain("#3");
  });

  it("renders unknown scene when scene absent", () => {
    const el = doc(polymarketHtml({ events: [] }, 5, 3));
    expect(el.querySelector(".news-title")?.textContent).toContain("#unknown");
  });

  it("handles missing events array", () => {
    const el = doc(polymarketHtml({ scene: 1 }, 5, 3));
    expect(el.querySelectorAll(".poly-event-title")).toHaveLength(0);
  });

  it("renders event title", () => {
    const el = doc(polymarketHtml(attrs, 5, 3));
    expect(el.querySelector(".poly-event-title")?.textContent).toContain("Will event A");
  });

  it("truncates long event titles", () => {
    const long = "A".repeat(60);
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], title: long }] }, 1, 0)
    );
    expect(el.querySelector(".poly-event-title")?.textContent?.length).toBeLessThan(60);
  });

  it("respects event limit", () => {
    const el = doc(polymarketHtml(attrs, 0, 3));
    expect(el.querySelectorAll(".poly-event-title")).toHaveLength(0);
  });

  it("respects market limit", () => {
    const el = doc(polymarketHtml(attrs, 5, 1));
    expect(el.querySelectorAll(".poly-market-titles span")).toHaveLength(1);
  });

  it("shows win price", () => {
    const el = doc(polymarketHtml(attrs, 5, 2));
    const prices = el.querySelectorAll(".poly-num span");
    expect(Array.from(prices).some((s) => s.textContent?.includes("65.5%"))).toBe(true);
  });

  it("shows singular future time", () => {
    const oneDayFuture = new Date(Date.now() + 86400 * 1000 + 60000).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: oneDayFuture }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("in 1 day");
  });

  it("shows plural future time", () => {
    const el = doc(polymarketHtml(attrs, 1, 0));
    expect(el.querySelector(".poly-ends")?.textContent).toMatch(/in \d+ days/);
  });

  it("shows singular past time", () => {
    const past = new Date(Date.now() - 86400 * 1000).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: past }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("1 day ago");
  });

  it("shows plural past time", () => {
    const past = new Date(Date.now() - 86400 * 1000 * 3).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: past }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toMatch(/\d+ days ago/);
  });

  it("shows sub-second fallback", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.500Z"));
    const el = doc(
      polymarketHtml(
        { ...attrs, events: [{ ...attrs.events[0], endsAt: "2025-01-01T00:00:00.000Z" }] },
        1,
        0
      )
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("0 secs ago");
  });
});
