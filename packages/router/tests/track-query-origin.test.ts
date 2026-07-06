import { allSettled, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test, vi } from "vitest";
import { createRoute, createRouter, historyAdapter, type Query, type QuerySchema } from "../lib";
import { watchCalls } from "./utils";

async function prepare() {
  const routes = {
    home: createRoute({ path: "/" }),
    app: createRoute({ path: "/app" })
  };
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const router = createRouter({
    routes: [routes.home, routes.app]
  });

  await allSettled(router.setHistory, {
    scope: appScope,
    payload: historyAdapter(history)
  });

  return { appScope, history, router, routes };
}

function anyTracker(router: Awaited<ReturnType<typeof prepare>>["router"], routes: Awaited<ReturnType<typeof prepare>>["routes"]) {
  return router.trackQuery({
    parameters: objectSchema(({ any }) => (any !== undefined ? { any } : null)),
    forRoutes: [routes.app, routes.home]
  });
}

describe("trackQuery origin split", () => {
  test("entered fires externally on a history-driven URL change", async () => {
    const { appScope, history, router, routes } = await prepare();
    const tracker = anyTracker(router, routes);
    const entered = watchCalls(tracker.entered, appScope);
    const externally = watchCalls(tracker.enteredExternally, appScope);
    const programmatically = watchCalls(tracker.enteredProgrammatically, appScope);

    history.push("/?any=123");

    await vi.waitFor(() => expect(externally).toHaveBeenCalledWith({ any: "123" }));
    expect(entered).toHaveBeenCalledWith({ any: "123" });
    expect(programmatically).not.toHaveBeenCalled();
  });

  test("entered fires programmatically on tracker.enter", async () => {
    const { appScope, router, routes } = await prepare();
    const tracker = anyTracker(router, routes);
    const entered = watchCalls(tracker.entered, appScope);
    const externally = watchCalls(tracker.enteredExternally, appScope);
    const programmatically = watchCalls(tracker.enteredProgrammatically, appScope);

    await allSettled(tracker.enter, { scope: appScope, payload: { any: "123" } });

    await vi.waitFor(() => expect(programmatically).toHaveBeenCalledWith({ any: "123" }));
    expect(entered).toHaveBeenCalledWith({ any: "123" });
    expect(externally).not.toHaveBeenCalled();
  });

  test("exited fires programmatically on tracker.exit", async () => {
    const { appScope, history, router, routes } = await prepare();
    const tracker = anyTracker(router, routes);
    const exited = watchCalls(tracker.exited, appScope);
    const externally = watchCalls(tracker.exitedExternally, appScope);
    const programmatically = watchCalls(tracker.exitedProgrammatically, appScope);

    history.push("/?any=123");
    await vi.waitFor(() => scoped(appScope, () => expect(router.query.value.any).toBe("123")));

    await allSettled(tracker.exit, { scope: appScope, payload: undefined });

    await vi.waitFor(() => expect(programmatically).toHaveBeenCalled());
    expect(exited).toHaveBeenCalled();
    expect(externally).not.toHaveBeenCalled();
  });

  test("exited fires externally when the URL drops the tracked params", async () => {
    const { appScope, history, router, routes } = await prepare();
    const tracker = anyTracker(router, routes);
    const externally = watchCalls(tracker.exitedExternally, appScope);
    const programmatically = watchCalls(tracker.exitedProgrammatically, appScope);

    history.push("/?any=123");
    await vi.waitFor(() => scoped(appScope, () => expect(router.query.value.any).toBe("123")));

    history.push("/");

    await vi.waitFor(() => expect(externally).toHaveBeenCalled());
    expect(programmatically).not.toHaveBeenCalled();
  });
});

function objectSchema<T>(parse: (query: Query) => T | null): QuerySchema<T> {
  return {
    safeParse(query) {
      const data = parse(query);

      return data === null ? { success: false } : { success: true, data };
    }
  };
}
