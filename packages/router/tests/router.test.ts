import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { route, router, historyAdapter } from "../lib";
import { watchCalls } from "./utils";

describe("appRouter", () => {
  it("opens routes when path changes", async () => {
    const one = route({ path: "/one" });
    const two = route({ path: "/two" });
    const appScope = scope();
    const history = createMemoryHistory();
    const appRouter = router({ routes: [one, two] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    history.push("/one");

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(appRouter.activeRoutes.value[0]).toBe(one);
        expect(one.isOpened.value).toBe(true);
        expect(two.isOpened.value).toBe(false);
      }),
    );
  });

  it("closes previous route when path changes", async () => {
    const one = route({ path: "/one" });
    const two = route({ path: "/two" });
    const appScope = scope();
    const history = createMemoryHistory();
    const appRouter = router({ routes: [one, two] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    history.push("/one");
    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(appRouter.activeRoutes.value[0]).toBe(one);
        expect(one.isOpened.value).toBe(true);
      }),
    );

    history.push("/two");
    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(appRouter.activeRoutes.value[0]).toBe(two);
        expect(one.isOpened.value).toBe(false);
        expect(two.isOpened.value).toBe(true);
      }),
    );
  });

  it("changes path when route is opened", async () => {
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

  it("parses query from history", async () => {
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

  it("opens route with query", async () => {
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

  it("passes payload to beforeOpen on direct history activation", async () => {
    const beforeOpen = vi.fn();
    const profileRoute = route({
      path: "/profile/:id<number>",
      beforeOpen: [beforeOpen],
    });
    const appScope = scope();
    const history = createMemoryHistory({
      initialEntries: ["/profile/42?tab=info"],
    });
    const appRouter = router({ routes: [profileRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    expect(beforeOpen).toHaveBeenCalledTimes(1);
    expect(beforeOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: 42 },
        query: { tab: "info" },
      }),
    );
  });

  it("runs beforeOpen on direct history changes", async () => {
    const step1BeforeOpen = vi.fn();
    const step2BeforeOpen = vi.fn();
    const step1 = route({
      path: "/step1",
      beforeOpen: [step1BeforeOpen],
    });
    const step2 = route({
      path: "/step2",
      beforeOpen: [step2BeforeOpen],
    });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/step1"] });
    const appRouter = router({ routes: [step1, step2] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    expect(step1BeforeOpen).toHaveBeenCalledTimes(1);

    history.push("/step2");
    await vi.waitFor(() => expect(step2BeforeOpen).toHaveBeenCalledTimes(1));
  });

  it("runs beforeOpen once when route.open navigates to the same route", async () => {
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

  it("does not open a route when history blocks navigation", async () => {
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

  it("opens parent route from nested history path", async () => {
    const parent = route({ path: "/parent" });
    const child = route({ path: "/child", parent });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/parent/child"] });
    const appRouter = router({ routes: [parent, child] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(parent.isOpened.value).toBe(true);
        expect(child.isOpened.value).toBe(true);
      }),
    );
  });

  it("supports subrouters", async () => {
    const settingsModalRoutes = {
      general: route({ path: "/" }),
      security: route({ path: "/security" }),
    };
    const settingsModalRouter = router({
      base: "/settings",
      routes: [settingsModalRoutes.general, settingsModalRoutes.security],
    });
    const mainRoutes = {
      home: route({ path: "/" }),
    };
    const mainRouter = router({
      routes: [mainRoutes.home, settingsModalRouter],
    });
    const appScope = scope();
    const history = createMemoryHistory();

    await scoped(appScope, () => mainRouter.setHistory(historyAdapter(history)));

    await scoped(appScope, () => mainRoutes.home.open({}));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(true);
        expect(settingsModalRoutes.general.isOpened.value).toBe(false);
      }),
    );

    await scoped(appScope, () => settingsModalRoutes.general.open({}));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(false);
        expect(settingsModalRoutes.general.isOpened.value).toBe(true);
      }),
    );

    await scoped(appScope, () => settingsModalRoutes.security.open({}));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(false);
        expect(settingsModalRoutes.general.isOpened.value).toBe(false);
        expect(settingsModalRoutes.security.isOpened.value).toBe(true);
      }),
    );
  });

  it("opens initial route only once", async () => {
    const homeRoute = route({ path: "/" });
    const appRouter = router({ routes: [homeRoute] });
    const appScope = scope();
    const openedCalls = watchCalls(homeRoute.opened, appScope);

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory())),
    );

    await vi.waitFor(() => expect(openedCalls).toHaveBeenCalledTimes(1));
  });

  it("does not re-activate when the same location is applied again", async () => {
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

  it("keeps current route opened while route.open waits for beforeOpen", async () => {
    const gate: { release?: () => void } = {};
    const home = route({ path: "/" });
    const profile = route({
      path: "/profile/:id",
      beforeOpen: [
        () =>
          new Promise<void>((resolve) => {
            gate.release = resolve;
          }),
      ],
    });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const appRouter = router({ routes: [home, profile] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(home.isOpened.value).toBe(true);
      }),
    );

    const opening = scoped(appScope, () => profile.open({ params: { id: "42" } }));

    await Promise.resolve();
    expect(gate.release).toBeTypeOf("function");

    scoped(appScope, () => {
      expect(home.isOpened.value).toBe(true);
      expect(profile.isOpened.value).toBe(false);
    });

    const release = gate.release;
    if (!release) {
      throw new Error("beforeOpen was not started");
    }
    release();
    await opening;

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(home.isOpened.value).toBe(false);
        expect(profile.isOpened.value).toBe(true);
      }),
    );
  });
});
