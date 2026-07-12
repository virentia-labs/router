import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";

describe("trackQuery scope isolation", () => {
  it("keeps navigation in one scope out of another", async () => {
    const routes = {
      home: route({ path: "/" }),
      app: route({ path: "/app" })
    };
    const appRouter = router({ routes: [routes.home, routes.app] });
    const scopeA = scope();
    const scopeB = scope();
    const historyA = createMemoryHistory({ initialEntries: ["/"] });
    const historyB = createMemoryHistory({ initialEntries: ["/"] });

    await scoped(scopeA, () => appRouter.setHistory(historyAdapter(historyA)));
    await scoped(scopeB, () => appRouter.setHistory(historyAdapter(historyB)));

    await scoped(scopeA, () => appRouter.navigate({ query: { token: "aaa" } }));

    await vi.waitFor(() =>
      scoped(scopeA, () => expect(appRouter.query.value.token).toBe("aaa"))
    );

    // scopeB's location is untouched by scopeA's navigation.
    scoped(scopeB, () => expect(appRouter.query.value.token).toBeUndefined());
    expect(historyB.location.search).toBe("");
  });
});
