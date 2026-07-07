import { event, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test, vi } from "vitest";
import { route, router, historyAdapter, type Query, type QuerySchema } from "../lib";
import { watchCalls } from "./utils";

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

describe("trackQuery", () => {
  test("number parameter", async () => {
    const { appScope, appRouter } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ num }) => {
        if (typeof num !== "string" || Number.isNaN(Number(num))) return null;
        return { num: Number(num) };
      })
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { num: "1200" } }));

    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ num: 1200 }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { num: "hello" } }));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
    expect(enteredCalls).toHaveBeenCalledTimes(1);

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { num: ["hello", "1200"] } }));

    expect(enteredCalls).toHaveBeenCalledTimes(1);
    expect(exitedCalls).toHaveBeenCalledTimes(1);
  });

  test("string parameter", async () => {
    const { appScope, appRouter } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ str }) => (typeof str === "string" ? { str } : null))
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { str: "1200" } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ str: "1200" }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { str: "hello" } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ str: "hello" }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { str: ["hello", "1200"] } }));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
    expect(enteredCalls).toHaveBeenCalledTimes(2);
  });

  test("any parameter", async () => {
    const { appScope, appRouter } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ any }) => (any !== undefined ? { any } : null))
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: "1200" } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ any: "1200" }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: "hello" } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ any: "hello" }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: ["hello", "1200"] } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ any: ["hello", "1200"] }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: {} }));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
    expect(enteredCalls).toHaveBeenCalledTimes(3);
  });

  test("array parameter", async () => {
    const { appScope, appRouter } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ any }) => (any !== undefined ? { any } : null))
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: ["hello", "1200"] } }));
    await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ any: ["hello", "1200"] }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: {} }));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
    expect(enteredCalls).toHaveBeenCalledTimes(1);
  });

  test("boolean parameter", async () => {
    const { appScope, appRouter } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ bool }) => {
        if (typeof bool !== "string" || !["0", "1", "false", "true"].includes(bool)) {
          return null;
        }

        return { bool: ["1", "true"].includes(bool) };
      })
    });
    const enteredCalls = watchCalls(tracker.entered, appScope);
    const exitedCalls = watchCalls(tracker.exited, appScope);

    for (const [value, parsed] of [
      ["0", false],
      ["1", true],
      ["false", false],
      ["true", true]
    ] as const) {
      await scoped(appScope, () => appRouter.navigate({ path: "/", query: { bool: value } }));
      await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ bool: parsed }));
    }

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { bool: "123" } }));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
    expect(enteredCalls).toHaveBeenCalledTimes(4);

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { bool: "hello" } }));

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { bool: ["0", "hello"] } }));

    expect(enteredCalls).toHaveBeenCalledTimes(4);
    expect(exitedCalls).toHaveBeenCalledTimes(1);
  });

  test("for routes", async () => {
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

  test("exit", async () => {
    const { appScope, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ any }) => (any !== undefined ? { any } : null)),
      forRoutes: [routes.app, routes.home]
    });
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () => appRouter.navigate({ path: "/not-found", query: { any: "123" } }));
    await scoped(appScope, () => tracker.exit(undefined));
    expect(exitedCalls).not.toHaveBeenCalled();

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: "123", uid: "hi!" } }));
    await scoped(appScope, () => tracker.exit(undefined));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalled());
    scoped(appScope, () => {
      expect(appRouter.query.value.any).toBeUndefined();
      expect(appRouter.query.value.uid).toBeUndefined();
    });
  });

  test("ignore parameters", async () => {
    const { appScope, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ any }) => (any !== undefined ? { any } : null)),
      forRoutes: [routes.app, routes.home]
    });
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () => appRouter.navigate({ path: "/not-found", query: { any: "123" } }));
    await scoped(appScope, () => tracker.exit(undefined));
    expect(exitedCalls).not.toHaveBeenCalled();

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { any: "123", uid: "hi!" } }));
    await scoped(appScope, () => tracker.exit({ ignoreParams: ["uid"] }));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalled());
    scoped(appScope, () => {
      expect(appRouter.query.value.any).toBeUndefined();
      expect(appRouter.query.value.uid).toBe("hi!");
    });
  });

  test("enter", async () => {
    const { appScope, history, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ id, role }) => {
        if (typeof id !== "string" || Number.isNaN(Number(id))) return null;
        if (role !== "user" && role !== "admin") return null;
        return { id: Number(id), role };
      }),
      forRoutes: [routes.app, routes.home]
    });

    await scoped(appScope, () => tracker.enter({ id: 0, role: "user" }));

    scoped(appScope, () => {
      expect(appRouter.query.value.id).toBe("0");
      expect(appRouter.query.value.role).toBe("user");
    });
    expect(history.location.search).toBe("?id=0&role=user");

    await scoped(appScope, () => tracker.enter({ id: 1, role: "admin" }));

    scoped(appScope, () => {
      expect(appRouter.query.value.id).toBe("1");
      expect(appRouter.query.value.role).toBe("admin");
    });
    expect(history.location.search).toBe("?id=1&role=admin");
  });

  test("check by clock", async () => {
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
});

function objectSchema<T>(parse: (query: Query) => T | null): QuerySchema<T> {
  return {
    safeParse(query) {
      const data = parse(query);

      return data === null ? { success: false } : { success: true, data };
    }
  };
}
