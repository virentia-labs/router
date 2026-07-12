import { scope, scoped } from "@virentia/core";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routeView, routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("routeView", () => {
  it("wraps the view in the provided layout", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))),
    );

    const Layout = ({ children }: { children: ReactNode }) => (
      <div>
        <span data-testid="layout">L</span>
        {children}
      </div>
    );

    const RoutesView = routesView({
      routes: [
        routeView({ route: homeRoute, view: () => <p data-testid="message">home</p> }),
        routeView({
          route: profileRoute,
          view: () => <p data-testid="message">profile</p>,
          layout: Layout
        })
      ]
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(profileRoute, appScope);
    await waitFor(() => {
      expect(screen.getByTestId("layout").textContent).toBe("L");
      expect(screen.getByTestId("message").textContent).toBe("profile");
    });

    // The layout wraps only the route it was given.
    await openRoute(homeRoute, appScope);
    await waitFor(() => {
      expect(screen.queryByTestId("layout")).toBeFalsy();
      expect(screen.getByTestId("message").textContent).toBe("home");
    });
  });
});
