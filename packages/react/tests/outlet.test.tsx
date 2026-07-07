import { allSettled, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { route, router, historyAdapter, type Route } from "@virentia/router";
import { routeView, routesView, Outlet } from "../lib";
import { openRoute, renderWithRouter } from "./utils";

async function waitForOpened<T extends object | void>(appScope: ReturnType<typeof scope>, route: Route<T>) {
  await waitFor(() =>
    scoped(appScope, () => {
      expect(route.isOpened.value).toBe(true);
    }),
  );
}

describe("Outlet", () => {
  test("renders child route in outlet", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] }))
    });
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

  test("outlet renders nothing when no child route is active", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] }))
    });
    await waitForOpened(appScope, profileRoute);

    const ProfileView = () => (
      <div>
        <h1 data-testid="profile">Profile</h1>
        <div data-testid="outlet-container">
          <Outlet />
        </div>
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
    expect(getByTestId("outlet-container").children.length).toBe(0);
    expect(queryByTestId("settings")).toBeFalsy();
  });

  test("outlet switches between sibling routes", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({
      path: "/settings",
      parent: profileRoute
    });
    const notificationsRoute = route({
      path: "/notifications",
      parent: profileRoute
    });
    const appScope = scope();
    const appRouter = router({
      routes: [profileRoute, settingsRoute, notificationsRoute]
    });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] }))
    });
    await waitForOpened(appScope, profileRoute);

    const ProfileView = () => (
      <div>
        <h1 data-testid="profile">Profile</h1>
        <Outlet />
      </div>
    );
    const SettingsView = () => <p data-testid="settings">Settings</p>;
    const NotificationsView = () => <p data-testid="notifications">Notifications</p>;
    const RoutesView = routesView({
      routes: [
        {
          route: profileRoute,
          view: ProfileView,
          children: [
            {
              route: settingsRoute,
              view: SettingsView
            },
            {
              route: notificationsRoute,
              view: NotificationsView
            }
          ]
        }
      ]
    });

    const { getByTestId, queryByTestId } = renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(settingsRoute, appScope);
    await waitFor(() => {
      expect(getByTestId("settings").textContent).toBe("Settings");
      expect(queryByTestId("notifications")).toBeFalsy();
    });

    await openRoute(notificationsRoute, appScope);
    await waitFor(() => {
      expect(getByTestId("notifications").textContent).toBe("Notifications");
      expect(queryByTestId("settings")).toBeFalsy();
    });

    await openRoute(profileRoute, appScope);
    await waitFor(() => {
      expect(getByTestId("profile").textContent).toBe("Profile");
      expect(queryByTestId("settings")).toBeFalsy();
      expect(queryByTestId("notifications")).toBeFalsy();
    });
  });

  test("outlet with simple nested routes", async () => {
    const dashboardRoute = route({ path: "/dashboard" });
    const settingsRoute = route({
      path: "/settings",
      parent: dashboardRoute
    });
    const appScope = scope();
    const appRouter = router({ routes: [dashboardRoute, settingsRoute] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/dashboard"] }))
    });
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

  test("outlet with nested appRouter", async () => {
    const rootRoutes = {
      profile: route({ path: "/profile" })
    };
    const profileRoutes = {
      friends: route({ path: "/friends", parent: rootRoutes.profile }),
      settings: route({ path: "/settings", parent: rootRoutes.profile })
    };
    const profileRouter = router({
      routes: [profileRoutes.friends, profileRoutes.settings]
    });
    const appRouter = router({
      routes: [rootRoutes.profile, profileRouter]
    });
    const appScope = scope();

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] }))
    });
    await waitForOpened(appScope, rootRoutes.profile);

    const ProfileView = () => (
      <div>
        <h1 data-testid="profile">Profile</h1>
        <Outlet />
      </div>
    );
    const ProfileRoutesView = routesView({
      routes: [
        {
          route: profileRoutes.friends,
          view: () => <p data-testid="friends">Friends</p>
        },
        {
          route: profileRoutes.settings,
          view: () => <p data-testid="settings">Settings</p>
        }
      ]
    });
    const RoutesView = routesView({
      routes: [
        {
          route: rootRoutes.profile,
          view: ProfileView,
          children: [
            {
              route: profileRouter,
              view: ProfileRoutesView
            }
          ]
        }
      ]
    });

    const { getByTestId, queryByTestId } = renderWithRouter(appRouter, appScope, <RoutesView />);

    expect(getByTestId("profile").textContent).toBe("Profile");
    expect(queryByTestId("friends")).toBeFalsy();
    expect(queryByTestId("settings")).toBeFalsy();

    await openRoute(profileRoutes.friends, appScope);

    await waitFor(() => {
      expect(getByTestId("profile").textContent).toBe("Profile");
      expect(getByTestId("friends").textContent).toBe("Friends");
      expect(queryByTestId("settings")).toBeFalsy();
    });

    await openRoute(profileRoutes.settings, appScope);

    await waitFor(() => {
      expect(getByTestId("profile").textContent).toBe("Profile");
      expect(getByTestId("settings").textContent).toBe("Settings");
      expect(queryByTestId("friends")).toBeFalsy();
    });

    await openRoute(rootRoutes.profile, appScope);

    await waitFor(() => {
      expect(getByTestId("profile").textContent).toBe("Profile");
      expect(queryByTestId("friends")).toBeFalsy();
      expect(queryByTestId("settings")).toBeFalsy();
    });
  });

  test("outlet with nested routes created via routeView", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/profile/settings"] }))
    });
    await waitForOpened(appScope, settingsRoute);

    const RoutesView = routesView({
      routes: [
        routeView({
          route: profileRoute,
          view: () => (
            <div>
              <h1 data-testid="profile">Profile</h1>
              <Outlet />
            </div>
          ),
          children: [
            routeView({
              route: settingsRoute,
              view: () => <p data-testid="settings">Settings</p>
            })
          ]
        })
      ]
    });

    const { container } = renderWithRouter(appRouter, appScope, <RoutesView />);

    await waitFor(() =>
      expect(container).toMatchInlineSnapshot(`
        <div>
          <div>
            <h1
              data-testid="profile"
            >
              Profile
            </h1>
            <p
              data-testid="settings"
            >
              Settings
            </p>
          </div>
        </div>
      `),
    );
  });
});
