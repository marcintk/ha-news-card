import { render, type TemplateResult } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { humanNumber, polymarketHtml, rssHtml } from "../src/render.js";
import { minsAgo, NOW } from "./test-utils.js";

function doc(template: TemplateResult): HTMLElement {
  const el = document.createElement("div");
  render(template, el);
  return el;
}

describe("humanNumber", () => {
  it("formats billions", () => expect(humanNumber(1_500_000_000)).toBe("1.5B"));
  it("formats millions", () => expect(humanNumber(2_300_000)).toBe("2.3M"));
  it("formats thousands", () => expect(humanNumber(4_700)).toBe("4.7K"));
  it("formats small numbers", () => expect(humanNumber(42)).toBe("42"));
});

describe("rssHtml", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  const attrs = {
    entries: [
      { title: "Story A", published: minsAgo(10) },
      { title: "Story B", published: minsAgo(5), image: "http://img/b.jpg" },
      { title: "Story C", published: minsAgo(120) },
    ],
  };

  it("renders title", () => {
    const el = doc(rssHtml(attrs, 5, "My Feed"));
    expect(el.querySelector(".news-title")?.textContent).toBe("My Feed");
  });

  it("sorts by age, most recent first", () => {
    const el = doc(rssHtml(attrs, 5, "Feed"));
    const cells = el.querySelectorAll(".rss-text-cell");
    expect(cells[0]?.textContent).toContain("Story B");
    expect(cells[1]?.textContent).toContain("Story A");
    expect(cells[2]?.textContent).toContain("Story C");
  });

  it("sorts entries with no age last and hides their age", () => {
    const el = doc(
      rssHtml(
        {
          entries: [
            { title: "Has Time", published: minsAgo(5) },
            { title: "No Time" },
            { title: "Mid Time", published: minsAgo(3) },
          ],
        },
        5,
        "F"
      )
    );
    const cells = el.querySelectorAll(".rss-text-cell");
    expect(cells[0]?.textContent).toContain("Mid Time");
    expect(cells[1]?.textContent).toContain("Has Time");
    expect(cells[2]?.textContent).toContain("No Time");
    expect(cells[2]?.querySelector(".rss-time")).toBeNull();
  });

  describe("published fallback", () => {
    const rssWith = (entries: { title: string; published?: string }[]) =>
      doc(rssHtml({ entries }, 10, "Feed"));

    afterEach(() => vi.useRealTimers());

    it("derives age from published with a numeric offset", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      const el = rssWith([{ title: "X", published: "Fri, 20 Nov 2026 05:30:00 -0500" }]);
      expect(el.querySelector(".rss-time")?.textContent).toContain("1h ago");
    });

    it("treats published without a timezone as UTC", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      const el = rssWith([{ title: "X", published: "Fri, 20 Nov 2026 11:30:00 " }]);
      expect(el.querySelector(".rss-time")?.textContent).toContain("30m ago");
    });

    it("clamps future published dates to 0m", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      const el = rssWith([{ title: "X", published: "Fri, 20 Nov 2026 13:00:00 GMT" }]);
      expect(el.querySelector(".rss-time")?.textContent).toContain("0m ago");
    });

    it("hides age when published is unparseable", () => {
      const el = rssWith([{ title: "X", published: "not a date" }]);
      expect(el.querySelector(".rss-time")).toBeNull();
    });

    it("sorts by published age, newest first", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      const el = rssWith([
        { title: "Old", published: "Thu, 19 Nov 2026 12:00:00 GMT" },
        { title: "New", published: "Fri, 20 Nov 2026 11:00:00 GMT" },
      ]);
      const cells = el.querySelectorAll(".rss-text-cell");
      expect(cells[0]?.textContent).toContain("New");
      expect(cells[1]?.textContent).toContain("Old");
    });
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
    const el = doc(rssHtml({ entries: [{ title: "X", published: minsAgo(90) }] }, 1, "Feed"));
    expect(el.querySelector(".rss-time")?.textContent).toContain("1h ago");
  });

  it("shows days ago", () => {
    const el = doc(rssHtml({ entries: [{ title: "X", published: minsAgo(1500) }] }, 1, "Feed"));
    expect(el.querySelector(".rss-time")?.textContent).toContain("1d ago");
  });

  it("uses image field", () => {
    const el = doc(rssHtml(attrs, 5, "Feed"));
    const imgs = el.querySelectorAll<HTMLImageElement>(".rss-thumb");
    expect(imgs[0]?.src).toContain("b.jpg");
  });

  it("falls back to default image when no image", () => {
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

  it("even rows use card background color", () => {
    const el = doc(rssHtml(attrs, 3, "Feed"));
    const rows = el.querySelectorAll<HTMLTableRowElement>("tr");
    expect(rows[0]?.style.backgroundColor).toContain("--ha-card-background");
    expect(rows[2]?.style.backgroundColor).toContain("--ha-card-background");
  });

  it("odd rows use secondary background color", () => {
    const el = doc(rssHtml(attrs, 3, "Feed"));
    const rows = el.querySelectorAll<HTMLTableRowElement>("tr");
    expect(rows[1]?.style.backgroundColor).toContain("--secondary-background-color");
  });

  it("does not loop when fallback image itself errors", () => {
    const el = doc(rssHtml({ entries: [{ title: "X" }] }, 1, "Feed"));
    const img = el.querySelector<HTMLImageElement>(".rss-thumb")!;
    // src is already the fallback — firing error again must not change it
    const before = img.src;
    img.dispatchEvent(new Event("error"));
    expect(img.src).toBe(before);
  });

  describe("boundaries", () => {
    const age = (mins: number) =>
      doc(rssHtml({ entries: [{ title: "X", published: minsAgo(mins) }] }, 1, "F")).querySelector(
        ".rss-time"
      )?.textContent;

    it("switches from minutes to hours at exactly 60", () => {
      expect(age(59)).toContain("(59m ago)");
      expect(age(60)).toContain("(1h ago)");
    });

    it("switches from hours to days at exactly 24h", () => {
      expect(age(23 * 60)).toContain("(23h ago)");
      expect(age(24 * 60)).toContain("(1d ago)");
    });
  });

  describe("published timezone detection", () => {
    afterEach(() => vi.useRealTimers());
    const ageOf = (published: string) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      return doc(rssHtml({ entries: [{ title: "X", published }] }, 1, "F")).querySelector(
        ".rss-time"
      )?.textContent;
    };

    it("honours a named zone abbreviation at the end", () => {
      // EST = UTC-5 -> 07:00 EST is 12:00Z -> 0m
      expect(ageOf("Fri, 20 Nov 2026 07:00:00 EST")).toContain("(0m ago)");
    });

    it("only treats a trailing zone as a timezone", () => {
      // trailing "(CET)" is not a recognised trailing zone, so GMT is appended: 07:00Z -> 5h
      expect(ageOf("Fri, 20 Nov 2026 07:00:00 +0100 (CET)")).toContain("(5h ago)");
    });

    it("does not treat an offset-like suffix with trailing junk as a timezone", () => {
      expect(ageOf("UTC Fri, 20 Nov 2026 07:00:00")).toContain("(5h ago)");
    });
  });

  it("does not reassign src when the fallback image errors", () => {
    const el = doc(rssHtml({ entries: [{ title: "X" }] }, 1, "Feed"));
    const img = el.querySelector<HTMLImageElement>(".rss-thumb")!;
    const setter = vi.spyOn(HTMLImageElement.prototype, "src", "set");
    img.dispatchEvent(new Event("error"));
    expect(setter).not.toHaveBeenCalled();
    setter.mockRestore();
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

  it("pads to market limit when fewer markets exist", () => {
    const el = doc(polymarketHtml(attrs, 5, 3)); // 2 real markets, limit 3
    expect(el.querySelectorAll(".poly-market-titles span")).toHaveLength(3);
    expect(el.querySelectorAll(".poly-num")[0].querySelectorAll("span")).toHaveLength(3);
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

  it("shows seconds ago", () => {
    const past = new Date(Date.now() - 30 * 1000).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: past }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("30 secs ago");
  });

  it("shows minutes ago", () => {
    const past = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: past }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("5 mins ago");
  });

  it("shows hours ago", () => {
    const past = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: past }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("3 hrs ago");
  });

  it("shows months ago", () => {
    const past = new Date(Date.now() - 2 * 2592000 * 1000).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: past }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("months ago");
  });

  it("shows years ago", () => {
    const past = new Date(Date.now() - 2 * 31536000 * 1000).toISOString();
    const el = doc(
      polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt: past }] }, 1, 0)
    );
    expect(el.querySelector(".poly-ends")?.textContent).toContain("years ago");
  });

  describe("relative time boundaries", () => {
    const NOW = new Date("2026-11-20T12:00:00Z").getTime();
    const ends = (deltaSeconds: number, titleLen?: number) => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      const endsAt = new Date(NOW + deltaSeconds * 1000).toISOString();
      const el = doc(
        polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], endsAt }] }, 1, 0, titleLen)
      );
      return el.querySelector(".poly-ends")?.textContent;
    };

    it.each([
      [-1, "ends 1 sec ago"],
      [-2, "ends 2 secs ago"],
      [-59, "ends 59 secs ago"],
      [-60, "ends 1 min ago"],
      [-119, "ends 1 min ago"],
      [-3599, "ends 59 mins ago"],
      [-3600, "ends 1 hr ago"],
      [-86399, "ends 23 hrs ago"],
      [-86400, "ends 1 day ago"],
      [-2591999, "ends 29 days ago"],
      [-2592000, "ends 1 month ago"],
      [-31535999, "ends 12 months ago"],
      [-31536000, "ends 1 year ago"],
      [-63072000, "ends 2 years ago"],
      [1, "ends in 1 sec"],
      [2, "ends in 2 secs"],
      [60, "ends in 1 min"],
      [3600, "ends in 1 hr"],
      [86400, "ends in 1 day"],
      [2592000, "ends in 1 month"],
      [31536000, "ends in 1 year"],
      [2 * 31536000, "ends in 2 years"],
    ])("delta %i s -> %s", (delta, expected) => {
      expect(ends(delta)).toBe(expected);
    });

    it("shows a sub-second future as a past-style zero label", () => {
      expect(ends(0.5)).toBe("ends 0 secs ago");
      expect(ends(-0.5)).toBe("ends 0 secs ago");
    });
  });

  describe("title truncation", () => {
    const titled = (title: string, len: number) =>
      doc(
        polymarketHtml({ ...attrs, events: [{ ...attrs.events[0], title }] }, 1, 0, len)
      ).querySelector(".poly-event-title")?.textContent;

    it("keeps a title exactly at the limit", () => {
      expect(titled("ABCDE", 5)).toBe("ABCDE");
    });

    it("truncates one char over the limit with an ellipsis", () => {
      expect(titled("ABCDEF", 5)).toBe("ABCDE…");
    });
  });
});
