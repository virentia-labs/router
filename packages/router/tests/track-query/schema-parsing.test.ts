import { scope, scoped } from "@virentia/core";
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

describe("trackQuery schema parsing", () => {
  it("coerces a number parameter", async () => {
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

  it("passes through a string parameter", async () => {
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

  it("passes through an any parameter", async () => {
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

  it("passes through an array parameter", async () => {
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

  it("coerces a boolean parameter", async () => {
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
});
