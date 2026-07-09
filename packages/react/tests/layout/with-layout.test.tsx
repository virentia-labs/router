import { scope, scoped } from "@virentia/core";
import { ScopeProvider } from "@virentia/react";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routeView, routesView, RouterProvider, withLayout } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("withLayout", () => {
  it("wraps grouped route views and omits the wrapper for a bare route", async () => {
    const profileRoute = route({ path: "/profile" });
    const friendsRoute = route({
      path: "/friends",
      parent: profileRoute
    });
    const authRoute = route({ path: "/auth" });
    const appScope = scope();
    const appRouter = router({
      routes: [friendsRoute, profileRoute, authRoute]
    });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/auth"] }))));

    const ProfileLayout = (props: { children: ReactNode }) => (
      <>
        <p data-testid="layout">layout!</p>
        {props.children}
      </>
    );

    const RoutesView = routesView({
      routes: [
        ...withLayout(ProfileLayout, [
          routeView({
            route: friendsRoute,
            view: () => <p data-testid="message">friends</p>
          }),
          routeView({
            route: profileRoute,
            view: () => <p data-testid="message">profile</p>
          })
        ]),
        routeView({
          route: authRoute,
          view: () => <p data-testid="message">auth</p>
        })
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    render(
      <ScopeProvider scope={appScope}>
        <RouterProvider router={appRouter}>
          <RoutesView />
        </RouterProvider>
      </ScopeProvider>,
    );

    await openRoute(friendsRoute, appScope);

    await waitFor(() => {
      expect(screen.getByTestId("layout").textContent).toBe("layout!");
      expect(screen.getByTestId("message").textContent).toBe("friends");
    });

    await openRoute(profileRoute, appScope);

    await waitFor(() => {
      expect(screen.getByTestId("layout").textContent).toBe("layout!");
      expect(screen.getByTestId("message").textContent).toBe("profile");
    });

    await openRoute(authRoute, appScope);

    await waitFor(() => {
      expect(screen.queryByTestId("layout")).toBeFalsy();
      expect(screen.getByTestId("message").textContent).toBe("auth");
    });
  });

  it("wraps every sibling view in the shared layout", async () => {
    const oneRoute = route({ path: "/one" });
    const twoRoute = route({ path: "/two" });
    const bareRoute = route({ path: "/bare" });
    const appScope = scope();
    const appRouter = router({ routes: [oneRoute, twoRoute, bareRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    const Layout = ({ children }: { children: React.ReactNode }) => (
      <div>
        <span data-testid="layout">L</span>
        {children}
      </div>
    );

    const RoutesView = routesView({
      routes: [
        ...withLayout(Layout, [
          { route: oneRoute, view: () => <span data-testid="message">one</span> },
          { route: twoRoute, view: () => <span data-testid="message">two</span> }
        ]),
        { route: bareRoute, view: () => <span data-testid="message">bare</span> }
      ]
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(oneRoute, appScope);
    await waitFor(() => {
      expect(screen.getByTestId("layout").textContent).toBe("L");
      expect(screen.getByTestId("message").textContent).toBe("one");
    });

    await openRoute(twoRoute, appScope);
    await waitFor(() => {
      expect(screen.getByTestId("layout").textContent).toBe("L");
      expect(screen.getByTestId("message").textContent).toBe("two");
    });

    // A route not passed through withLayout renders without the wrapper.
    await openRoute(bareRoute, appScope);
    await waitFor(() => {
      expect(screen.queryByTestId("layout")).toBeFalsy();
      expect(screen.getByTestId("message").textContent).toBe("bare");
    });
  });
});
