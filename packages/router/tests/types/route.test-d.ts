import type {
  EventCallable,
  Store,
  StoreWritable
} from "@virentia/core";
import { describe, expectTypeOf, it } from "vitest";
import { is, route, router } from "../../lib";
import type { RouteConfig } from "../../lib";
import type {
  OpenPayloadBase,
  PathlessRoute,
  PathRoute,
  Route,
  RouteOpenedPayload,
  Router
} from "../../lib";

// Type-level spec for @virentia/router. Validated by `vitest --typecheck`
// AND by the repo-wide `tsc --noEmit` (this file lives under packages/**).

describe("route(...).params inference", () => {
  it("infers a string param store", () => {
    const userRoute = route({ path: "/u/:id" });

    // `.params` is the writable store; `.units.params` is its read-only view.
    expectTypeOf(userRoute.params).toEqualTypeOf<StoreWritable<{ id: string }>>();
    expectTypeOf(userRoute.units.params).toEqualTypeOf<Store<{ id: string }>>();
    // A StoreWritable is still a Store.
    expectTypeOf(userRoute.params).toMatchTypeOf<Store<{ id: string }>>();
    expectTypeOf(userRoute.params.value).toEqualTypeOf<{ id: string }>();
  });

  it("infers a number param from a typed generic", () => {
    const userRoute = route({ path: "/u/:id<number>" });

    expectTypeOf(userRoute.params.value).toEqualTypeOf<{ id: number }>();
    expectTypeOf(userRoute.units.params).toEqualTypeOf<Store<{ id: number }>>();
  });

  it("narrows a union generic to a literal union", () => {
    const tabRoute = route({ path: "/t/:tab<a|b|c>" });

    expectTypeOf(tabRoute.params.value).toEqualTypeOf<{ tab: "a" | "b" | "c" }>();
  });

  it("infers multiple params of mixed kinds", () => {
    const composite = route({ path: "/a/:x/b/:y<number>" });

    expectTypeOf(composite.params.value).toEqualTypeOf<{ x: string; y: number }>();
  });

  it("widens an optional param with undefined", () => {
    const optionalRoute = route({ path: "/u/:id?" });

    expectTypeOf(optionalRoute.params.value).toEqualTypeOf<{ id: string | undefined }>();
  });

  it("produces array params for repeat modifiers", () => {
    const manyRoute = route({ path: "/u/:id+" });
    const numManyRoute = route({ path: "/u/:id<number>*" });

    expectTypeOf(manyRoute.params.value).toEqualTypeOf<{ id: string[] }>();
    expectTypeOf(numManyRoute.params.value).toEqualTypeOf<{ id: number[] }>();
  });
});

describe("route(...).open payloads", () => {
  it("opens a no-param path route with no args (RouteOpenedPayload<void>)", () => {
    const homeRoute = route({ path: "/home" });

    expectTypeOf(homeRoute).toEqualTypeOf<PathRoute<void>>();
    expectTypeOf(homeRoute.open).toEqualTypeOf<
      EventCallable<RouteOpenedPayload<void>>
    >();
    // RouteOpenedPayload<void> collapses to an optional OpenPayloadBase.
    expectTypeOf<RouteOpenedPayload<void>>().toEqualTypeOf<void | OpenPayloadBase>();

    // Both of these must type-check.
    void homeRoute.open();
    void homeRoute.open({ query: { page: "1" }, replace: true });
  });

  it("requires params for a param route", () => {
    const userRoute = route({ path: "/u/:id" });

    expectTypeOf(userRoute.open).toEqualTypeOf<
      EventCallable<RouteOpenedPayload<{ id: string }>>
    >();
    expectTypeOf<RouteOpenedPayload<{ id: string }>>().toEqualTypeOf<
      { params: { id: string } } & OpenPayloadBase
    >();

    void userRoute.open({ params: { id: "42" } });
    void userRoute.open({ params: { id: "42" }, query: { q: "x" } });

    // @ts-expect-error params is required for a param route
    void userRoute.open();
    // @ts-expect-error `params` key is missing
    void userRoute.open({});
    // @ts-expect-error wrong param value type (id must be string here)
    void userRoute.open({ params: { id: 1 } });
  });
});

describe("route() overloads / pathless", () => {
  it("returns a PathRoute for a path config", () => {
    expectTypeOf(route({ path: "/u/:id<number>" })).toEqualTypeOf<
      PathRoute<{ id: number }>
    >();
  });

  it("returns a PathlessRoute for no config", () => {
    expectTypeOf(route()).toEqualTypeOf<PathlessRoute<void>>();
  });

  it("accepts explicit params on a pathless route", () => {
    const modal = route<{ n: number }>();

    expectTypeOf(modal).toEqualTypeOf<PathlessRoute<{ n: number }>>();
    expectTypeOf(modal.params.value).toEqualTypeOf<{ n: number }>();
    void modal.open({ params: { n: 1 } });
  });
});

describe("RouteConfig<Path> validation", () => {
  it("keeps a valid path literal in path", () => {
    expectTypeOf<RouteConfig<"/u/:id">["path"]>().toEqualTypeOf<"/u/:id">();
    expectTypeOf<RouteConfig<"/u/:id<number>">["path"]>().toEqualTypeOf<"/u/:id<number>">();
  });

  it("surfaces the corrected template for an invalid generic", () => {
    // ValidatePath<"/:id<garbage>"> === ["invalid", "/:id<number,union>"], and
    // RouteConfig maps the [1] hint into the `path` parameter type.
    expectTypeOf<RouteConfig<"/:id<garbage>">["path"]>().toEqualTypeOf<
      "/:id<number,union>"
    >();
    expectTypeOf<RouteConfig<"/:id<string>">["path"]>().toEqualTypeOf<
      "/:id<number,union>"
    >();
  });

  it("rejects the invalid literal passed to route()", () => {
    // @ts-expect-error "/:id<garbage>" is not the corrected "/:id<number,union>"
    route({ path: "/:id<garbage>" });
  });
});

describe("router()", () => {
  it("returns a Router exposing activeRoutes", () => {
    const homeRoute = route({ path: "/home" });
    const appRouter = router({ routes: [homeRoute] });

    expectTypeOf(appRouter).toEqualTypeOf<Router>();
    expectTypeOf(appRouter.activeRoutes).toEqualTypeOf<Store<Route<any>[]>>();
  });
});

describe("is.* type guards narrow", () => {
  it("narrows unknown to each guard's shape", () => {
    const maybe: unknown = route({ path: "/home" });

    if (is.router(maybe)) {
      expectTypeOf(maybe).toEqualTypeOf<Router>();
    }

    if (is.route(maybe)) {
      expectTypeOf(maybe).toEqualTypeOf<Route<void>>();
    }

    if (is.pathRoute(maybe)) {
      expectTypeOf(maybe).toEqualTypeOf<PathRoute<void>>();
    }

    if (is.pathlessRoute(maybe)) {
      expectTypeOf(maybe).toEqualTypeOf<PathlessRoute<void>>();
    }
  });

  it("flows the guard generic into the narrowed params", () => {
    const maybe: unknown = route({ path: "/u/:id" });

    if (is.route<{ id: string }>(maybe)) {
      expectTypeOf(maybe).toEqualTypeOf<Route<{ id: string }>>();
      expectTypeOf(maybe.params.value).toEqualTypeOf<{ id: string }>();
    }
  });
});
