import type { EventCallable, Store } from "@virentia/core";
import { describe, expectTypeOf, it } from "vitest";
import { group, route, virtualRoute } from "../../lib";
import type { VirtualRoute } from "../../lib";

describe("group", () => {
  it("returns a void VirtualRoute over mixed members", () => {
    const grouped = group([route({ path: "/a" }), virtualRoute()]);

    expectTypeOf(grouped).toEqualTypeOf<VirtualRoute<void, void>>();
    expectTypeOf(grouped).not.toBeAny();
    expectTypeOf(grouped.open).toEqualTypeOf<EventCallable<void>>();
    expectTypeOf(grouped.close).toEqualTypeOf<EventCallable<void>>();
    expectTypeOf(grouped.isOpened).not.toBeAny();
    expectTypeOf(grouped.isPending).toEqualTypeOf<Store<boolean>>();
  });

  describe("with a single route instead of an array", () => {
    it("rejects the argument", () => {
      // @ts-expect-error group takes an array of routes
      group(route({ path: "/a" }));
    });
  });
});
