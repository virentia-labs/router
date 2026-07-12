import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { historyAdapter, route, router } from "../../lib";

function memoryRouter(routes: any[], entries: string[] = ["/"]) {
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: entries });
  const appRouter = router({ routes });
  return { appScope, history, appRouter };
}

async function attach(appRouter: any, appScope: any, history: any) {
  await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
}

describe("router route registration", () => {
  describe("knownRoutes path joining", () => {
    it("joins parent chains without a base", () => {
      const route1 = route({ path: "/hi" });
      const route2 = route({ path: "/hello" });
      const nested1 = route({ path: "/ff", parent: route1 });
      const nested2 = route({ path: "/ss", parent: route2 });
      const nested3 = route({ path: "/ss", parent: nested1 });

      const { knownRoutes } = router({
        routes: [route1, route2, nested1, nested2, nested3]
      });

      expect(knownRoutes.map((route) => route.path)).toStrictEqual([
        "/hi",
        "/hello",
        "/hi/ff",
        "/hello/ss",
        "/hi/ff/ss"
      ]);
    });

    it("prefixes every joined chain with the base", () => {
      const route1 = route({ path: "/hi" });
      const route2 = route({ path: "/hello" });
      const nested1 = route({ path: "/ff", parent: route1 });
      const nested2 = route({ path: "/ss", parent: route2 });
      const nested3 = route({ path: "/ss", parent: nested1 });

      const { knownRoutes } = router({
        base: "/movpushmov",
        routes: [route1, route2, nested1, nested2, nested3]
      });

      expect(knownRoutes.map((route) => route.path)).toStrictEqual([
        "/movpushmov/hi",
        "/movpushmov/hello",
        "/movpushmov/hi/ff",
        "/movpushmov/hello/ss",
        "/movpushmov/hi/ff/ss"
      ]);
    });
  });

  it("stores the base-joined path for a pathless { path, route } entry", () => {
    const inner = route();
    const sub = router({ base: "/x", routes: [{ path: "/p", route: inner }] });

    expect(sub.knownRoutes[0]!.path).toBe("/x/p");
  });

  describe("a nested leaf '/'", () => {
    it("does not append a trailing slash to the URL", async () => {
      const parent = route({ path: "/settings" });
      const index = route({ path: "/", parent });
      const { appScope, history, appRouter } = memoryRouter([index, parent]);
      await attach(appRouter, appScope, history);

      await scoped(appScope, () => index.open());
      expect(history.location.pathname).toBe("/settings");
    });
  });
});
