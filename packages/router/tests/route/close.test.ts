import { scope, scoped } from "@virentia/core";
import { describe, expect, it } from "vitest";
import { route } from "../../lib";
import type { InternalRoute, Route } from "../../lib";
import { watchCalls } from "../support/router-harness";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

describe("route close", () => {
  it("resets isOpened and clears the activation identity so re-activation fires opened again", async () => {
    const r = route({ path: "/r/:id" });
    const appScope = scope();
    const runner = scoped(appScope);
    const opened = watchCalls(r.opened, appScope);
    const closed = watchCalls(r.closed, appScope);

    await runner(() =>
      internalOf(r).activateRoute({ params: { id: "1" }, navigate: false }, runner),
    );
    expect(scoped(appScope, () => r.isOpened.value)).toBe(true);
    expect(opened).toHaveBeenCalledTimes(1);

    await scoped(appScope, () => internalOf(r).close());

    expect(scoped(appScope, () => r.isOpened.value)).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);

    // Because close cleared the activation identity, re-activating the SAME
    // params is no longer idempotent — opened fires again.
    await runner(() =>
      internalOf(r).activateRoute({ params: { id: "1" }, navigate: false }, runner),
    );
    expect(scoped(appScope, () => r.isOpened.value)).toBe(true);
    expect(opened).toHaveBeenCalledTimes(2);
  });

  describe("on an already-closed route", () => {
    it("stays a no-op and does not refire closed", async () => {
      const r = route({ path: "/r" });
      const appScope = scope();
      const closed = watchCalls(r.closed, appScope);

      // never opened -> close should do nothing
      await scoped(appScope, () => internalOf(r).close());
      expect(closed).toHaveBeenCalledTimes(0);
      expect(scoped(appScope, () => r.isOpened.value)).toBe(false);
    });
  });
});
