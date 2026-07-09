import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { historyAdapter, route, router } from "@virentia/router";
import { Outlet, routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

// Regression: two sibling routes rendered by the SAME component whose nested
// <Outlet/> has DIFFERENT-length children must not trigger React's
// "Rendered more hooks than during the previous render" when switching between
// them. The fix keys the rendered view by route identity, forcing a remount.
describe("Outlet", () => {
  describe("shared component across siblings", () => {
    it("remounts without crashing when switching between siblings that reuse the component", async () => {
      const parent = route({ path: "/parent" });
      const childA = route({ path: "/a", parent });
      const childB = route({ path: "/b", parent });
      const grandA = route({ path: "/ga", parent: childA });
      const grandB1 = route({ path: "/gb1", parent: childB });
      const grandB2 = route({ path: "/gb2", parent: childB });

      const appScope = scope();
      const appRouter = router({
        routes: [parent, childA, childB, grandA, grandB1, grandB2]
      });
      await scoped(appScope, () =>
        appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/parent/a"] })))
      );

      // SAME component reference for both child views; each renders its own Outlet.
      const SharedChild = () => (
        <div>
          <span data-testid="shared">shared</span>
          <Outlet />
        </div>
      );

      const RoutesView = routesView({
        routes: [
          {
            route: parent,
            view: () => (
              <div>
                <span data-testid="parent">parent</span>
                <Outlet />
              </div>
            ),
            children: [
              { route: childA, view: SharedChild, children: [{ route: grandA, view: () => <span data-testid="ga">ga</span> }] },
              {
                route: childB,
                view: SharedChild,
                children: [
                  { route: grandB1, view: () => <span data-testid="gb1">gb1</span> },
                  { route: grandB2, view: () => <span data-testid="gb2">gb2</span> }
                ]
              }
            ]
          }
        ]
      });

      const { getByTestId } = renderWithRouter(appRouter, appScope, <RoutesView />);
      await waitFor(() => expect(getByTestId("shared")).toBeTruthy());

      // Navigate childA -> childB (reuses SharedChild; different children length).
      await openRoute(grandB1, appScope);
      await waitFor(() => {
        expect(getByTestId("parent")).toBeTruthy();
        expect(getByTestId("shared")).toBeTruthy();
        expect(getByTestId("gb1").textContent).toBe("gb1");
      });
    });
  });
});
