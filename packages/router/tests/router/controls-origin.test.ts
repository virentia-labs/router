import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router, routerControls } from "../../lib";

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

describe("router controls origin", () => {
  describe("a history-driven push", () => {
    it("is classified as external", async () => {
      const { appScope, history, controls } = await prepare();

      history.push("/app?any=123");

      await vi.waitFor(() =>
        scoped(appScope, () =>
          expect(controls.locationState.value.origin).toBe("external")
        )
      );
    });
  });

  describe("a navigate echo", () => {
    it("is classified as programmatic", async () => {
      const { appScope, controls, appRouter } = await prepare();

      await scoped(appScope, () => appRouter.navigate({ query: { any: "123" } }));

      await vi.waitFor(() =>
        scoped(appScope, () =>
          expect(controls.locationState.value.origin).toBe("programmatic")
        )
      );
    });
  });

  describe("a route.open echo", () => {
    it("is classified as programmatic", async () => {
      const { appScope, controls, routes } = await prepare();

      await scoped(appScope, () => routes.app.open({ query: { tab: "info" } }));

      await vi.waitFor(() =>
        scoped(appScope, () => {
          expect(controls.locationState.value.path).toBe("/app");
          expect(controls.locationState.value.origin).toBe("programmatic");
        })
      );
    });
  });
});
