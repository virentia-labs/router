import { describe, expectTypeOf, it } from "vitest";
import type { ComponentType } from "react";
import { route } from "@virentia/router";
import { lazyRouteView } from "../../lib";
import type { CreateLazyRouteViewProps, RouteView } from "../../lib";

const homeRoute = route({ path: "/" });

// Type-level spec for lazyRouteView / CreateLazyRouteViewProps.
describe("CreateLazyRouteViewProps", () => {
  it("types view as an async component import", () => {
    expectTypeOf<CreateLazyRouteViewProps["view"]>().toEqualTypeOf<
      () => Promise<{ default: ComponentType }>
    >();
  });

  it("types fallback as an optional component", () => {
    expectTypeOf<CreateLazyRouteViewProps["fallback"]>().toEqualTypeOf<
      ComponentType | undefined
    >();
  });
});

describe("lazyRouteView", () => {
  it("returns a RouteView", () => {
    const view = lazyRouteView({
      route: homeRoute,
      view: () => Promise.resolve({ default: () => null })
    });
    expectTypeOf(view).toEqualTypeOf<RouteView>();
    expectTypeOf(view).not.toBeAny();
  });

  it("accepts a fallback and a layout", () => {
    // Compiles only if lazyRouteView accepts fallback + layout; returns RouteView.
    const view = lazyRouteView({
      route: homeRoute,
      view: () => Promise.resolve({ default: () => null }),
      fallback: () => null,
      layout: ({ children }) => children
    });
    expectTypeOf(view).toEqualTypeOf<RouteView>();
  });

  it("rejects a synchronous component passed as the view", () => {
    // @ts-expect-error `view` must be an async import, not a component.
    lazyRouteView({ route: homeRoute, view: () => null });
  });
});
