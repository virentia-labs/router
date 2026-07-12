import { effect, event, reaction, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import {
  chainRoute,
  route,
  router,
  virtualRoute,
  historyAdapter,
  type RouteOpenedPayload
} from "../../lib";
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

describe("chainRoute", () => {
  it("opens only after the guard authorizes the source params", async () => {
    const appScope = scope();
    const profileRoute = route({ path: "/profile/:id" });
    const appRouter = router({ routes: [profileRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory())));

    const authorized = event<void>();
    const rejected = event<void>();
    const checkAuthorizationFx = effect<RouteOpenedPayload<{ id: string }>, boolean, unknown>(
      (payload) => payload.params.id !== "0",
    );

    reaction({
      on: checkAuthorizationFx.doneData,
      run(isAuthorized) {
        void (isAuthorized ? authorized : rejected)();
      }
    });

    const virtual = chainRoute({
      route: profileRoute,
      beforeOpen: checkAuthorizationFx,
      openOn: authorized,
      cancelOn: rejected
    });

    await scoped(appScope, () => profileRoute.open({ params: { id: "0" } }));

    scoped(appScope, () => {
      expect(virtual.isOpened.value).toBe(false);
    });

    await scoped(appScope, () => profileRoute.open({ params: { id: "1" } }));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(virtual.isOpened.value).toBe(true);
        expect(virtual.params.value.id).toBe("1");
      }),
    );
  });

  it("chains a virtual route, opening on the guard's doneData", async () => {
    const appScope = scope();
    const vRoute = virtualRoute<RouteOpenedPayload<void>>();
    const beforeOpenFx = effect<RouteOpenedPayload<void>, RouteOpenedPayload<void>, unknown>(
      (params) => params,
    );
    const counter = watchCalls(beforeOpenFx.started, appScope);

    const chainedRoute = chainRoute({
      route: vRoute,
      beforeOpen: [beforeOpenFx],
      openOn: beforeOpenFx.doneData
    });

    expect(counter).not.toHaveBeenCalled();

    await scoped(appScope, () => vRoute.open({ query: { test: "abc" } }));

    expect(counter).toHaveBeenCalledWith({
      query: {
        test: "abc"
      }
    });

    scoped(appScope, () => {
      expect(chainedRoute.isOpened.value).toBe(true);
    });
  });

  describe("when the source route closes", () => {
    it("closes the chain even without cancelOn", async () => {
      const a = route({ path: "/a/:id" });
      const b = route({ path: "/b" });
      const { appScope, history, appRouter } = memoryRouter([a, b]);
      await attach(appRouter, appScope, history);

      const fx = effect(async (p: any) => p);
      const chained = chainRoute({ route: a, beforeOpen: [fx], openOn: fx.doneData });

      await scoped(appScope, () => a.open({ params: { id: "1" } }));
      await vi.waitFor(() => scoped(appScope, () => expect(chained.isOpened.value).toBe(true)));

      // navigate away -> source route a closes -> chain must close too
      await scoped(appScope, () => b.open());
      await vi.waitFor(() => scoped(appScope, () => expect(chained.isOpened.value).toBe(false)));
    });
  });

  describe("when the guard never fires openOn", () => {
    it("does not leak the source params into the chain", async () => {
      const a = route({ path: "/a/:id" });
      const { appScope, history, appRouter } = memoryRouter([a]);
      await attach(appRouter, appScope, history);

      const okFx = effect(async (p: any) => p);
      // openOn is a trigger we never fire, so the chain never actually opens.
      const neverOpen = event<void>();
      const chained = chainRoute({ route: a, beforeOpen: [okFx], openOn: neverOpen });

      await scoped(appScope, () => a.open({ params: { id: "42" } }));
      await vi.waitFor(() => scoped(appScope, () => expect(a.isOpened.value).toBe(true)));

      scoped(appScope, () => {
        expect(chained.isOpened.value).toBe(false);
        expect(chained.params.value).toBeNull();
      });
    });
  });
});
