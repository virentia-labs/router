import { scope, scoped } from "@virentia/core";
import { describe, expect, it, vi } from "vitest";
import { route } from "../../lib";
import type { InternalRoute, Route } from "../../lib";
import { watchCalls } from "../support/router-harness";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

describe("route preloaders", () => {
  it("runs preloaders before activation and before beforeOpen; the disposer removes them", async () => {
    const events: string[] = [];
    let openedDuringPreload: boolean | null = null;

    const dash = route({
      path: "/dash/:id",
      beforeOpen: [
        () => {
          events.push("beforeOpen");
        },
      ],
    });
    const appScope = scope();
    const runner = scoped(appScope);

    const dispose = scoped(appScope, () =>
      internalOf(dash).addPreloader(() => {
        events.push("preload");
        openedDuringPreload = scoped(appScope, () => dash.isOpened.value);
      }),
    );

    await runner(() =>
      internalOf(dash).activateRoute({ params: { id: "a" }, navigate: false }, runner),
    );

    expect(events).toStrictEqual(["preload", "beforeOpen"]);
    // preloader ran before the route was activated
    expect(openedDuringPreload).toBe(false);

    // dispose the preloader, then re-activate with DIFFERENT params (so the
    // idempotency guard does not short-circuit): preloader must not run again.
    dispose();
    events.length = 0;

    await runner(() =>
      internalOf(dash).activateRoute({ params: { id: "b" }, navigate: false }, runner),
    );

    expect(events).toStrictEqual(["beforeOpen"]);
  });

  describe("openRoute", () => {
    it("runs preloaders and beforeOpen without activating the route", async () => {
      const events: string[] = [];
      const r = route({
        path: "/r/:id",
        beforeOpen: [
          () => {
            events.push("beforeOpen");
          },
        ],
      });
      const appScope = scope();
      const runner = scoped(appScope);
      const opened = watchCalls(r.opened, appScope);

      scoped(appScope, () =>
        internalOf(r).addPreloader(() => {
          events.push("preload");
        }),
      );

      const result = await runner(() =>
        internalOf(r).openRoute({ params: { id: "1" }, navigate: false }, runner),
      );

      // openRoute is the guard/preload pass only: no isOpened, no opened event.
      expect(events).toStrictEqual(["preload", "beforeOpen"]);
      expect(scoped(appScope, () => r.isOpened.value)).toBe(false);
      expect(opened).toHaveBeenCalledTimes(0);
      // it returns the payload it was given
      expect(result).toEqual(expect.objectContaining({ params: { id: "1" } }));
    });

    it("walks the parent chain running each parent's guards", async () => {
      const parentGuard = vi.fn();
      const childGuard = vi.fn();
      const parent = route({ path: "/p", beforeOpen: [parentGuard] });
      const child = route({ path: "/c", parent, beforeOpen: [childGuard] });
      const appScope = scope();
      const runner = scoped(appScope);

      await runner(() =>
        internalOf(child).openRoute({ params: {}, navigate: false } as never, runner),
      );

      expect(childGuard).toHaveBeenCalledTimes(1);
      expect(parentGuard).toHaveBeenCalledTimes(1);
      // neither route is activated by openRoute
      scoped(appScope, () => {
        expect(child.isOpened.value).toBe(false);
        expect(parent.isOpened.value).toBe(false);
      });
    });
  });
});
