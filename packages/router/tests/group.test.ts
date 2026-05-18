import { allSettled, scope, scoped } from "@virentia/core";
import { describe, expect, test } from "vitest";
import { createVirtualRoute, group, type RouteOpenedPayload } from "../lib";

describe("routes grouping", () => {
  test("grouped route opens when one of passed routes is opened", async () => {
    const appScope = scope();
    const route1 = createVirtualRoute<RouteOpenedPayload<void>, void>();
    const route2 = createVirtualRoute<RouteOpenedPayload<void>, void>();
    const grouped = group([route1, route2]);

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(false);
    });

    await allSettled(route1.open, { scope: appScope, payload: undefined });

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(true);
    });

    await allSettled(route1.close, { scope: appScope, payload: undefined });
    await allSettled(route2.open, { scope: appScope, payload: undefined });

    scoped(appScope, () => {
      expect(route1.isOpened.value).toBe(false);
      expect(grouped.isOpened.value).toBe(true);
    });
  });

  test("grouped route closes when all passed routes are closed", async () => {
    const appScope = scope();
    const route1 = createVirtualRoute<RouteOpenedPayload<void>, void>();
    const route2 = createVirtualRoute<RouteOpenedPayload<void>, void>();
    const grouped = group([route1, route2]);

    await allSettled(route1.open, { scope: appScope, payload: undefined });
    await allSettled(route2.open, { scope: appScope, payload: undefined });

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(true);
    });

    await allSettled(route1.close, { scope: appScope, payload: undefined });

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(true);
    });

    await allSettled(route2.close, { scope: appScope, payload: undefined });

    scoped(appScope, () => {
      expect(grouped.isOpened.value).toBe(false);
    });
  });

  test("virtual route grouping works correctly", async () => {
    const appScope = scope();
    const virtualRoute = createVirtualRoute({
      transformer: (_: RouteOpenedPayload<void>) => null
    });
    const routesGroup = group([virtualRoute]);

    scoped(appScope, () => {
      expect(routesGroup.isOpened.value).toBe(false);
    });

    await allSettled(virtualRoute.open, { scope: appScope, payload: {} });

    scoped(appScope, () => {
      expect(routesGroup.isOpened.value).toBe(true);
    });

    await allSettled(virtualRoute.close, { scope: appScope });

    scoped(appScope, () => {
      expect(routesGroup.isOpened.value).toBe(false);
    });
  });
});
