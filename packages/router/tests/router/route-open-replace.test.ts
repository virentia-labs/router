import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";

function prepare(initialEntries: string[] = ["/"]) {
  const routes = {
    home: route({ path: "/" }),
    app: route({ path: "/app" })
  };
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries });
  const appRouter = router({ routes: [routes.home, routes.app] });
  return { appScope, history, appRouter, routes };
}

async function attach(appRouter: any, appScope: any, history: any) {
  await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
}

describe("route.open with replace", () => {
  it("swaps the current history entry instead of advancing the stack", async () => {
    const { appScope, history, appRouter, routes } = prepare(["/"]);
    await attach(appRouter, appScope, history);

    await scoped(appScope, () => routes.app.open({}));
    await vi.waitFor(() =>
      scoped(appScope, () => expect(appRouter.path.value).toBe("/app")),
    );
    const indexAtApp = history.index;

    await scoped(appScope, () => routes.home.open({ replace: true }));

    expect(history.index).toBe(indexAtApp);
    expect(history.location.pathname).toBe("/");
    await vi.waitFor(() =>
      scoped(appScope, () => expect(appRouter.path.value).toBe("/")),
    );
  });

  describe("without replace", () => {
    it("advances the history stack", async () => {
      const { appScope, history, appRouter, routes } = prepare(["/"]);
      await attach(appRouter, appScope, history);

      await scoped(appScope, () => routes.app.open({}));
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.path.value).toBe("/app")),
      );
      const indexAtApp = history.index;

      await scoped(appScope, () => routes.home.open({}));

      expect(history.index).toBe(indexAtApp + 1);
      expect(history.location.pathname).toBe("/");
    });
  });
});
