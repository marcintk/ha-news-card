import { describe, expect, it, vi } from "vitest";
import { SubscriptionManager } from "../src/subscription.js";

type Conn = {
  subscribeEvents: (
    cb: (e: { data: { entity_id: string } }) => void,
    type: string
  ) => Promise<() => void>;
};

function makeConn(unsub: () => void = vi.fn()) {
  let _cb!: (e: { data: { entity_id: string } }) => void;
  const conn: Conn = {
    subscribeEvents: vi.fn().mockImplementation((cb) => {
      _cb = cb;
      return Promise.resolve(unsub);
    }),
  };
  const fire = (entityId: string) => _cb({ data: { entity_id: entityId } });
  return { conn, fire };
}

describe("SubscriptionManager", () => {
  it("active is false initially", () => {
    expect(new SubscriptionManager().active).toBe(false);
  });

  it("active is true after subscribe resolves", async () => {
    const sm = new SubscriptionManager();
    const { conn } = makeConn();
    sm.subscribe(conn, new Set(["sensor.a"]), vi.fn());
    await Promise.resolve();
    expect(sm.active).toBe(true);
  });

  it("fires onMatch when tracked entity event arrives", () => {
    const sm = new SubscriptionManager();
    const onMatch = vi.fn();
    const { conn, fire } = makeConn();
    sm.subscribe(conn, new Set(["sensor.a"]), onMatch);
    fire("sensor.a");
    expect(onMatch).toHaveBeenCalledOnce();
  });

  it("ignores events for untracked entities", () => {
    const sm = new SubscriptionManager();
    const onMatch = vi.fn();
    const { conn, fire } = makeConn();
    sm.subscribe(conn, new Set(["sensor.a"]), onMatch);
    fire("sensor.b");
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("calls stale unsub when gen changed before promise resolves", async () => {
    const sm = new SubscriptionManager();
    const staleUnsub = vi.fn();
    let resolve!: (fn: () => void) => void;
    const conn: Conn = {
      subscribeEvents: vi.fn().mockImplementation(() => new Promise<() => void>((res) => { resolve = res; })),
    };
    sm.subscribe(conn, new Set(["sensor.a"]), vi.fn());
    sm.clear(); // bumps gen before promise resolves
    resolve(staleUnsub);
    await Promise.resolve();
    expect(staleUnsub).toHaveBeenCalledOnce();
  });

  it("clear calls active unsub and sets active to false", async () => {
    const sm = new SubscriptionManager();
    const unsub = vi.fn();
    const { conn } = makeConn(unsub);
    sm.subscribe(conn, new Set(["sensor.a"]), vi.fn());
    await Promise.resolve();
    sm.clear();
    expect(unsub).toHaveBeenCalledOnce();
    expect(sm.active).toBe(false);
  });

  it("no-ops when connection lacks subscribeEvents", () => {
    const sm = new SubscriptionManager();
    expect(() => sm.subscribe(null as any, null, vi.fn())).not.toThrow();
  });

  it("handles subscribeEvents rejection gracefully", async () => {
    const sm = new SubscriptionManager();
    const conn: Conn = { subscribeEvents: vi.fn().mockRejectedValue(new Error("network")) };
    sm.subscribe(conn, new Set(["sensor.a"]), vi.fn());
    await new Promise((r) => setTimeout(r, 0));
    expect(sm.active).toBe(false);
  });
});
