import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";

async function attach(appRouter: any, appScope: any, entries: string[]) {
  await scoped(appScope, () =>
    appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: entries })))
  );
}

describe("router subrouters", () => {
  it("routes across nested subrouters as they open", async () => {
    const settingsModalRoutes = {
      general: route({ path: "/" }),
      security: route({ path: "/security" }),
    };
    const settingsModalRouter = router({
      base: "/settings",
      routes: [settingsModalRoutes.general, settingsModalRoutes.security],
    });
    const mainRoutes = {
      home: route({ path: "/" }),
    };
    const mainRouter = router({
      routes: [mainRoutes.home, settingsModalRouter],
    });
    const appScope = scope();
    const history = createMemoryHistory();

    await scoped(appScope, () => mainRouter.setHistory(historyAdapter(history)));

    await scoped(appScope, () => mainRoutes.home.open({}));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(true);
        expect(settingsModalRoutes.general.isOpened.value).toBe(false);
      }),
    );

    await scoped(appScope, () => settingsModalRoutes.general.open({}));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(false);
        expect(settingsModalRoutes.general.isOpened.value).toBe(true);
      }),
    );

    await scoped(appScope, () => settingsModalRoutes.security.open({}));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(mainRoutes.home.isOpened.value).toBe(false);
        expect(settingsModalRoutes.general.isOpened.value).toBe(false);
        expect(settingsModalRoutes.security.isOpened.value).toBe(true);
      }),
    );
  });

  // Established behavior, intentionally locked (not changed): each router owns
  // its base; a parent does not compose its base into a nested router.
  it("registers a nested router's route at its own base, not the parent's", async () => {
    const inner = route({ path: "/general" });
    const settings = router({ base: "/settings", routes: [inner] });
    const appRouter = router({ base: "/app", routes: [settings] });

    // The nested router's route is registered at its OWN base, not the parent's.
    expect(settings.knownRoutes.map((r) => r.path)).toStrictEqual(["/settings/general"]);
    expect(appRouter.knownRoutes.map((r) => r.path)).toStrictEqual(["/settings/general"]);

    const appScope = scope();
    await attach(appRouter, appScope, ["/settings/general"]);
    expect(scoped(appScope, () => inner.isOpened.value)).toBe(true);
  });

  it("gives history to subrouters declared in the constructor before setHistory", async () => {
    // The supported contract: declare all routes/sub-routers up front. This is
    // the normal path and it works; late dynamic registration is out of scope.
    const inner = route({ path: "/general" });
    const settings = router({ base: "/settings", routes: [inner] });
    const appScope = scope();
    const appRouter = router({ routes: [settings] });

    await attach(appRouter, appScope, ["/settings/general"]);
    expect(scoped(appScope, () => inner.isOpened.value)).toBe(true);
    expect(scoped(appScope, () => settings.history.value)).not.toBeNull();
  });
});
