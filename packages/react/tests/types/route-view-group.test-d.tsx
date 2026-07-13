import { describe, expectTypeOf, it } from "vitest";
import { route } from "@virentia/router";
import { routeViewGroup } from "../../lib";
import type {
  CreateRouteViewGroupProps,
  LayoutComponent,
  RouteView,
  RouteViewGroup
} from "../../lib";

const a = route({ path: "/a" });

// Type-level spec for routeViewGroup / CreateRouteViewGroupProps.
describe("CreateRouteViewGroupProps", () => {
  it("types views as a RouteView list", () => {
    expectTypeOf<CreateRouteViewGroupProps["views"]>().toEqualTypeOf<RouteView[]>();
  });

  it("types layout as an optional layout component", () => {
    expectTypeOf<CreateRouteViewGroupProps["layout"]>().toEqualTypeOf<
      LayoutComponent | undefined
    >();
  });
});

describe("routeViewGroup", () => {
  it("returns a RouteViewGroup", () => {
    const grouped = routeViewGroup({ views: [{ route: a, view: () => null }] });
    expectTypeOf(grouped).toEqualTypeOf<RouteViewGroup>();
    expectTypeOf(grouped).not.toBeAny();
  });

  it("accepts a shared layout", () => {
    expectTypeOf(routeViewGroup).toBeCallableWith({
      views: [{ route: a, view: () => null }],
      layout: ({ children }) => children
    });
  });

  it("rejects a call without views", () => {
    // @ts-expect-error `views` is required.
    routeViewGroup({});
  });

  it("rejects a view entry missing its view component", () => {
    // @ts-expect-error each entry needs a `view`.
    routeViewGroup({ views: [{ route: a }] });
  });
});
