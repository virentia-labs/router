import { effect, event, reaction, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test, vi } from "vitest";
import {
  chainRoute,
  route,
  router,
  virtualRoute,
  historyAdapter,
  type RouteOpenedPayload
} from "../lib";
import { watchCalls } from "./utils";

describe("chained routes", () => {
  test("authorized route", async () => {
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

  test("chains virtual route", async () => {
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
});
