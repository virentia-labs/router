import { allSettled, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { createRoute, createRouter, historyAdapter } from "../lib";
import { watchCalls } from "./utils";

describe("router", () => {
  it("opens routes when path changes", async () => {
    const one = createRoute({ path: "/one" });
    const two = createRoute({ path: "/two" });
    const appScope = scope();
    const history = createMemoryHistory();
    const router = createRouter({ routes: [one, two] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    history.push("/one");

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(router.activeRoutes[0]).toBe(one);
        expect(one.isOpened.value).toBe(true);
        expect(two.isOpened.value).toBe(false);
      }),
    );
  });

  it("closes previous route when path changes", async () => {
    const one = createRoute({ path: "/one" });
    const two = createRoute({ path: "/two" });
    const appScope = scope();
    const history = createMemoryHistory();
    const router = createRouter({ routes: [one, two] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    history.push("/one");
    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(router.activeRoutes[0]).toBe(one);
        expect(one.isOpened.value).toBe(true);
      }),
    );

    history.push("/two");
    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(router.activeRoutes[0]).toBe(two);
        expect(one.isOpened.value).toBe(false);
        expect(two.isOpened.value).toBe(true);
      }),
    );
  });

  it("changes path when route is opened", async () => {
    const one = createRoute({ path: "/one" });
    const two = createRoute({ path: "/two/:id" });
    const nested = createRoute({ parent: one, path: "/nested/:id" });
    const appScope = scope();
    const history = createMemoryHistory();
    const router = createRouter({ routes: [one, two, nested] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    await allSettled(one.open, { scope: appScope, payload: {} });
    expect(history.location.pathname).toBe("/one");

    await allSettled(two.open, {
      scope: appScope,
      payload: { params: { id: "hello" } }
    });
    expect(history.location.pathname).toBe("/two/hello");

    await allSettled(nested.open, {
      scope: appScope,
      payload: { params: { id: "hello" } }
    });
    expect(history.location.pathname).toBe("/one/nested/hello");
  });

  it("parses query from history", async () => {
    const route = createRoute({ path: "/auth" });
    const appScope = scope();
    const history = createMemoryHistory();
    const router = createRouter({ routes: [route] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    history.push("/auth?login=movpushmov&password=123&retry=1&retry=1");

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(router.activeRoutes[0]).toBe(route);
        expect(router.query.login).toBe("movpushmov");
        expect(router.query.password).toBe("123");
        expect(router.query.retry).toStrictEqual(["1", "1"]);
      }),
    );
  });

  it("opens route with query", async () => {
    const route = createRoute({ path: "/auth" });
    const appScope = scope();
    const history = createMemoryHistory();
    const router = createRouter({ routes: [route] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    await allSettled(route.open, {
      scope: appScope,
      payload: {
        query: { login: "movpushmov", password: "123", retry: ["1", "1"] }
      }
    });

    expect(history.location.pathname).toBe("/auth");
    expect(history.location.search).toBe("?login=movpushmov&password=123&retry=1&retry=1");
  });

  it("passes payload to beforeOpen on direct history activation", async () => {
    const beforeOpen = vi.fn();
    const route = createRoute({
      path: "/profile/:id<number>",
      beforeOpen: [beforeOpen]
    });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/profile/42?tab=info"] });
    const router = createRouter({ routes: [route] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    expect(beforeOpen).toHaveBeenCalledTimes(1);
    expect(beforeOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: 42 },
        query: { tab: "info" },
        causedBy: { type: "history", source: "initial" }
      }),
    );
  });

  it("runs beforeOpen on direct history changes", async () => {
    const step1BeforeOpen = vi.fn();
    const step2BeforeOpen = vi.fn();
    const step1 = createRoute({
      path: "/step1",
      beforeOpen: [step1BeforeOpen]
    });
    const step2 = createRoute({
      path: "/step2",
      beforeOpen: [step2BeforeOpen]
    });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/step1"] });
    const router = createRouter({ routes: [step1, step2] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    expect(step1BeforeOpen).toHaveBeenCalledTimes(1);

    history.push("/step2");
    await vi.waitFor(() => expect(step2BeforeOpen).toHaveBeenCalledTimes(1));
  });

  it("runs beforeOpen once when route.open navigates to the same route", async () => {
    const beforeOpen = vi.fn();
    const home = createRoute({ path: "/" });
    const profile = createRoute({
      path: "/profile/:id",
      beforeOpen: [beforeOpen]
    });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routes: [home, profile] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });
    beforeOpen.mockClear();

    await allSettled(profile.open, {
      scope: appScope,
      payload: { params: { id: "movpushmov" } }
    });

    expect(history.location.pathname).toBe("/profile/movpushmov");
    expect(beforeOpen).toHaveBeenCalledTimes(1);

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(home.isOpened.value).toBe(false);
        expect(profile.isOpened.value).toBe(true);
        expect(profile.params.id).toBe("movpushmov");
      }),
    );
  });

  it("does not open a route when history blocks navigation", async () => {
    const step1 = createRoute({ path: "/step1" });
    const step2 = createRoute({ path: "/step2" });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/step1"] });
    const router = createRouter({ routes: [step1, step2] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    history.block(() => false);
    await allSettled(step2.open, { scope: appScope, payload: {} });

    scoped(appScope, () => {
      expect(router.activeRoutes[0]).toBe(step1);
      expect(step1.isOpened.value).toBe(true);
      expect(step2.isOpened.value).toBe(false);
    });
  });

  it("opens parent route from nested history path", async () => {
    const parent = createRoute({ path: "/parent" });
    const child = createRoute({ path: "/child", parent });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/parent/child"] });
    const router = createRouter({ routes: [parent, child] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(parent.isOpened.value).toBe(true);
        expect(child.isOpened.value).toBe(true);
      }),
    );
  });

  it("supports subrouters", async () => {
    const settingsModalRoutes = {
      general: createRoute({ path: "/" }),
      security: createRoute({ path: "/security" })
    };
    const settingsModalRouter = createRouter({
      base: "/settings",
      routes: [settingsModalRoutes.general, settingsModalRoutes.security]
    });
    const mainRoutes = {
      home: createRoute({ path: "/" })
    };
    const mainRouter = createRouter({
      routes: [mainRoutes.home, settingsModalRouter]
    });
    const appScope = scope();
    const history = createMemoryHistory();

    await allSettled(mainRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    await allSettled(mainRoutes.home.open, { scope: appScope, payload: {} });

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(true);
        expect(settingsModalRoutes.general.isOpened.value).toBe(false);
      }),
    );

    await allSettled(settingsModalRoutes.general.open, { scope: appScope, payload: {} });

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(false);
        expect(settingsModalRoutes.general.isOpened.value).toBe(true);
      }),
    );

    await allSettled(settingsModalRoutes.security.open, { scope: appScope, payload: {} });

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(false);
        expect(settingsModalRoutes.general.isOpened.value).toBe(false);
        expect(settingsModalRoutes.security.isOpened.value).toBe(true);
      }),
    );
  });

  it("opens initial route only once", async () => {
    const route = createRoute({ path: "/" });
    const router = createRouter({ routes: [route] });
    const appScope = scope();
    const openedCalls = watchCalls(route.opened, appScope);

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory())
    });

    await vi.waitFor(() => expect(openedCalls).toHaveBeenCalledTimes(1));
  });

  it("keeps current route opened while route.open waits for beforeOpen", async () => {
    const gate: { release?: () => void } = {};
    const home = createRoute({ path: "/" });
    const profile = createRoute({
      path: "/profile/:id",
      beforeOpen: [
        () =>
          new Promise<void>((resolve) => {
            gate.release = resolve;
          })
      ]
    });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routes: [home, profile] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(home.isOpened.value).toBe(true);
      }),
    );

    const opening = allSettled(profile.open, {
      scope: appScope,
      payload: { params: { id: "42" } }
    });

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
