import { allSettled, event, reaction, scope, scoped, store } from "@virentia/core";
import { ScopeProvider } from "@virentia/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { type ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import {
  chainRoute,
  route,
  router,
  historyAdapter,
  type RouteOpenedPayload
} from "@virentia/router";
import {
  routeView,
  routesView,
  Link,
  RouterProvider,
  withLayout
} from "../lib";
import { openRoute, renderWithRouter } from "./utils";

describe("react bindings", () => {
  test("component changes when path changes", async () => {
    const route1 = route({ path: "/app" });
    const route2 = route({ path: "/faq" });
    const appScope = scope();
    const appRouter = router({ routes: [route1, route2] });
    const history = createMemoryHistory();

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    const RoutesView = routesView({
      routes: [
        { route: route1, view: () => <p id="message">route1</p> },
        { route: route2, view: () => <p id="message">route2</p> }
      ],
      otherwise: () => <p id="message">not found</p>
    });

    const { container } = renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(route1, appScope);
    await waitFor(() => expect(container.querySelector("#message")?.textContent).toBe("route1"));

    await openRoute(route2, appScope);
    await waitFor(() => expect(container.querySelector("#message")?.textContent).toBe("route2"));

    act(() => {
      history.push("/not-found");
    });

    await waitFor(() =>
      expect(container.querySelector("#message")?.textContent).toBe("not found"),
    );
  });

  test("link opens target route", async () => {
    const route1 = route({ path: "/app" });
    const route2 = route({ path: "/faq/:id" });
    const appScope = scope();
    const appRouter = router({ routes: [route1, route2] });
    const history = createMemoryHistory({ initialEntries: ["/app"] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(history)
    });

    const RoutesView = routesView({
      routes: [
        {
          route: route1,
          view: () => (
            <Link params={{ id: "123" }} to={route2} id="link">
              route1
            </Link>
          )
        },
        {
          route: route2,
          view: () => (
            <Link to={route1} id="link">
              route2
            </Link>
          )
        }
      ],
      otherwise: () => <p id="message">not found</p>
    });

    const { container } = renderWithRouter(appRouter, appScope, <RoutesView />);

    await waitFor(() => expect(container.querySelector("#link")?.textContent).toBe("route1"));
    fireEvent.click(container.querySelector("#link")!);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(route2.isOpened.value).toBe(true);
        expect(route2.params.value.id).toBe("123");
      }),
    );

    fireEvent.click(container.querySelector("#link")!);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(route1.isOpened.value).toBe(true);
      }),
    );
  });

  test("link navigation runs beforeOpen once and does not render otherwise", async () => {
    const beforeOpen = vi.fn();
    const home = route({ path: "/" });
    const profile = route({
      path: "/profile/:id",
      beforeOpen: [beforeOpen]
    });
    const appScope = scope();
    const appRouter = router({ routes: [home, profile] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))
    });

    const RoutesView = routesView({
      routes: [
        {
          route: home,
          view: () => (
            <Link to={profile} params={{ id: "42" }}>
              Profile
            </Link>
          )
        },
        {
          route: profile,
          view: () => <p data-testid="message">profile</p>
        }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await waitFor(() => expect(screen.getByText("Profile")).toBeTruthy());
    fireEvent.click(screen.getByText("Profile"));

    await waitFor(() => {
      expect(screen.getByTestId("message").textContent).toBe("profile");
      expect(beforeOpen).toHaveBeenCalledTimes(1);
    });
  });

  test("link renders href with params and query", async () => {
    const home = route({ path: "/" });
    const profile = route({ path: "/profile/:id" });
    const appRouter = router({ routes: [home, profile] });
    const appScope = scope();

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))
    });

    renderWithRouter(
      appRouter,
      appScope,
      <Link to={profile} params={{ id: "42" }} query={{ tab: "posts" }}>
        Profile
      </Link>,
    );

    await waitFor(() => expect(screen.getByText("Profile").getAttribute("href")).toBe("/profile/42?tab=posts"));
  });

  test("chained route chooses redirected profile or auth view", async () => {
    interface User {
      id: number;
      name: string;
    }

    const authRoute = route({ path: "/auth" });
    const profileRoute = route({ path: "/profile" });
    const user = store<User | null>({ id: 1, name: "edward" });

    const authorizationCheckStarted = event<RouteOpenedPayload<void>>();
    const authorized = event<void>();
    const rejected = event<void>();

    reaction({
      on: authorizationCheckStarted,
      run() {
        void (user.value ? authorized : rejected)();
      }
    });

    const chainedRoute = chainRoute({
      route: authRoute,
      beforeOpen: authorizationCheckStarted,
      openOn: rejected,
      cancelOn: authorized
    });

    reaction({
      on: chainedRoute.cancelled,
      run() {
        void profileRoute.open({});
      }
    });

    const appScope = scope();
    const appRouter = router({ routes: [authRoute, profileRoute] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/app"] }))
    });

    const RoutesView = routesView({
      routes: [
        {
          route: chainedRoute,
          view: () => <p data-testid="message">auth</p>
        },
        {
          route: profileRoute,
          view: () => <p data-testid="message">profile</p>
        }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(authRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("profile"));

    await act(async () => {
      await allSettled(user, { scope: appScope, payload: null });
      await allSettled(authRoute.open, { scope: appScope, payload: {} });
    });

    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("auth"));
  });

  test("nested routes prefer child view and can return to parent view", async () => {
    const profileRoute = route({ path: "/profile" });
    const friendsRoute = route({
      path: "/friends",
      parent: profileRoute
    });

    const appScope = scope();
    const appRouter = router({ routes: [friendsRoute, profileRoute] });

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/app"] }))
    });

    const RoutesView = routesView({
      routes: [
        {
          route: friendsRoute,
          view: () => <p data-testid="message">friends</p>
        },
        {
          route: profileRoute,
          view: () => <p data-testid="message">profile</p>
        }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(friendsRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("friends"));

    await openRoute(profileRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("profile"));
  });

  test("withLayout wraps grouped route views", async () => {
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

    await allSettled(appRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/auth"] }))
    });

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
});
