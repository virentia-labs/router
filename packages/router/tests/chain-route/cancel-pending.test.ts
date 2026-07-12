import { effect, event, scope, scoped } from "@virentia/core";
import { describe, expect, it, vi } from "vitest";
import { chainRoute, virtualRoute, type RouteOpenedPayload } from "../../lib";
import { watchCalls } from "../support/router-harness";

describe("chainRoute", () => {
  describe("when cancelOn fires", () => {
    it("emits cancelled, closing the chained route", async () => {
      const appScope = scope();
      const source = virtualRoute<RouteOpenedPayload<void>>();
      const cancel = event<void>();
      const okFx = effect<RouteOpenedPayload<void>, RouteOpenedPayload<void>, unknown>(
        (payload) => payload,
      );
      const chained = chainRoute({
        route: source,
        beforeOpen: [okFx],
        openOn: okFx.doneData,
        cancelOn: cancel
      });
      const cancelledCalls = watchCalls(chained.cancelled, appScope);

      await scoped(appScope, () => source.open({}));
      await vi.waitFor(() => scoped(appScope, () => expect(chained.isOpened.value).toBe(true)));

      await scoped(appScope, () => cancel());

      expect(cancelledCalls).toHaveBeenCalledTimes(1);
      scoped(appScope, () => expect(chained.isOpened.value).toBe(false));
    });
  });

  describe("while an async guard is in flight", () => {
    it("reports isPending true until the guard settles", async () => {
      const appScope = scope();
      const source = virtualRoute<RouteOpenedPayload<void>>();
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const slowFx = effect<RouteOpenedPayload<void>, RouteOpenedPayload<void>, unknown>(
        async (payload) => {
          await gate;
          return payload;
        },
      );
      const chained = chainRoute({
        route: source,
        beforeOpen: [slowFx],
        openOn: slowFx.doneData
      });

      scoped(appScope, () => expect(chained.isPending.value).toBe(false));

      // Fire without awaiting: the open dispatch would otherwise block on the
      // in-flight guard, which is exactly the window under test.
      scoped(appScope, () => {
        void source.open({});
      });
      await vi.waitFor(() =>
        scoped(appScope, () => expect(chained.isPending.value).toBe(true)),
      );

      release();
      await vi.waitFor(() =>
        scoped(appScope, () => expect(chained.isPending.value).toBe(false)),
      );
    });
  });
});
