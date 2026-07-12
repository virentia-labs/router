import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import type { InternalRoute, Route } from "../../lib";
import { watchCalls } from "../support/router-harness";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

async function attach(appRouter: any, appScope: any, entries: string[]) {
  await scoped(appScope, () =>
    appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: entries })))
  );
}

describe("route activation", () => {
  it("opens the route, sets its params, fires opened", async () => {
    const profile = route({ path: "/profile/:id" });
    const appScope = scope();
    const runner = scoped(appScope);
    const opened = watchCalls(profile.opened, appScope);

    await runner(() =>
      internalOf(profile).activateRoute({ params: { id: "42" }, navigate: false }, runner),
    );

    expect(scoped(appScope, () => profile.isOpened.value)).toBe(true);
    expect(scoped(appScope, () => profile.params.value.id)).toBe("42");
    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledWith(
      expect.objectContaining({ params: { id: "42" } }),
    );
  });

  it("skips the guards but still activates when skipBeforeOpen is set", async () => {
    const guard = vi.fn();
    const guarded = route({ path: "/guarded/:id", beforeOpen: [guard] });
    const appScope = scope();
    const runner = scoped(appScope);
    const opened = watchCalls(guarded.opened, appScope);

    await runner(() =>
      internalOf(guarded).activateRoute(
        { params: { id: "1" }, skipBeforeOpen: true, navigate: false },
        runner,
      ),
    );

    expect(guard).toHaveBeenCalledTimes(0);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(scoped(appScope, () => guarded.isOpened.value)).toBe(true);
  });

  describe("when re-activated with different params", () => {
    it("updates the stored params, re-firing opened", async () => {
      const r = route({ path: "/r/:id" });
      const appScope = scope();
      const runner = scoped(appScope);
      const opened = watchCalls(r.opened, appScope);

      await runner(() =>
        internalOf(r).activateRoute({ params: { id: "1" }, navigate: false }, runner),
      );
      expect(scoped(appScope, () => r.params.value.id)).toBe("1");
      expect(opened).toHaveBeenCalledTimes(1);

      await runner(() =>
        internalOf(r).activateRoute({ params: { id: "2" }, navigate: false }, runner),
      );
      expect(scoped(appScope, () => r.params.value.id)).toBe("2");
      expect(opened).toHaveBeenCalledTimes(2);
    });
  });

  describe("when the caller mutates the payload params after opening", () => {
    it("keeps the stored params detached at the top level", async () => {
      const r = route({ path: "/r/:id" });
      const appScope = scope();
      const appRouter = router({ routes: [r] });
      await attach(appRouter, appScope, ["/"]);

      const payloadParams = { id: "1" };
      await scoped(appScope, () => r.open({ params: payloadParams }));
      payloadParams.id = "MUTATED";

      expect(scoped(appScope, () => r.params.value.id)).toBe("1");
    });

    it("stores a copy detached from the payload params object handed to activateRoute", async () => {
      const r = route({ path: "/r/:id" });
      const appScope = scope();
      const runner = scoped(appScope);

      // activateRoute directly (no URL round-trip), so the stored params are read
      // straight from this very object rather than reparsed from a location.
      const payloadParams = { id: "1" };
      await runner(() =>
        internalOf(r).activateRoute({ params: payloadParams, navigate: false }, runner),
      );
      payloadParams.id = "MUTATED";

      expect(scoped(appScope, () => r.params.value.id)).toBe("1");
    });
  });
});
