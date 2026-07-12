import type { EventCallable, Store, StoreWritable } from "@virentia/core";
import { describe, expectTypeOf, it } from "vitest";
import { route, router, routerControls } from "../../lib";
import type {
  LocationState,
  NavigatePayload,
  Query,
  RouterAdapter,
  RouterControls
} from "../../lib";

describe("NavigatePayload", () => {
  it("carries optional query, path, replace", () => {
    expectTypeOf<NavigatePayload["query"]>().toEqualTypeOf<Query | undefined>();
    expectTypeOf<NavigatePayload["path"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<NavigatePayload["replace"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<NavigatePayload>().not.toBeAny();
  });
});

describe("router().navigate", () => {
  it("is an EventCallable of NavigatePayload", () => {
    const appRouter = router({ routes: [route({ path: "/" })] });

    expectTypeOf(appRouter.navigate).toEqualTypeOf<EventCallable<NavigatePayload>>();
    expectTypeOf(appRouter.navigate).not.toBeAny();

    appRouter.navigate({});
    appRouter.navigate({ path: "/x" });
    appRouter.navigate({ query: { a: "1" }, replace: true });
    // @ts-expect-error path must be a string
    appRouter.navigate({ path: 5 });
    // @ts-expect-error replace must be a boolean
    appRouter.navigate({ replace: "yes" });
  });
});

describe("routerControls()", () => {
  it("returns a RouterControls", () => {
    const controls = routerControls();

    expectTypeOf(controls).toEqualTypeOf<RouterControls>();
    expectTypeOf(controls).not.toBeAny();
  });

  it("exposes the navigation events and location stores", () => {
    const controls = routerControls();

    expectTypeOf(controls.navigate).toEqualTypeOf<EventCallable<NavigatePayload>>();
    expectTypeOf(controls.back).toEqualTypeOf<EventCallable<void>>();
    expectTypeOf(controls.forward).toEqualTypeOf<EventCallable<void>>();
    expectTypeOf(controls.setHistory).toEqualTypeOf<EventCallable<RouterAdapter>>();
    expectTypeOf(controls.dispose).toEqualTypeOf<EventCallable<void>>();
    expectTypeOf(controls.query).toEqualTypeOf<Store<Query>>();
    expectTypeOf(controls.path).toEqualTypeOf<Store<string>>();
    expectTypeOf(controls.history).toEqualTypeOf<Store<RouterAdapter | null>>();
    expectTypeOf(controls.locationState).toEqualTypeOf<StoreWritable<LocationState>>();
  });

  describe("setHistory", () => {
    it("requires a RouterAdapter payload", () => {
      const controls = routerControls();

      // @ts-expect-error a bare string is not a RouterAdapter
      controls.setHistory("/x");
    });
  });
});
