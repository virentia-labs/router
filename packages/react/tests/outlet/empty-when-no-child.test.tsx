import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { route, router, historyAdapter, type Route } from "@virentia/router";
import { routesView, Outlet } from "../../lib";
import { renderWithRouter } from "../support/render";

async function waitForOpened<T extends object | void>(appScope: ReturnType<typeof scope>, route: Route<T>) {
  await waitFor(() =>
    scoped(appScope, () => {
      expect(route.isOpened.value).toBe(true);
    }),
  );
}

describe("Outlet", () => {
  it("renders nothing when no child route is active", async () => {
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
});
