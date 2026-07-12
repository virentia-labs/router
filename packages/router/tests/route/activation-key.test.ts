import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import type { InternalOpenedPayload, InternalRoute, Route } from "../../lib";
import { watchCalls } from "../support/router-harness";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

function memoryRouter(routes: any[], entries: string[] = ["/"]) {
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: entries });
  const appRouter = router({ routes });
  return { appScope, history, appRouter };
}

async function attach(appRouter: any, appScope: any, history: any) {
  await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
}

describe("route activation key", () => {
  it("does not re-activate when the query is reordered", async () => {
    const r = route({ path: "/r/:id" }) as any;
    const { appScope, history, appRouter } = memoryRouter([r]);
    await attach(appRouter, appScope, history);

    const openedCalls = watchCalls(r.opened, appScope);
    const runner = scoped(appScope);

    await runner(() =>
      r.internal.activateRoute(
        { params: { id: "1" }, query: { a: "1", b: "2" }, skipBeforeOpen: true, navigate: false },
        runner
      )
    );
    const afterFirst = openedCalls.mock.calls.length;

    await runner(() =>
      r.internal.activateRoute(
        { params: { id: "1" }, query: { b: "2", a: "1" }, skipBeforeOpen: true, navigate: false },
        runner
      )
    );
    expect(openedCalls.mock.calls.length).toBe(afterFirst);
  });

  it("stays stable when params/query hold a shared non-circular object ref", async () => {
    const r = route({ path: "/r/:id" }) as any;
    const appScope = scope();
    const appRouter = router({ routes: [r] });
    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    const opened = watchCalls(r.opened, appScope);
    const runner = scoped(appScope);
    const shared = { z: "1" };
    const payload = () => ({
      params: { id: "1" },
      query: { a: shared, b: shared } as any,
      skipBeforeOpen: true,
      navigate: false
    });

    await runner(() => r.internal.activateRoute(payload(), runner));
    const afterFirst = opened.mock.calls.length;
    await runner(() => r.internal.activateRoute(payload(), runner));

    expect(opened.mock.calls.length).toBe(afterFirst); // idempotent, not "circular"
  });

  it("does not crash on non-serializable params such as BigInt", async () => {
    const r = route() as any;
    const appScope = scope();
    const runner = scoped(appScope);

    await expect(
      runner(() =>
        r.internal.activateRoute(
          { params: { big: 10n }, skipBeforeOpen: true, navigate: false },
          runner
        )
      )
    ).resolves.toBeDefined();

    expect(scoped(appScope, () => r.isOpened.value)).toBe(true);
  });

  describe("when the same params/query are re-applied", () => {
    it("short-circuits so opened and the guard do not refire", async () => {
      const guard = vi.fn();
      const r = route({ path: "/r/:id", beforeOpen: [guard] });
      const appScope = scope();
      const runner = scoped(appScope);
      const opened = watchCalls(r.opened, appScope);

      const payload: InternalOpenedPayload<{ id: string }> = {
        params: { id: "1" },
        query: { tab: "info" },
        navigate: false,
      };

      await runner(() => internalOf(r).activateRoute(payload, runner));
      expect(opened).toHaveBeenCalledTimes(1);
      expect(guard).toHaveBeenCalledTimes(1);

      await runner(() =>
        internalOf(r).activateRoute(
          { params: { id: "1" }, query: { tab: "info" }, navigate: false },
          runner,
        ),
      );
      expect(opened).toHaveBeenCalledTimes(1);
      expect(guard).toHaveBeenCalledTimes(1);
    });
  });

  describe("when the identical location is applied again from history", () => {
    it("stays a no-op, while a changed query re-activates", async () => {
      const beforeOpen = vi.fn();
      const xRoute = route({ path: "/x", beforeOpen: [beforeOpen] });
      const appScope = scope();
      const history = createMemoryHistory();
      const appRouter = router({ routes: [xRoute] });
      const opened = watchCalls(xRoute.opened, appScope);

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      history.push("/x");
      await vi.waitFor(() => expect(opened).toHaveBeenCalledTimes(1));
      expect(beforeOpen).toHaveBeenCalledTimes(1);

      // Re-applying the identical location is a no-op: no second opened, no
      // second beforeOpen.
      history.push("/x");
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(opened).toHaveBeenCalledTimes(1);
      expect(beforeOpen).toHaveBeenCalledTimes(1);

      // A different params/query does re-activate.
      history.push("/x?tab=info");
      await vi.waitFor(() => expect(opened).toHaveBeenCalledTimes(2));
      expect(beforeOpen).toHaveBeenCalledTimes(2);
    });
  });
});
