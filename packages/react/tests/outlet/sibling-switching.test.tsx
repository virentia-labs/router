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
  it("switches between sibling child routes", async () => {
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

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] }))));
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
});
