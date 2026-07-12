import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { useLink } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("useLink", () => {
  it("throws when the route is unknown to the router", async () => {
    const homeRoute = route({ path: "/" });
    const strayRoute = route({ path: "/stray" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))),
    );

    function Probe() {
      useLink(strayRoute);
      return null;
    }

    expect(() => renderWithRouter(appRouter, appScope, <Probe />)).toThrow(
      "[useLink] Route not found. Pass it to router first.",
    );
  });
});
