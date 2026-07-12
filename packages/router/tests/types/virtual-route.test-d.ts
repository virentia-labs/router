import type { EventCallable, Event, Store, StoreWritable } from "@virentia/core";
import { describe, expectTypeOf, it } from "vitest";
import { virtualRoute } from "../../lib";
import type { VirtualRoute } from "../../lib";

describe("virtualRoute", () => {
  describe("without options", () => {
    it("defaults to a void payload and void params", () => {
      const v = virtualRoute();

      expectTypeOf(v).toEqualTypeOf<VirtualRoute<void, void>>();
      expectTypeOf(v).not.toBeAny();
      expectTypeOf(v.open).toEqualTypeOf<EventCallable<void>>();
      expectTypeOf(v.isPending).toEqualTypeOf<Store<boolean>>();
    });
  });

  describe("with explicit payload and params", () => {
    it("threads both generics through the surface", () => {
      const v = virtualRoute<{ id: string }, { id: string }>();

      expectTypeOf(v).toEqualTypeOf<VirtualRoute<{ id: string }, { id: string }>>();
      expectTypeOf(v.open).toEqualTypeOf<EventCallable<{ id: string }>>();
      expectTypeOf(v.opened).toEqualTypeOf<Event<{ id: string }>>();
      expectTypeOf(v.params).toEqualTypeOf<StoreWritable<{ id: string }>>();
      expectTypeOf(v.isOpened).toEqualTypeOf<StoreWritable<boolean>>();
    });
  });

  describe("with a transformer", () => {
    it("infers the payload argument, driving the params type", () => {
      const v = virtualRoute<{ n: number }, string>({
        transformer: (payload) => {
          expectTypeOf(payload).toEqualTypeOf<{ n: number }>();
          return String(payload.n);
        }
      });

      expectTypeOf(v.params).toEqualTypeOf<StoreWritable<string>>();
      expectTypeOf(v.open).toEqualTypeOf<EventCallable<{ n: number }>>();
    });
  });
});
