import { scope, scoped } from "@virentia/core";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { useOpenedViews, type RouteView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

// Probe rendering every opened view the hook returns, in document order.
// The survivors are exactly the non-ancestor views; the last one is the
// deepest view routesView/Outlet would select via `.at(-1)`.
function OpenedProbe({ views }: { views: RouteView[] }) {
  const opened = useOpenedViews(views);
  return (
    <div data-testid="opened">
      {opened.map((view, index) => createElement(view.view, { key: index }))}
    </div>
  );
}

describe("useOpenedViews", () => {
  it("returns the deepest opened view and eliminates a direct parent", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({ path: "/settings", parent: profileRoute });
    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    const views: RouteView[] = [
      { route: profileRoute, view: () => <span data-testid="v-profile">P</span> },
      { route: settingsRoute, view: () => <span data-testid="v-settings">S</span> }
    ];

    renderWithRouter(appRouter, appScope, <OpenedProbe views={views} />);

    await openRoute(settingsRoute, appScope);

    await waitFor(() => {
      // Both are opened in state (settings opens its parent), but the parent is
      // eliminated from the returned list, leaving only the child.
      expect(screen.queryByTestId("v-profile")).toBeFalsy();
      expect(screen.getByTestId("v-settings").textContent).toBe("S");
    });
    // The lone survivor is the deepest view.
    expect(screen.getByTestId("opened").children.length).toBe(1);
  });

  it("eliminates a listed grandparent when the intermediate parent is absent", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({ path: "/settings", parent: profileRoute });
    const advancedRoute = route({ path: "/advanced", parent: settingsRoute });
    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute, advancedRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    // Intermediate `settingsRoute` is intentionally absent from the view list.
    const views: RouteView[] = [
      { route: profileRoute, view: () => <span data-testid="v-profile">P</span> },
      { route: advancedRoute, view: () => <span data-testid="v-advanced">A</span> }
    ];

    renderWithRouter(appRouter, appScope, <OpenedProbe views={views} />);

    await openRoute(advancedRoute, appScope);

    await waitFor(() => {
      // The fixed behavior: the full ancestor chain is walked, so the opened
      // grandchild eliminates the listed grandparent despite the gap.
      expect(screen.queryByTestId("v-profile")).toBeFalsy();
      expect(screen.getByTestId("v-advanced").textContent).toBe("A");
    });
  });
});
