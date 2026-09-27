import { describe, expect, it, vi } from "vitest";
import { SubscriptionManager } from "../src/subscription.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("SubscriptionManager", () => {
  it("does nothing when connection has no subscribeEvents", () => {
    const onMatch = vi.fn();
    new SubscriptionManager().subscribe(undefined, new Set(["a"]), onMatch);
    new SubscriptionManager().subscribe(null, new Set(["a"]), onMatch);
    new SubscriptionManager().subscribe({}, new Set(["a"]), onMatch);
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("fires onMatch for a tracked entity and stores the unsub once resolved", async () => {
    const { promise, resolve } = deferred<() => void>();
    const subscribeEvents = vi.fn().mockReturnValue(promise);
    const onMatch = vi.fn();
    const mgr = new SubscriptionManager();

    let callback: ((event: { data: { entity_id: string } }) => void) | undefined;
    subscribeEvents.mockImplementation((cb) => {
      callback = cb;
      return promise;
    });

    mgr.subscribe({ subscribeEvents }, new Set(["sensor.a"]), onMatch);
    callback?.({ data: { entity_id: "sensor.a" } });
    expect(onMatch).toHaveBeenCalledTimes(1);

    callback?.({ data: { entity_id: "sensor.other" } });
    expect(onMatch).toHaveBeenCalledTimes(1);

    const unsub = vi.fn();
    resolve(unsub);
    await promise;
    mgr.clear();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("ignores events and drops a late unsub once clear() bumps the generation", async () => {
    const { promise, resolve } = deferred<() => void>();
    const subscribeEvents = vi.fn().mockReturnValue(promise);
    const onMatch = vi.fn();
    const mgr = new SubscriptionManager();

    let callback: ((event: { data: { entity_id: string } }) => void) | undefined;
    subscribeEvents.mockImplementation((cb) => {
      callback = cb;
      return promise;
    });

    mgr.subscribe({ subscribeEvents }, new Set(["sensor.a"]), onMatch);
    mgr.clear();
    callback?.({ data: { entity_id: "sensor.a" } });
    expect(onMatch).not.toHaveBeenCalled();

    const staleUnsub = vi.fn();
    resolve(staleUnsub);
    await promise;
    expect(staleUnsub).toHaveBeenCalledTimes(1);
  });

  it("swallows a rejected subscribeEvents promise", async () => {
    const { promise, reject } = deferred<() => void>();
    const subscribeEvents = vi.fn().mockReturnValue(promise);
    const mgr = new SubscriptionManager();

    mgr.subscribe({ subscribeEvents }, new Set(["sensor.a"]), vi.fn());
    reject(new Error("boom"));
    await expect(promise).rejects.toThrow("boom");
    mgr.clear();
  });

  it("clear() is a no-op when nothing is subscribed", () => {
    expect(() => new SubscriptionManager().clear()).not.toThrow();
  });
});
