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

function anySchema() {
  return objectSchema<{ any: Query[string] }>(({ any }) =>
    any !== undefined ? { any } : null
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("trackQuery enter", () => {
  it("writes the parsed params into the location", async () => {
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

  it("writes a single tracked key into the location", async () => {
    const { appScope, history, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ id }) =>
        typeof id === "string" ? { id } : null
      ),
      forRoutes: [routes.home, routes.app]
    });

    await scoped(appScope, () => tracker.enter({ id: "42" }));

    await vi.waitFor(() =>
      scoped(appScope, () => expect(appRouter.query.value.id).toBe("42"))
    );
    expect(history.location.search).toBe("?id=42");
  });

  describe("re-entering the same key", () => {
    it("does not refire entered, while a different key does", async () => {
      const { appScope, appRouter, routes } = await prepare();
      const tracker = appRouter.trackQuery({
        parameters: objectSchema(({ id }) =>
          typeof id === "string" ? { id } : null
        ),
        forRoutes: [routes.home, routes.app]
      });
      const enteredCalls = watchCalls(tracker.entered, appScope);

      await scoped(appScope, () => appRouter.navigate({ path: "/", query: { id: "1" } }));
      await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ id: "1" }));
      expect(enteredCalls).toHaveBeenCalledTimes(1);

      // Same key (same route set + same parsed data) — no second entered.
      await scoped(appScope, () => appRouter.navigate({ path: "/", query: { id: "1" } }));
      await sleep(20);
      expect(enteredCalls).toHaveBeenCalledTimes(1);

      // A different key does fire again.
      await scoped(appScope, () => appRouter.navigate({ path: "/", query: { id: "2" } }));
      await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ id: "2" }));
      expect(enteredCalls).toHaveBeenCalledTimes(2);
    });
  });

  describe("when safeParse starts failing", () => {
    it("exits an entered tracker", async () => {
      const { appScope, appRouter, routes } = await prepare();
      const tracker = appRouter.trackQuery({
        parameters: objectSchema(({ num }) => {
          if (typeof num !== "string" || Number.isNaN(Number(num))) return null;
          return { num: Number(num) };
        }),
        forRoutes: [routes.home, routes.app]
      });
      const enteredCalls = watchCalls(tracker.entered, appScope);
      const exitedCalls = watchCalls(tracker.exited, appScope);

      await scoped(appScope, () => appRouter.navigate({ path: "/", query: { num: "7" } }));
      await vi.waitFor(() => expect(enteredCalls).toHaveBeenCalledWith({ num: 7 }));

      // Parse now fails — the tracker exits.
      await scoped(appScope, () => appRouter.navigate({ path: "/", query: { num: "nope" } }));

      await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalledTimes(1));
      expect(enteredCalls).toHaveBeenCalledTimes(1);
    });
  });
});

describe("trackQuery exit", () => {
  it("clears the tracked params from the query", async () => {
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

  it("clears the whole query", async () => {
    const { appScope, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: anySchema(),
      forRoutes: [routes.home, routes.app]
    });
    const exitedCalls = watchCalls(tracker.exited, appScope);

    await scoped(appScope, () =>
      appRouter.navigate({ path: "/", query: { any: "123", other: "keep?" } })
    );
    await vi.waitFor(() =>
      scoped(appScope, () => expect(appRouter.query.value.any).toBe("123"))
    );

    await scoped(appScope, () => tracker.exit(undefined));

    await vi.waitFor(() => expect(exitedCalls).toHaveBeenCalled());
    scoped(appScope, () => {
      expect(appRouter.query.value.any).toBeUndefined();
      expect(appRouter.query.value.other).toBeUndefined();
    });
  });

  describe("with ignoreParams", () => {
    it("keeps the listed key and clears the rest", async () => {
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

    it("keeps only the listed keys, dropping the others", async () => {
      const { appScope, appRouter, routes } = await prepare();
      const tracker = appRouter.trackQuery({
        parameters: anySchema(),
        forRoutes: [routes.home, routes.app]
      });

      await scoped(appScope, () =>
        appRouter.navigate({
          path: "/",
          query: { any: "123", uid: "hi!", drop: "x" }
        })
      );
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.any).toBe("123"))
      );

      await scoped(appScope, () => tracker.exit({ ignoreParams: ["uid"] }));

      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.any).toBeUndefined())
      );
      scoped(appScope, () => {
        expect(appRouter.query.value.uid).toBe("hi!");
        expect(appRouter.query.value.drop).toBeUndefined();
      });
    });
  });
});
