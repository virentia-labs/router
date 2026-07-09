import { describe, expect, it } from "vitest";
import { router } from "@virentia/router";
import { lazyRouteView } from "../../lib";

describe("lazyRouteView", () => {
  it("does not throw when applied over a Router that has no setAsyncImport", () => {
    const appRouter = router({ routes: [] });
    expect(() =>
      lazyRouteView({
        route: appRouter as never,
        view: () => Promise.resolve({ default: () => null })
      })
    ).not.toThrow();
  });
});
