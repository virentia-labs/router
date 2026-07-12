import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router, routerControls } from "../../lib";
import { watchCalls } from "../support/router-harness";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function prepare(initialEntries: string[] = ["/"]) {
  const routes = {
    home: route({ path: "/" }),
    app: route({ path: "/app" })
  };
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries });
  const controls = routerControls();
  const appRouter = router({ routes: [routes.home, routes.app], controls });

  await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

  return { appScope, history, controls, appRouter, routes };
}

describe("router history lifecycle", () => {
  it("opens the initial route exactly once", async () => {
    const homeRoute = route({ path: "/" });
    const appRouter = router({ routes: [homeRoute] });
    const appScope = scope();
    const openedCalls = watchCalls(homeRoute.opened, appScope);

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory())),
    );

    await vi.waitFor(() => expect(openedCalls).toHaveBeenCalledTimes(1));
  });

  describe("after dispose", () => {
    it("ignores later history changes", async () => {
      const { appScope, history, appRouter } = await prepare();

      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.path.value).toBe("/"))
      );

      await scoped(appScope, () => appRouter.dispose());

      history.push("/app?ghost=1");
      await sleep(20);

      // The subscription is gone, so the router state is frozen at pre-dispose.
      scoped(appScope, () => {
        expect(appRouter.path.value).toBe("/");
        expect(appRouter.query.value.ghost).toBeUndefined();
      });
    });
  });
});
