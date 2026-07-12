import { describe, expectTypeOf, it } from "vitest";
import type { ComponentType } from "react";
import { route } from "@virentia/router";
import { routesView } from "../../lib";
import type { CreateRoutesViewProps, RouteView } from "../../lib";

const homeRoute = route({ path: "/" });

// Type-level spec for routesView / CreateRoutesViewProps / RouteView.
describe("CreateRoutesViewProps", () => {
  it("types routes as a RouteView list", () => {
    expectTypeOf<CreateRoutesViewProps["routes"]>().toEqualTypeOf<RouteView[]>();
  });

  it("types otherwise as an optional component", () => {
    expectTypeOf<CreateRoutesViewProps["otherwise"]>().toEqualTypeOf<
      ComponentType | undefined
    >();
  });
});

describe("RouteView", () => {
  it("types view as a component and children as an optional list", () => {
    expectTypeOf<RouteView["view"]>().toEqualTypeOf<ComponentType>();
    expectTypeOf<RouteView["children"]>().toEqualTypeOf<RouteView[] | undefined>();
  });
});

describe("routesView", () => {
  it("returns a component", () => {
    const View = routesView({ routes: [] });
    expectTypeOf(View).toBeFunction();
    expectTypeOf(View).not.toBeAny();
  });

  it("accepts routes with an otherwise fallback", () => {
    expectTypeOf(routesView).toBeCallableWith({
      routes: [{ route: homeRoute, view: () => null }],
      otherwise: () => null
    });
  });

  it("rejects a call without routes", () => {
    // @ts-expect-error `routes` is required.
    routesView({});
  });

  it("rejects a route entry missing its view", () => {
    // @ts-expect-error each entry needs a `view`.
    routesView({ routes: [{ route: homeRoute }] });
  });
});
