import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { queryAdapter, router } from "../../lib";

async function prepare() {
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: ["/?tab=a"] });
  const appRouter = router({ routes: [] });

  await scoped(appScope, () => appRouter.setHistory(queryAdapter(history)));

  return { appScope, history, appRouter };
}

describe("queryAdapter as the router adapter", () => {
  it("reads the initial query from the backing history", async () => {
    const { appScope, appRouter } = await prepare();

    await vi.waitFor(() =>
      scoped(appScope, () => expect(appRouter.query.value.tab).toBe("a")),
    );
  });

  describe("a push navigation", () => {
    it("round-trips the query into the router state", async () => {
      const { appScope, history, appRouter } = await prepare();

      await scoped(appScope, () => appRouter.navigate({ query: { tab: "b" } }));

      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.tab).toBe("b")),
      );
      expect(history.location.search).toBe("?tab=b");
    });
  });

  describe("a replace navigation", () => {
    it("round-trips the query without advancing the history stack", async () => {
      const { appScope, history, appRouter } = await prepare();

      await scoped(appScope, () => appRouter.navigate({ query: { tab: "b" } }));
      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.tab).toBe("b")),
      );
      const indexBefore = history.index;

      await scoped(appScope, () => appRouter.navigate({ query: { tab: "c" }, replace: true }));

      await vi.waitFor(() =>
        scoped(appScope, () => expect(appRouter.query.value.tab).toBe("c")),
      );
      expect(history.index).toBe(indexBefore);
      expect(history.location.search).toBe("?tab=c");
    });
  });
});
