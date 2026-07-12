import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import { watchCalls } from "../support/router-harness";

function memoryRouter(routes: any[], entries: string[] = ["/"]) {
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: entries });
  const appRouter = router({ routes });
  return { appScope, history, appRouter };
}

async function attach(appRouter: any, appScope: any, history: any) {
  await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
}

describe("router projection", () => {
  it("opens the matching route when the path changes", async () => {
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

  it("closes the previous route when the path changes", async () => {
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

  it("closes routes that no longer match and opens the new match", async () => {
    const a = route({ path: "/a" });
    const b = route({ path: "/b" });
    const { appScope, history, appRouter } = memoryRouter([a, b], ["/a"]);
    await attach(appRouter, appScope, history);

    await vi.waitFor(() => scoped(appScope, () => expect(a.isOpened.value).toBe(true)));

    history.push("/b");
    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(b.isOpened.value).toBe(true);
        expect(a.isOpened.value).toBe(false);
      })
    );
  });

  describe("when the same location is re-applied", () => {
    it("does not re-open the active route", async () => {
      const a = route({ path: "/a/:id" });
      const { appScope, history, appRouter } = memoryRouter([a], ["/a/1"]);
      await attach(appRouter, appScope, history);
      await vi.waitFor(() => scoped(appScope, () => expect(a.isOpened.value).toBe(true)));

      const opened = watchCalls(a.opened, appScope);
      const before = opened.mock.calls.length;
      history.push("/a/1");
      await new Promise((r) => setTimeout(r, 10));
      expect(opened.mock.calls.length).toBe(before);
    });
  });
});
