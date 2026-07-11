import { render, type TemplateResult } from "lit";
import { describe, expect, it } from "vitest";
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
    const cells = el.querySelectorAll(".text-cell");
    expect(cells[0]?.textContent).toContain("Story B");
    expect(cells[1]?.textContent).toContain("Story A");
    expect(cells[2]?.textContent).toContain("Story C");
  });

  it("respects limit", () => {
    const el = doc(rssHtml(attrs, 2, "Feed"));
    expect(el.querySelectorAll(".text-cell")).toHaveLength(2);
  });

  it("shows time", () => {
    const el = doc(rssHtml(attrs, 5, "Feed"));
    const times = el.querySelectorAll(".time");
    expect(times[0]?.textContent).toContain("5m ago");
  });

  it("uses custom image", () => {
    const el = doc(rssHtml(attrs, 5, "Feed"));
    const imgs = el.querySelectorAll<HTMLImageElement>(".thumb");
    expect(imgs[0]?.src).toContain("b.jpg");
  });
});

describe("polymarketHtml", () => {
  const attrs = {
    scene: 3,
    events: [
      {
        title: "Will event A happen?",
        icon: "http://icon/a.png",
        liquidity: 50000,
        volume24hr: 12000,
        endsAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        markets: [
          { title: "Yes", liquidity: 30000, volume24hr: 8000, winPrice: 65.5 },
          { title: "No", liquidity: 20000, volume24hr: 4000, winPrice: 34.5 },
        ],
      },
    ],
  };

  it("renders scene in title", () => {
    const el = doc(polymarketHtml(attrs, 5, 3));
    expect(el.querySelector(".news-title")?.textContent).toContain("#3");
  });

  it("renders event title", () => {
    const el = doc(polymarketHtml(attrs, 5, 3));
    expect(el.querySelector(".poly-event-title")?.textContent).toContain("Will event A");
  });

  it("respects event limit", () => {
    const el = doc(polymarketHtml(attrs, 0, 3));
    expect(el.querySelectorAll(".poly-event-title")).toHaveLength(0);
  });

  it("respects market limit", () => {
    const el = doc(polymarketHtml(attrs, 5, 1));
    const spans = el.querySelectorAll(".poly-market-titles span");
    expect(spans).toHaveLength(1);
  });

  it("shows win price", () => {
    const el = doc(polymarketHtml(attrs, 5, 2));
    const prices = el.querySelectorAll(".poly-num span");
    expect(Array.from(prices).some((s) => s.textContent?.includes("65.5%"))).toBe(true);
  });
});
