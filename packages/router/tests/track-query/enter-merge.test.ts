import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router, type Query, type QuerySchema } from "../../lib";

async function prepare() {
  const routes = {
    home: route({ path: "/" }),
    app: route({ path: "/app" })
  };
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const appRouter = router({ routes: [routes.home, routes.app] });

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

describe("trackQuery enter merge", () => {
  it("preserves an unrelated pre-existing query key", async () => {
    const { appScope, appRouter, routes } = await prepare();
    const tracker = appRouter.trackQuery({
      parameters: objectSchema(({ id }) => (typeof id === "string" ? { id } : null)),
      forRoutes: [routes.home, routes.app]
    });

    await scoped(appScope, () => appRouter.navigate({ path: "/", query: { keep: "yes" } }));
    await vi.waitFor(() =>
      scoped(appScope, () => expect(appRouter.query.value.keep).toBe("yes")),
    );

    await scoped(appScope, () => tracker.enter({ id: "42" }));

    await vi.waitFor(() =>
      scoped(appScope, () => expect(appRouter.query.value.id).toBe("42")),
    );
    scoped(appScope, () => {
      expect(appRouter.query.value.id).toBe("42");
      // The untracked key present before enter survives the merge.
      expect(appRouter.query.value.keep).toBe("yes");
    });
  });
});
