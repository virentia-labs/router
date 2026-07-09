import { scope, scoped } from "@virentia/core";
import { waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { useIsOpened } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("scope isolation", () => {
  it("opening a route in one scope leaves a tree in another scope untouched", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appRouter = router({ routes: [homeRoute, profileRoute] });
    const scopeA = scope();
    const scopeB = scope();

    await scoped(scopeA, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );
    await scoped(scopeB, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    function Probe() {
      const opened = useIsOpened(profileRoute);
      return <span data-testid="state">{opened ? "open" : "closed"}</span>;
    }

    // Two independent trees, one per scope, sharing the same router/route objects.
    const treeA = renderWithRouter(appRouter, scopeA, <Probe />);
    const treeB = renderWithRouter(appRouter, scopeB, <Probe />);

    await openRoute(profileRoute, scopeA);

    await waitFor(() =>
      expect(treeA.container.querySelector("[data-testid='state']")?.textContent).toBe("open")
    );
    // Scope B is untouched: state store is per-scope.
    expect(treeB.container.querySelector("[data-testid='state']")?.textContent).toBe("closed");
    scoped(scopeB, () => {
      expect(profileRoute.isOpened.value).toBe(false);
    });
  });
});
