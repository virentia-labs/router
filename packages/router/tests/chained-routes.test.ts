import { allSettled, effect, event, reaction, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test, vi } from "vitest";
import {
  chainRoute,
  createRoute,
  createRouter,
  createVirtualRoute,
  historyAdapter,
  type RouteOpenedPayload
} from "../lib";
import { watchCalls } from "./utils";

describe("chained routes", () => {
  test("authorized route", async () => {
    const appScope = scope();
    const route = createRoute({ path: "/profile/:id" });
    const router = createRouter({ routes: [route] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory())
    });

    const authorized = event<void>();
    const rejected = event<void>();
    const checkAuthorizationFx = effect<RouteOpenedPayload<{ id: string }>, boolean>(
      (payload) => payload.params.id !== "0",
    );

    reaction({
      on: checkAuthorizationFx.doneData,
      run(isAuthorized) {
        void (isAuthorized ? authorized : rejected)();
      }
    });

    const virtual = chainRoute({
      route,
      beforeOpen: checkAuthorizationFx,
      openOn: authorized,
      cancelOn: rejected
    });

    await allSettled(route.open, {
      scope: appScope,
      payload: { params: { id: "0" } }
    });

    scoped(appScope, () => {
      expect(virtual.isOpened.value).toBe(false);
    });

    await allSettled(route.open, {
      scope: appScope,
      payload: { params: { id: "1" } }
    });

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(virtual.isOpened.value).toBe(true);
        expect(virtual.params.id).toBe("1");
      }),
    );
  });

  test("chains virtual route", async () => {
    const appScope = scope();
    const virtualRoute = createVirtualRoute<RouteOpenedPayload<void>>();
    const beforeOpenFx = effect<RouteOpenedPayload<void>, RouteOpenedPayload<void>>(
      (params) => params,
    );
    const counter = watchCalls(beforeOpenFx.started, appScope);

    const chainedRoute = chainRoute({
      route: virtualRoute,
      beforeOpen: [beforeOpenFx],
      openOn: beforeOpenFx.doneData
    });

    expect(counter).not.toHaveBeenCalled();

    await allSettled(virtualRoute.open, {
      scope: appScope,
      payload: { query: { test: "abc" } }
    });

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
