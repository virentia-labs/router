import type { EventCallable, Event } from "@virentia/core";
import { describe, expectTypeOf, it } from "vitest";
import { route, router, routerControls } from "../../lib";
import type { QuerySchema, QueryTracker, QueryTrackerConfig } from "../../lib";

const numberSchema: QuerySchema<{ id: number }> = {
  safeParse: () => ({ success: false })
};

describe("QueryTrackerConfig", () => {
  it("requires a schema and allows forRoutes and check", () => {
    expectTypeOf<QueryTrackerConfig<{ id: number }>["parameters"]>().toEqualTypeOf<
      QuerySchema<{ id: number }>
    >();
    expectTypeOf<QueryTrackerConfig<{ id: number }>>().not.toBeAny();
  });
});

describe("router().trackQuery", () => {
  it("returns a QueryTracker of the parsed parameters", () => {
    const appRouter = router({ routes: [route({ path: "/" })] });
    const tracker = appRouter.trackQuery({ parameters: numberSchema });

    expectTypeOf(tracker).toEqualTypeOf<QueryTracker<{ id: number }>>();
    expectTypeOf(tracker).not.toBeAny();
    expectTypeOf(tracker.entered).toEqualTypeOf<Event<{ id: number }>>();
    expectTypeOf(tracker.enteredExternally).toEqualTypeOf<Event<{ id: number }>>();
    expectTypeOf(tracker.enter).toEqualTypeOf<EventCallable<{ id: number }>>();
    expectTypeOf(tracker.exit).toEqualTypeOf<
      EventCallable<{ ignoreParams: string[] } | void>
    >();
    expectTypeOf(tracker.exited).toEqualTypeOf<Event<void>>();
  });

  describe("without a schema", () => {
    it("rejects the config", () => {
      const appRouter = router({ routes: [route({ path: "/" })] });

      // @ts-expect-error parameters is a required config field
      appRouter.trackQuery({});
    });
  });
});

describe("routerControls().trackQuery", () => {
  it("returns a QueryTracker but forbids forRoutes", () => {
    const controls = routerControls();
    const tracker = controls.trackQuery({ parameters: numberSchema });

    expectTypeOf(tracker).toEqualTypeOf<QueryTracker<{ id: number }>>();

    // @ts-expect-error forRoutes is omitted from the controls-level trackQuery config
    controls.trackQuery({ parameters: numberSchema, forRoutes: [] });
  });
});
