import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { route, router, historyAdapter, type Route } from "@virentia/router";
import { routesView, Outlet } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

async function waitForOpened<T extends object | void>(appScope: ReturnType<typeof scope>, route: Route<T>) {
  await waitFor(() =>
    scoped(appScope, () => {
      expect(route.isOpened.value).toBe(true);
    }),
  );
}

describe("Outlet", () => {
  it("renders the active child route inside the parent view", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] }))));
    await waitForOpened(appScope, profileRoute);

    const ProfileView = () => (
      <div>
        <h1 data-testid="profile">Profile</h1>
        <Outlet />
      </div>
    );
    const SettingsView = () => <p data-testid="settings">Settings</p>;
    const RoutesView = routesView({
      routes: [
        {
          route: profileRoute,
          view: ProfileView,
          children: [
            {
              route: settingsRoute,
              view: SettingsView
            }
          ]
        }
      ]
    });

    const { getByTestId, queryByTestId } = renderWithRouter(appRouter, appScope, <RoutesView />);

    expect(getByTestId("profile").textContent).toBe("Profile");
    expect(queryByTestId("settings")).toBeFalsy();

    await openRoute(settingsRoute, appScope);

    await waitFor(() => {
      expect(getByTestId("profile").textContent).toBe("Profile");
      expect(getByTestId("settings").textContent).toBe("Settings");
    });
  });

  it("renders the active child for a simple nested route pair", async () => {
    const dashboardRoute = route({ path: "/dashboard" });
    const settingsRoute = route({
      path: "/settings",
      parent: dashboardRoute
    });
    const appScope = scope();
    const appRouter = router({ routes: [dashboardRoute, settingsRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/dashboard"] }))));
    await waitForOpened(appScope, dashboardRoute);

    const DashboardView = () => (
      <div>
        <h1 data-testid="dashboard">Dashboard</h1>
        <Outlet />
      </div>
    );
    const SettingsView = () => <p data-testid="settings">Settings Content</p>;
    const RoutesView = routesView({
      routes: [
        {
          route: dashboardRoute,
          view: DashboardView,
          children: [
            {
              route: settingsRoute,
              view: SettingsView
            }
          ]
        }
      ]
    });

    const { getByTestId, queryByTestId } = renderWithRouter(appRouter, appScope, <RoutesView />);

    expect(getByTestId("dashboard").textContent).toBe("Dashboard");
    expect(queryByTestId("settings")).toBeFalsy();

    await openRoute(settingsRoute, appScope);

    await waitFor(() => {
      expect(getByTestId("dashboard").textContent).toBe("Dashboard");
      expect(getByTestId("settings").textContent).toBe("Settings Content");
    });
  });
});
