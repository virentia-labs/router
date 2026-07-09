import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { route, router, historyAdapter, type Route } from "@virentia/router";
import { routeView, routesView, Outlet } from "../../lib";
import { renderWithRouter } from "../support/render";

async function waitForOpened<T extends object | void>(appScope: ReturnType<typeof scope>, route: Route<T>) {
  await waitFor(() =>
    scoped(appScope, () => {
      expect(route.isOpened.value).toBe(true);
    }),
  );
}

describe("Outlet", () => {
  it("renders children declared via routeView", async () => {
    const profileRoute = route({ path: "/profile" });
    const settingsRoute = route({
      path: "/settings",
      parent: profileRoute
    });
    const appScope = scope();
    const appRouter = router({ routes: [profileRoute, settingsRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/profile/settings"] }))));
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
