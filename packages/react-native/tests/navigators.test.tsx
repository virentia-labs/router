import { NavigationContainer } from "@react-navigation/native";
import {
  scope,
  scoped
} from "@virentia/core";
import type { EventCallable, Scope } from "@virentia/core";
import { ScopeProvider, useUnit } from "@virentia/react";
import { createMemoryHistory } from "history";
import * as React from "react";
import { Text } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { describe, expect, test } from "vitest";
import {
  route,
  router,
  virtualRoute,
  historyAdapter
} from "@virentia/router";
import type { Route, Router } from "@virentia/router";
import { RouterProvider } from "@virentia/router-react";
import type { RouteView } from "@virentia/router-react";
import {
  bottomTabsNavigator,
  stackNavigator
} from "../lib";
import type { BottomTabsRouteView } from "../lib";

function renderWithNavigation(appRouter: Router, appScope: Scope, children: React.ReactNode) {
  return render(
    <ScopeProvider scope={appScope}>
      <RouterProvider router={appRouter}>
        <NavigationContainer>{children}</NavigationContainer>
      </RouterProvider>
    </ScopeProvider>,
  );
}

async function attachHistory(
  appRouter: Router,
  appScope: Scope,
  initialEntries: string[],
) {
  await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries }))));
}

async function openRoute(
  route: Route<any>,
  appScope: Scope,
  payload: unknown = {},
) {
  await act(async () => {
    await scoped(appScope, () => (route.open as EventCallable<any>)(payload));
  });
}

