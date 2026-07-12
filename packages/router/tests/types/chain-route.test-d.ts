import type { EventCallable, Event, Store, StoreWritable } from "@virentia/core";
import { describe, expectTypeOf, it } from "vitest";
import { chainRoute, route } from "../../lib";
import type { RouteOpenedPayload, VirtualRoute } from "../../lib";

describe("chainRoute", () => {
  describe("over a param route", () => {
    it("returns a VirtualRoute keyed by the source params", () => {
      const source = route({ path: "/profile/:id" });
      const chained = chainRoute({ route: source, beforeOpen: () => {} });

      expectTypeOf(chained).toEqualTypeOf<
        VirtualRoute<RouteOpenedPayload<{ id: string }>, { id: string }>
      >();
      expectTypeOf(chained).not.toBeAny();
      expectTypeOf(chained.open).toEqualTypeOf<
        EventCallable<RouteOpenedPayload<{ id: string }>>
      >();
      expectTypeOf(chained.params).toEqualTypeOf<StoreWritable<{ id: string }>>();
      expectTypeOf(chained.cancelled).toEqualTypeOf<EventCallable<void>>();
      expectTypeOf(chained.opened).toEqualTypeOf<Event<RouteOpenedPayload<{ id: string }>>>();
      expectTypeOf(chained.isPending).toEqualTypeOf<Store<boolean>>();
    });
  });

  describe("over a void route", () => {
    it("returns a void-param VirtualRoute", () => {
      const source = route({ path: "/home" });
      const chained = chainRoute({ route: source, beforeOpen: () => {} });

      expectTypeOf(chained).toEqualTypeOf<
        VirtualRoute<RouteOpenedPayload<void>, void>
      >();
    });
  });

  describe("with a missing route", () => {
    it("rejects the props", () => {
      // @ts-expect-error route is a required prop
      chainRoute({ beforeOpen: () => {} });
    });
  });
});
