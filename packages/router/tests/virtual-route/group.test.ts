import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, group, route, router, virtualRoute, type RouteOpenedPayload } from "../../lib";

function memoryRouter(routes: any[], entries: string[] = ["/"]) {
  const appScope = scope();
  const history = createMemoryHistory({ initialEntries: entries });
  const appRouter = router({ routes });
  return { appScope, history, appRouter };
}

async function attach(appRouter: any, appScope: any, history: any) {
  await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
}

describe("group", () => {
  it("opens while any member is open", async () => {
    const appScope = scope();
    const route1 = virtualRoute<RouteOpenedPayload<void>, void>();
    const route2 = virtualRoute<RouteOpenedPayload<void>, void>();
    const grouped = group([route1, route2]);

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(false);
    });

    await scoped(appScope, () => route1.open(undefined));

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(true);
    });

    await scoped(appScope, () => route1.close(undefined));
    await scoped(appScope, () => route2.open(undefined));

    scoped(appScope, () => {
      expect(route1.isOpened.value).toBe(false);
      expect(grouped.isOpened.value).toBe(true);
    });
  });

  it("closes once all members are closed", async () => {
    const appScope = scope();
    const route1 = virtualRoute<RouteOpenedPayload<void>, void>();
    const route2 = virtualRoute<RouteOpenedPayload<void>, void>();
    const grouped = group([route1, route2]);

    await scoped(appScope, () => route1.open(undefined));
    await scoped(appScope, () => route2.open(undefined));

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(true);
    });

    await scoped(appScope, () => route1.close(undefined));

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(true);
    });

    await scoped(appScope, () => route2.close(undefined));

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(false);
    });
  });

  it("tracks the open state of a single virtual member", async () => {
    const appScope = scope();
    const vRoute = virtualRoute({
      transformer: (_: RouteOpenedPayload<void>) => null
    });
    const routesGroup = group([vRoute]);

    scoped(appScope, () => {
      expect(routesGroup.isOpened.value).toBe(false);
    });

    await scoped(appScope, () => vRoute.open({}));

    scoped(appScope, () => {
      expect(routesGroup.isOpened.value).toBe(true);
    });

    await scoped(appScope, () => vRoute.close());

    scoped(appScope, () => {
      expect(routesGroup.isOpened.value).toBe(false);
    });
  });

  describe("over path routes", () => {
    it("is opened while any member route is active", async () => {
      const a = route({ path: "/a" });
      const b = route({ path: "/b" });
      const section = group([a, b]);
      const { appScope, history, appRouter } = memoryRouter([a, b], ["/a"]);
      await attach(appRouter, appScope, history);

      await vi.waitFor(() => scoped(appScope, () => expect(section.isOpened.value).toBe(true)));

      history.push("/b");
      await vi.waitFor(() => scoped(appScope, () => expect(section.isOpened.value).toBe(true)));

      history.push("/c");
      await vi.waitFor(() => scoped(appScope, () => expect(section.isOpened.value).toBe(false)));
    });
  });
});