describe("react-native stack navigator", () => {
  test("renders active history route and follows parametrized route opens", async () => {
    const homeRoute = route({ path: "/home" });
    const profileRoute = route({ path: "/profile/:id" });
    const appRouter = router({ routes: [homeRoute, profileRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const routes: RouteView[] = [
      {
        route: homeRoute,
        view: () => <Text testID="home-screen">Home</Text>
      },
      {
        route: profileRoute,
        view: () => {
          const params = useUnit(profileRoute.params);

          return <Text testID="profile-screen">Profile {params.id}</Text>;
        }
      }
    ];

    const { Navigator } = stackNavigator({
      router: appRouter,
      routes,
      initialRouteName: "/home",
      screenOptions: { animation: "none", headerShown: false }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getByTestId("home-screen")).toBeTruthy();

    await openRoute(profileRoute, appScope, { params: { id: "42" } });

    await waitFor(() => {
      expect(screen.getByTestId("profile-screen").props.children).toEqual([
        "Profile ",
        "42"
      ]);
    });
  });

  test("prefers a nested child view over its opened parent and can return to parent", async () => {
    const profileRoute = route({ path: "/profile" });
    const friendsRoute = route({
      path: "/friends",
      parent: profileRoute
    });
    const appRouter = router({ routes: [friendsRoute, profileRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/profile"]);

    const routes: RouteView[] = [
      {
        route: profileRoute,
        view: () => <Text testID="profile-screen">Profile</Text>
      },
      {
        route: friendsRoute,
        view: () => <Text testID="friends-screen">Friends</Text>
      }
    ];

    const { Navigator } = stackNavigator({
      router: appRouter,
      routes,
      initialRouteName: "/profile",
      screenOptions: { animation: "none", headerShown: false }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getByTestId("profile-screen")).toBeTruthy();

    await openRoute(friendsRoute, appScope);

    await waitFor(() => {
      expect(screen.getByTestId("friends-screen")).toBeTruthy();
    });

    await openRoute(profileRoute, appScope);

    await waitFor(() => {
      expect(screen.getByTestId("profile-screen")).toBeTruthy();
      expect(scoped(appScope, () => friendsRoute.isOpened.value)).toBe(false);
    });
  });

  test("supports pathless virtual route screens and transformed params", async () => {
    const homeRoute = route({ path: "/home" });
    const detailsRoute = virtualRoute({
      transformer: ({ id }: { id: string }) => ({ id, source: "virtual" })
    });
    const appRouter = router({ routes: [homeRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const routes: RouteView[] = [
      {
        route: homeRoute,
        view: () => <Text testID="home-screen">Home</Text>
      },
      {
        route: detailsRoute,
        view: () => {
          const params = useUnit(detailsRoute.params);

          return (
            <Text testID="details-screen">
              Details {params.id} from {params.source}
            </Text>
          );
        }
      }
    ];

    const { Navigator } = stackNavigator({
      router: appRouter,
      routes,
      initialRouteName: "/home",
      screenOptions: { animation: "none", headerShown: false }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getByTestId("home-screen")).toBeTruthy();

    await act(async () => {
      await scoped(appScope, () => detailsRoute.open({ id: "modal-1" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("details-screen").props.children).toEqual([
        "Details ",
        "modal-1",
        " from ",
        "virtual"
      ]);
    });
  });

  test("keeps the current React Navigation screen when an opened route has no view", async () => {
    const homeRoute = route({ path: "/home" });
    const hiddenRoute = route({ path: "/hidden" });
    const appRouter = router({ routes: [homeRoute, hiddenRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const { Navigator } = stackNavigator({
      router: appRouter,
      routes: [
        {
          route: homeRoute,
          view: () => <Text testID="home-screen">Home</Text>
        }
      ],
      initialRouteName: "/home",
      screenOptions: { animation: "none", headerShown: false }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getByTestId("home-screen")).toBeTruthy();

    await openRoute(hiddenRoute, appScope);

    await waitFor(() => {
      expect(scoped(appScope, () => hiddenRoute.isOpened.value)).toBe(true);
      expect(screen.getByTestId("home-screen")).toBeTruthy();
    });
  });
});

describe("react-native bottom tabs navigator", () => {
  test("opens routes on tab press in the provided Virentia scope", async () => {
    const homeRoute = route({ path: "/home" });
    const searchRoute = route({ path: "/search" });
    const appRouter = router({ routes: [homeRoute, searchRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const routes: BottomTabsRouteView[] = [
      {
        route: homeRoute,
        view: () => <Text testID="home-tab-screen">Home</Text>
      },
      {
        route: searchRoute,
        view: () => <Text testID="search-tab-screen">Search</Text>
      }
    ];

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes,
      initialRouteName: "home",
      screenOptions: {
        animation: "none"
      }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getByTestId("home-tab-screen")).toBeTruthy();

    fireEvent.press(screen.getByText("search"));

    await waitFor(() => {
      expect(scoped(appScope, () => searchRoute.isOpened.value)).toBe(true);
      expect(screen.getByTestId("search-tab-screen")).toBeTruthy();
    });
  });

  test("passes configured params and query when opening a tab route", async () => {
    const homeRoute = route({ path: "/home" });
    const profileRoute = route({ path: "/profile/:id" });
    const appRouter = router({ routes: [homeRoute, profileRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const routes: BottomTabsRouteView[] = [
      {
        route: homeRoute,
        view: () => <Text testID="home-tab-screen">Home</Text>
      },
      {
        route: profileRoute,
        openPayload: {
          params: { id: "42" },
          query: { source: "tab" }
        },
        view: () => {
          const params = useUnit(profileRoute.params);
          const query = useUnit(appRouter.query);

          return (
            <Text testID="profile-tab-screen">
              Profile {params.id} from {query.source}
            </Text>
          );
        }
      }
    ];

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes,
      initialRouteName: "home",
      screenOptions: {
        animation: "none"
      }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    fireEvent.press(screen.getByText("profile"));

    await waitFor(() => {
      expect(scoped(appScope, () => profileRoute.params.value.id)).toBe("42");
      expect(scoped(appScope, () => appRouter.query.value.source)).toBe("tab");
      expect(screen.getByTestId("profile-tab-screen").props.children).toEqual([
        "Profile ",
        "42",
        " from ",
        "tab"
      ]);
    });
  });

  test("follows external route opens with fresh params", async () => {
    const homeRoute = route({ path: "/home" });
    const profileRoute = route({ path: "/profile/:id" });
    const appRouter = router({ routes: [homeRoute, profileRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes: [
        {
          route: homeRoute,
          view: () => <Text testID="home-tab-screen">Home</Text>
        },
        {
          route: profileRoute,
          view: () => {
            const params = useUnit(profileRoute.params);

            return <Text testID="profile-tab-screen">Profile {params.id}</Text>;
          }
        }
      ],
      initialRouteName: "home",
      screenOptions: {
        animation: "none"
      }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getByTestId("home-tab-screen")).toBeTruthy();

    await openRoute(profileRoute, appScope, { params: { id: "99" } });

    await waitFor(() => {
      expect(screen.getByTestId("profile-tab-screen").props.children).toEqual([
        "Profile ",
        "99"
      ]);
    });
  });

  test("uses stable fallback labels for root and pathless tabs", async () => {
    const rootRoute = route({ path: "/" });
    const detailsRoute = virtualRoute({
      transformer: (payload: { id: string }) => payload
    });
    const appRouter = router({ routes: [rootRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/"]);

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes: [
        {
          route: rootRoute,
          view: () => <Text testID="root-tab-screen">Root</Text>
        },
        {
          route: detailsRoute,
          openPayload: () => ({ id: "virtual-tab" }),
          view: () => {
            const params = useUnit(detailsRoute.params);

            return <Text testID="details-tab-screen">Details {params.id}</Text>;
          }
        }
      ],
      initialRouteName: "Tab0",
      screenOptions: {
        animation: "none"
      }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    const rootTabLabels = screen.getAllByText("Tab 1");
    const detailsTabLabels = screen.getAllByText("Tab 2");

    expect(rootTabLabels.length).toBeGreaterThan(0);
    expect(detailsTabLabels.length).toBeGreaterThan(0);
    expect(screen.getByTestId("root-tab-screen")).toBeTruthy();

    fireEvent.press(detailsTabLabels[0]!);

    await waitFor(() => {
      expect(screen.getByTestId("details-tab-screen").props.children).toEqual([
        "Details ",
        "virtual-tab"
      ]);
    });
  });
});
