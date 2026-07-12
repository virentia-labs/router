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

describe("router navigation", () => {
  describe("route.open", () => {
    it("changes the path, joining the parent path for nested routes", async () => {
      const one = route({ path: "/one" });
      const two = route({ path: "/two/:id" });
      const nested = route({ parent: one, path: "/nested/:id" });
      const appScope = scope();
      const history = createMemoryHistory();
      const appRouter = router({ routes: [one, two, nested] });

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      await scoped(appScope, () => one.open({}));
      expect(history.location.pathname).toBe("/one");

      await scoped(appScope, () => two.open({ params: { id: "hello" } }));
      expect(history.location.pathname).toBe("/two/hello");

      await scoped(appScope, () => nested.open({ params: { id: "hello" } }));
      expect(history.location.pathname).toBe("/one/nested/hello");
    });

    it("writes the query into the location", async () => {
      const authRoute = route({ path: "/auth" });
      const appScope = scope();
      const history = createMemoryHistory();
      const appRouter = router({ routes: [authRoute] });

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      await scoped(appScope, () =>
        authRoute.open({
          query: { login: "movpushmov", password: "123", retry: ["1", "1"] },
        }),
      );

      expect(history.location.pathname).toBe("/auth");
      expect(history.location.search).toBe(
        "?login=movpushmov&password=123&retry=1&retry=1",
      );
    });

    it("runs beforeOpen once when navigating to the same route", async () => {
      const beforeOpen = vi.fn();
      const home = route({ path: "/" });
      const profile = route({
        path: "/profile/:id",
        beforeOpen: [beforeOpen],
      });
      const appScope = scope();
      const history = createMemoryHistory({ initialEntries: ["/"] });
      const appRouter = router({ routes: [home, profile] });

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
      beforeOpen.mockClear();

      await scoped(appScope, () => profile.open({ params: { id: "movpushmov" } }));

      expect(history.location.pathname).toBe("/profile/movpushmov");
      expect(beforeOpen).toHaveBeenCalledTimes(1);

      await vi.waitFor(() =>
        scoped(appScope, () => {
          expect(home.isOpened.value).toBe(false);
          expect(profile.isOpened.value).toBe(true);
          expect(profile.params.value.id).toBe("movpushmov");
        }),
      );
    });
  });

  describe("when a URL carries a query", () => {
    it("parses the query from history", async () => {
      const authRoute = route({ path: "/auth" });
      const appScope = scope();
      const history = createMemoryHistory();
      const appRouter = router({ routes: [authRoute] });

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      history.push("/auth?login=movpushmov&password=123&retry=1&retry=1");

      await vi.waitFor(() =>
        scoped(appScope, () => {
          expect(appRouter.activeRoutes.value[0]).toBe(authRoute);
          expect(appRouter.query.value.login).toBe("movpushmov");
          expect(appRouter.query.value.password).toBe("123");
          expect(appRouter.query.value.retry).toStrictEqual(["1", "1"]);
        }),
      );
    });
  });

  describe("when history blocks the navigation", () => {
    it("leaves the current route opened", async () => {
      const step1 = route({ path: "/step1" });
      const step2 = route({ path: "/step2" });
      const appScope = scope();
      const history = createMemoryHistory({ initialEntries: ["/step1"] });
      const appRouter = router({ routes: [step1, step2] });

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      history.block(() => false);
      await scoped(appScope, () => step2.open({}));

      scoped(appScope, () => {
        expect(appRouter.activeRoutes.value[0]).toBe(step1);
        expect(step1.isOpened.value).toBe(true);
        expect(step2.isOpened.value).toBe(false);
      });
    });
  });

  describe("navigate", () => {
    it("pushes a new history entry by default", async () => {
      const { appScope, history, appRouter } = await prepare();

      const indexBefore = history.index;

      await scoped(appScope, () => appRouter.navigate({ path: "/app" }));

      // push advances the history stack.
      expect(history.index).toBe(indexBefore + 1);
      expect(history.location.pathname).toBe("/app");

      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.path.value).toBe("/app"))
      );
    });

    it("does not advance the history stack with replace", async () => {
      const { appScope, history, appRouter } = await prepare();

      await scoped(appScope, () => appRouter.navigate({ path: "/app" }));
      const indexAfterPush = history.index;

      await scoped(appScope, () => appRouter.navigate({ path: "/", replace: true }));

      // replace keeps the same index while swapping the current entry.
      expect(history.index).toBe(indexAfterPush);
      expect(history.location.pathname).toBe("/");
    });

    it("replaces the whole query and keeps the path with { query }", async () => {
      const { appScope, history, appRouter } = await prepare();

      await scoped(appScope, () => appRouter.navigate({ query: { a: "1", b: "2" } }));
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.a).toBe("1"))
      );

      // A second query navigation replaces (not merges) the previous query.
      await scoped(appScope, () => appRouter.navigate({ query: { c: "3" } }));

      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.c).toBe("3"))
      );
      scoped(appScope, () => {
        expect(appRouter.query.value.a).toBeUndefined();
        expect(appRouter.query.value.b).toBeUndefined();
        // path is preserved across a query-only navigation.
        expect(appRouter.path.value).toBe("/");
      });
      expect(history.location.pathname).toBe("/");
    });

    it("preserves the current query with { path }", async () => {
      const { appScope, history, appRouter } = await prepare();

      await scoped(appScope, () => appRouter.navigate({ query: { keep: "yes" } }));
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.keep).toBe("yes"))
      );

      await scoped(appScope, () => appRouter.navigate({ path: "/app" }));

      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.path.value).toBe("/app"))
      );
      // query survives a path-only navigation.
      scoped(appScope, () => expect(appRouter.query.value.keep).toBe("yes"));
      expect(history.location.search).toBe("?keep=yes");
    });
  });

  describe("back and forward", () => {
    it("walk the history stack", async () => {
      const { appScope, appRouter } = await prepare();

      await scoped(appScope, () => appRouter.navigate({ path: "/app" }));
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.path.value).toBe("/app"))
      );

      await scoped(appScope, () => appRouter.back());
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.path.value).toBe("/"))
      );

      await scoped(appScope, () => appRouter.forward());
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.path.value).toBe("/app"))
      );
    });
  });
});
