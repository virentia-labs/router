import { describe, expectTypeOf, it } from "vitest";
import { route } from "@virentia/router";
import type { Router } from "@virentia/router";
import { useIsOpened, useOpenedViews, useRouter } from "../../lib";
import type { RouteView } from "../../lib";

const homeRoute = route({ path: "/" });
const views: RouteView[] = [{ route: homeRoute, view: () => null }];

// Type-level spec for the read hooks.
describe("useRouter", () => {
  it("returns a Router", () => {
    expectTypeOf(useRouter()).toEqualTypeOf<Router>();
    expectTypeOf(useRouter()).not.toBeAny();
  });

  it("takes no arguments", () => {
    expectTypeOf(useRouter).parameters.toEqualTypeOf<[]>();
  });
});

describe("useIsOpened", () => {
  it("returns a boolean for a route", () => {
    expectTypeOf(useIsOpened(homeRoute)).toEqualTypeOf<boolean>();
    expectTypeOf(useIsOpened(homeRoute)).not.toBeAny();
  });

  it("rejects a non-route argument", () => {
    // @ts-expect-error a route, router, or virtual route is required.
    useIsOpened("home");
  });
});

describe("useOpenedViews", () => {
  it("returns a RouteView list", () => {
    expectTypeOf(useOpenedViews(views)).toEqualTypeOf<RouteView[]>();
    expectTypeOf(useOpenedViews(views)).not.toBeAny();
  });

  it("rejects a single view instead of a list", () => {
    // @ts-expect-error the argument is a list of RouteView.
    useOpenedViews({ route: homeRoute, view: () => null });
  });
});
