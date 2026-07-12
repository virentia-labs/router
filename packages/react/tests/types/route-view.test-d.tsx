import { describe, expectTypeOf, it } from "vitest";
import type { ComponentType } from "react";
import { route } from "@virentia/router";
import { routeView } from "../../lib";
import type { CreateRouteViewProps, LayoutComponent, RouteView } from "../../lib";

const homeRoute = route({ path: "/" });

// Type-level spec for routeView / CreateRouteViewProps.
describe("CreateRouteViewProps", () => {
  it("types view as a component and layout as an optional layout", () => {
    expectTypeOf<CreateRouteViewProps["view"]>().toEqualTypeOf<ComponentType>();
    expectTypeOf<CreateRouteViewProps["layout"]>().toEqualTypeOf<
      LayoutComponent | undefined
    >();
  });

  it("types children as an optional RouteView list", () => {
    expectTypeOf<CreateRouteViewProps["children"]>().toEqualTypeOf<
      RouteView[] | undefined
    >();
  });
});

describe("routeView", () => {
  it("returns a RouteView", () => {
    const view = routeView({ route: homeRoute, view: () => null });
    expectTypeOf(view).toEqualTypeOf<RouteView>();
    expectTypeOf(view).not.toBeAny();
  });

  it("accepts a layout and children", () => {
    // Compiles only if routeView accepts layout + children; returns a RouteView.
    const view = routeView({
      route: homeRoute,
      view: () => null,
      layout: ({ children }) => children,
      children: [{ route: homeRoute, view: () => null }]
    });
    expectTypeOf(view).toEqualTypeOf<RouteView>();
  });

  it("rejects a call missing the view", () => {
    // @ts-expect-error `view` is required.
    routeView({ route: homeRoute });
  });

  it("rejects a non-component value passed as the view", () => {
    // @ts-expect-error `view` must be a component, not a number.
    routeView({ route: homeRoute, view: 42 });
  });
});
