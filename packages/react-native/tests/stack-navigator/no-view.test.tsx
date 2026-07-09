import { scope, scoped } from "@virentia/core";
import * as React from "react";
import { Text } from "react-native";
import { screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route, router } from "@virentia/router";
import { stackNavigator } from "../../lib";
import { attachHistory, openRoute, renderWithNavigation } from "../support/render";

describe("stack navigator", () => {
  it("keeps the current screen when an opened route has no view", async () => {
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
