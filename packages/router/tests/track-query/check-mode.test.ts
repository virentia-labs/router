import { event, scope, scoped } from "@virentia/core";
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

function objectSchema<T>(parse: (query: Query) => T | null): QuerySchema<T> {
  return {
    safeParse(query) {
      const data = parse(query);

      return data === null ? { success: false } : { success: true, data };
    }
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("trackQuery check mode", () => {
  it("enters only on the check event, given a matching query", async () => {
    const check = event<void>();
    const { appScope, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      check,
      parameters: objectSchema(({ id }) => (typeof id === "string" ? { id } : null))
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);

    await scoped(appScope, () => routes.app.open({}));
    await scoped(appScope, () => routes.home.open({}));
    await scoped(appScope, () => routes.home.open({ query: { id: "123" } }));

    expect(enteredCalls).not.toHaveBeenCalled();

    await scoped(appScope, () => check());

    expect(enteredCalls).toHaveBeenCalledWith({ id: "123" });
  });

  it("evaluates on the check event, then auto-exits when the tracked params drop", async () => {
    const check = event<void>();
    const { appScope, appRouter } = await prepare();
    const tracker = appRouter.trackQuery({
      check,
      parameters: objectSchema(({ id }) =>
        typeof id === "string" ? { id } : null
      )
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    // A matching query alone does not enter — check hasn't fired.
    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { id: "9" } }));
    await sleep(20);
    expect(enteredCalls).not.toHaveBeenCalled();

    // The check event drives the (single) evaluation that enters.
    await scoped(appScope, () => check());
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ id: "9" }));

    // Once entered, dropping the tracked params auto-exits WITHOUT another check.
    await scoped(appScope, () => appRouter.navigate({ path: "/", query: {} }));
    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
  });
});
