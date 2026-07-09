import { scope, scoped } from "@virentia/core";
import { useUnit } from "@virentia/react";
import * as React from "react";
import { Text } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route, router, virtualRoute } from "@virentia/router";
import type { BottomTabsRouteView } from "../../lib";
import { bottomTabsNavigator } from "../../lib";
import { attachHistory, renderWithNavigation } from "../support/render";

describe("bottom-tabs navigator", () => {
  it("mounts both tabs for '/a/b' and '/ab' without a name collision", async () => {
    const nestedRoute = route({ path: "/a/b" });
    const flatRoute = route({ path: "/ab" });
    const appRouter = router({ routes: [nestedRoute, flatRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/a/b"]);

    const routes: BottomTabsRouteView[] = [
      { route: nestedRoute, view: () => <Text testID="nested-tab-screen">Nested</Text> },
      { route: flatRoute, view: () => <Text testID="flat-tab-screen">Flat</Text> }
    ];

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes,
      initialRouteName: "a-b",
      screenOptions: { animation: "none" }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    // Both tabs render their derived titles; a name collision would make
    // React Navigation drop or error on one of the screens.
    expect(screen.getAllByText("b").length).toBeGreaterThan(0);
    const flatLabels = screen.getAllByText("ab");
    expect(flatLabels.length).toBeGreaterThan(0);
    expect(screen.getByTestId("nested-tab-screen")).toBeTruthy();

    fireEvent.press(flatLabels[0]!);

    await waitFor(() => {
      expect(scoped(appScope, () => flatRoute.isOpened.value)).toBe(true);
      expect(screen.getByTestId("flat-tab-screen")).toBeTruthy();
    });
  });

  it("keeps per-tab derived titles over a global screenOptions title", async () => {
    const homeRoute = route({ path: "/home" });
    const searchRoute = route({ path: "/search" });
    const appRouter = router({ routes: [homeRoute, searchRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const routes: BottomTabsRouteView[] = [
      { route: homeRoute, view: () => <Text testID="home-tab-screen">Home</Text> },
      { route: searchRoute, view: () => <Text testID="search-tab-screen">Search</Text> }
    ];

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes,
      initialRouteName: "home",
      // A global title must lose to the per-tab derived title (fix ordering:
      // `title` is applied after spreading screenOptions).
      screenOptions: { animation: "none", title: "GLOBAL" }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getAllByText("home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("search").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("GLOBAL")).toHaveLength(0);
  });

  it("renders derived titles when screenOptions carries no title", async () => {
    const homeRoute = route({ path: "/home" });
    const searchRoute = route({ path: "/search" });
    const appRouter = router({ routes: [homeRoute, searchRoute] });
    const appScope = scope();

    await attachHistory(appRouter, appScope, ["/home"]);

    const routes: BottomTabsRouteView[] = [
      { route: homeRoute, view: () => <Text testID="home-tab-screen">Home</Text> },
      { route: searchRoute, view: () => <Text testID="search-tab-screen">Search</Text> }
    ];

    const { Navigator } = bottomTabsNavigator({
      router: appRouter,
      routes,
      initialRouteName: "home",
      screenOptions: { animation: "none" }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getAllByText("home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("search").length).toBeGreaterThan(0);
  });

  it("uses Tab 1 / Tab 2 fallback labels for root and pathless tabs", async () => {
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
      screenOptions: { animation: "none" }
    });

    renderWithNavigation(appRouter, appScope, <Navigator />);

    expect(screen.getAllByText("Tab 1").length).toBeGreaterThan(0);
    const detailsTabLabels = screen.getAllByText("Tab 2");
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
