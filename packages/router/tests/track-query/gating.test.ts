import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { route, router, historyAdapter, type Query, type QuerySchema } from "../../lib";
import { watchCalls } from "../support/router-harness";

async function prepare() {
  const routes = {
    home: route({ path: "/" }),
    app: route({ path: "/app" })
  };
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const appRouter = router({
    routes: [routes.home, routes.app]
  });

  await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

  return { appScope, history, appRouter, routes };
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

function objectSchema<T>(parse: (query: Query) => T | null): QuerySchema<T> {
  return {
    safeParse(query) {
      const data = parse(query);

      return data === null ? { success: false } : { success: true, data };
    }
  };
}

function anySchema() {
  return objectSchema<{ any: Query[string] }>(({ any }) =>
    any !== undefined ? { any } : null
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("trackQuery forRoutes gating", () => {
  it("enters only on the listed routes", async () => {
    const { appScope, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ any }) => (any !== undefined ? { any } : null)),
      forRoutes: [routes.app, routes.home]
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () => appRouter.navigate({ path: "/not-found", query: { any: "123" } }));
    expect(enteredCalls).not.toHaveBeenCalled();

    await scoped(appScope, () => appRouter.navigate({ path: "/app", query: { any: "123" } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledTimes(1));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: "123" } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledTimes(2));

    await scoped(appScope, () => appRouter.navigate({ path: "/not-found", query: { any: "123" } }));
    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
  });

  it("exits when leaving the gated route with the query intact", async () => {
    const { appScope, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: anySchema(),
      forRoutes: [routes.app]
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    // On "/" (home active, app inactive) the tracker stays dormant despite a
    // matching query.
    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: "1" } }));
    await sleep(20);
    expect(enteredCalls).not.toHaveBeenCalled();

    // Moving to the gated route activates it.
    await scoped(appScope, () => appRouter.navigate({ path: "/app", query: { any: "1" } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledTimes(1));

    // Leaving the gated route (query intact) exits.
    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: "1" } }));
    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
  });

  describe("with forRoutes: []", () => {
    it("behaves as no route-gating", async () => {
      const home = route({ path: "/" });
      const { appScope, history, appRouter } = memoryRouter([home]);
      await attach(appRouter, appScope, history);

      const tracker = appRouter.trackQuery({
        forRoutes: [],
        parameters: {
          safeParse: (q: any) =>
            q.dialog !== undefined ? { success: true, data: { dialog: q.dialog } } : { success: false }
        }
      });
      const entered = watchCalls(tracker.entered, appScope);

      history.push("/?dialog=invite");
      await vi.waitFor(() => expect(entered).toHaveBeenCalledWith({ dialog: "invite" }));
    });

    it("does not re-enter when navigating routes with an unchanged query", async () => {
      const a = route({ path: "/a" });
      const slug = route({ path: "/:slug" });
      const appScope = scope();
      const history = createMemoryHistory({ initialEntries: ["/"] });
      const appRouter = router({ routes: [a, slug] });
      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      const tracker = appRouter.trackQuery({
        forRoutes: [],
        parameters: {
          safeParse: (q: any) =>
            q.dialog !== undefined ? { success: true, data: { dialog: q.dialog } } : { success: false }
        }
      });
      const entered = watchCalls(tracker.entered, appScope);

      history.push("/a?dialog=x");
      await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(1));

      history.push("/b?dialog=x"); // different route, SAME dialog value
      await new Promise((r) => setTimeout(r, 25));
      expect(entered).toHaveBeenCalledTimes(1); // no spurious re-entry
    });
  });
});
