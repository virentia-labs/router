import { scope, scoped } from "@virentia/core";
import { useUnit } from "@virentia/react";
import * as React from "react";
import { Text } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route, router } from "@virentia/router";
import type { BottomTabsRouteView } from "../../lib";
import { bottomTabsNavigator } from "../../lib";
import { attachHistory, renderWithNavigation } from "../support/render";

describe("bottom-tabs navigator", () => {
  it("opens a route in the active scope on tab press", async () => {
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

  it("opens a tab route with its configured params and query", async () => {
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

  it("opens a tab route on press through its openPayload", async () => {
    const homeRoute = route({ path: "/home" });
    const profileRoute = route({ path: "/profile/:id" });
    const appRouter = router({ routes: [homeRoute, profileRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const routes: BottomTabsRouteView[] = [
      { route: homeRoute, view: () => <Text testID="home-tab-screen">Home</Text> },
      {
        route: profileRoute,
        openPayload: { params: { id: "13" }, query: { via: "press" } },
        view: () => {
          const params = useUnit(profileRoute.params);
          const query = useUnit(appRouter.query);

          return (
            <Text testID="profile-tab-screen">
              Profile {params.id} via {query.via}
            </Text>
          );
        }
      }
    ];

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes,
      initialRouteName: "home",
      screenOptions: { animation: "none" }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    fireEvent.press(screen.getByText("profile"));

    await waitFor(() => {
      expect(scoped(appScope, () => profileRoute.params.value.id)).toBe("13");
      expect(scoped(appScope, () => appRouter.query.value.via)).toBe("press");
      expect(screen.getByTestId("profile-tab-screen").props.children).toEqual([
        "Profile ",
        "13",
        " via ",
        "press"
      ]);
    });
  });
});
