import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { route, router, historyAdapter } from "@virentia/router";
import { Outlet, routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("Outlet", () => {
  it("renders three levels deep without infinite recursion", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({ path: "/settings", parent: profileRoute });
    const advancedRoute = route({ path: "/advanced", parent: settingsRoute });

    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute, advancedRoute] });
    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] })))
    );

    const ProfileView = () => (
      <div>
        <span data-testid="profile">P</span>
        <Outlet />
      </div>
    );
    const SettingsView = () => (
      <div>
        <span data-testid="settings">S</span>
        <Outlet />
      </div>
    );
    const AdvancedView = () => <span data-testid="advanced">A</span>;

    const RoutesView = routesView({
      routes: [
        {
          route: profileRoute,
          view: ProfileView,
          children: [
            {
              route: settingsRoute,
              view: SettingsView,
              children: [{ route: advancedRoute, view: AdvancedView }]
            }
          ]
        }
      ]
    });

    const { getByTestId, queryByTestId } = renderWithRouter(appRouter, appScope, <RoutesView />);

    // Only profile open initially
    expect(getByTestId("profile").textContent).toBe("P");
    expect(queryByTestId("advanced")).toBeFalsy();

    await openRoute(advancedRoute, appScope);

    await waitFor(() => {
      expect(getByTestId("profile").textContent).toBe("P");
      expect(getByTestId("settings").textContent).toBe("S");
      expect(getByTestId("advanced").textContent).toBe("A");
    });
  });
});
