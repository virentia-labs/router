import { allSettled, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createRoute, createRouter, historyAdapter, type Route } from "@virentia/router";
import { createRouteView, createRoutesView, Outlet } from "../lib";
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
    const profileRoute = createRoute({ path: "/profile" });
    const settingsRoute = createRoute({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const router = createRouter({ routes: [profileRoute, settingsRoute] });

    await allSettled(router.setHistory, {
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
    const RoutesView = createRoutesView({
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

    const { getByTestId, queryByTestId } = renderWithRouter(router, appScope, <RoutesView />);

    expect(getByTestId("profile").textContent).toBe("Profile");
    expect(queryByTestId("settings")).toBeFalsy();

    await openRoute(settingsRoute, appScope);

    await waitFor(() => {
      expect(getByTestId("profile").textContent).toBe("Profile");
      expect(getByTestId("settings").textContent).toBe("Settings");
    });
  });

  test("outlet renders nothing when no child route is active", async () => {
    const profileRoute = createRoute({ path: "/profile" });
    const settingsRoute = createRoute({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const router = createRouter({ routes: [profileRoute, settingsRoute] });

    await allSettled(router.setHistory, {
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
    const RoutesView = createRoutesView({
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

    const { getByTestId, queryByTestId } = renderWithRouter(router, appScope, <RoutesView />);

    expect(getByTestId("profile").textContent).toBe("Profile");
    expect(getByTestId("outlet-container").children.length).toBe(0);
    expect(queryByTestId("settings")).toBeFalsy();
  });

  test("outlet switches between sibling routes", async () => {
    const profileRoute = createRoute({ path: "/profile" });
    const settingsRoute = createRoute({
      path: "/settings",
      parent: profileRoute
    });
    const notificationsRoute = createRoute({
      path: "/notifications",
      parent: profileRoute
    });
    const appScope = scope();
    const router = createRouter({
      routes: [profileRoute, settingsRoute, notificationsRoute]
    });

    await allSettled(router.setHistory, {
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
    const RoutesView = createRoutesView({
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

    const { getByTestId, queryByTestId } = renderWithRouter(router, appScope, <RoutesView />);

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
    const dashboardRoute = createRoute({ path: "/dashboard" });
    const settingsRoute = createRoute({
      path: "/settings",
      parent: dashboardRoute
    });
    const appScope = scope();
    const router = createRouter({ routes: [dashboardRoute, settingsRoute] });

    await allSettled(router.setHistory, {
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
    const RoutesView = createRoutesView({
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

    const { getByTestId, queryByTestId } = renderWithRouter(router, appScope, <RoutesView />);

    expect(getByTestId("dashboard").textContent).toBe("Dashboard");
    expect(queryByTestId("settings")).toBeFalsy();

    await openRoute(settingsRoute, appScope);

    await waitFor(() => {
      expect(getByTestId("dashboard").textContent).toBe("Dashboard");
      expect(getByTestId("settings").textContent).toBe("Settings Content");
    });
  });

  test("outlet with nested router", async () => {
    const rootRoutes = {
      profile: createRoute({ path: "/profile" })
    };
    const profileRoutes = {
      friends: createRoute({ path: "/friends", parent: rootRoutes.profile }),
      settings: createRoute({ path: "/settings", parent: rootRoutes.profile })
    };
    const profileRouter = createRouter({
      routes: [profileRoutes.friends, profileRoutes.settings]
    });
    const router = createRouter({
      routes: [rootRoutes.profile, profileRouter]
    });
    const appScope = scope();

    await allSettled(router.setHistory, {
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
    const ProfileRoutesView = createRoutesView({
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
    const RoutesView = createRoutesView({
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

    const { getByTestId, queryByTestId } = renderWithRouter(router, appScope, <RoutesView />);

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

  test("outlet with nested routes created via createRouteView", async () => {
    const profileRoute = createRoute({ path: "/profile" });
    const settingsRoute = createRoute({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const router = createRouter({ routes: [profileRoute, settingsRoute] });

    await allSettled(router.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/profile/settings"] }))
    });
    await waitForOpened(appScope, settingsRoute);

    const RoutesView = createRoutesView({
      routes: [
        createRouteView({
          route: profileRoute,
          view: () => (
            <div>
              <h1 data-testid="profile">Profile</h1>
              <Outlet />
            </div>
          ),
          children: [
            createRouteView({
              route: settingsRoute,
              view: () => <p data-testid="settings">Settings</p>
            })
          ]
        })
      ]
    });

    const { container } = renderWithRouter(router, appScope, <RoutesView />);

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
