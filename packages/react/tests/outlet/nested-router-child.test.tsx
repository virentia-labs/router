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
  it("renders a nested router's view as the outlet child", async () => {
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

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/profile"] }))));
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
});
