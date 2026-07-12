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

function anyTracker(appRouter: Awaited<ReturnType<typeof prepare>>["appRouter"], routes: Awaited<ReturnType<typeof prepare>>["routes"]) {
  return appRouter.trackQuery({
    parameters: objectSchema(({ any }) => (any !== undefined ? { any } : null)),
    forRoutes: [routes.app, routes.home]
  });
}

describe("trackQuery origin split", () => {
  describe("entered", () => {
    it("fires on the external channel for a history-driven URL change", async () => {
      const { appScope, history, appRouter, routes } = await prepare();
      const tracker = anyTracker(appRouter, routes);
      const entered = watchCalls(tracker.entered, appScope);
      const externally = watchCalls(tracker.enteredExternally, appScope);
      const programmatically = watchCalls(tracker.enteredProgrammatically, appScope);

      history.push("/?any=123");

      await vi.waitFor(() => expect(externally).toHaveBeenCalledWith({ any: "123" }));
      expect(entered).toHaveBeenCalledWith({ any: "123" });
      expect(programmatically).not.toHaveBeenCalled();
    });

    it("fires on the programmatic channel for tracker.enter", async () => {
      const { appScope, appRouter, routes } = await prepare();
      const tracker = anyTracker(appRouter, routes);
      const entered = watchCalls(tracker.entered, appScope);
      const externally = watchCalls(tracker.enteredExternally, appScope);
      const programmatically = watchCalls(tracker.enteredProgrammatically, appScope);

      await scoped(appScope, () => tracker.enter({ any: "123" }));

      await vi.waitFor(() => expect(programmatically).toHaveBeenCalledWith({ any: "123" }));
      expect(entered).toHaveBeenCalledWith({ any: "123" });
      expect(externally).not.toHaveBeenCalled();
    });
  });

  describe("exited", () => {
    it("fires on the programmatic channel for tracker.exit", async () => {
      const { appScope, history, appRouter, routes } = await prepare();
      const tracker = anyTracker(appRouter, routes);
      const exited = watchCalls(tracker.exited, appScope);
      const externally = watchCalls(tracker.exitedExternally, appScope);
      const programmatically = watchCalls(tracker.exitedProgrammatically, appScope);

      history.push("/?any=123");
      await vi.waitFor(() => scoped(appScope, () => expect(appRouter.query.value.any).toBe("123")));

      await scoped(appScope, () => tracker.exit(undefined));

      await vi.waitFor(() => expect(programmatically).toHaveBeenCalled());
      expect(exited).toHaveBeenCalled();
      expect(externally).not.toHaveBeenCalled();
    });

    it("fires on the external channel when the URL drops the tracked params", async () => {
      const { appScope, history, appRouter, routes } = await prepare();
      const tracker = anyTracker(appRouter, routes);
      const externally = watchCalls(tracker.exitedExternally, appScope);
      const programmatically = watchCalls(tracker.exitedProgrammatically, appScope);

      history.push("/?any=123");
      await vi.waitFor(() => scoped(appScope, () => expect(appRouter.query.value.any).toBe("123")));

      history.push("/");

      await vi.waitFor(() => expect(externally).toHaveBeenCalled());
      expect(programmatically).not.toHaveBeenCalled();
    });
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
