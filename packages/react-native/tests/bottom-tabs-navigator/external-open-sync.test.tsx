import { scope } from "@virentia/core";
import { useUnit } from "@virentia/react";
import * as React from "react";
import { Text } from "react-native";
import { screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route, router } from "@virentia/router";
import { bottomTabsNavigator } from "../../lib";
import { attachHistory, openRoute, renderWithNavigation } from "../support/render";

describe("bottom-tabs navigator", () => {
  it("follows external route opens with fresh params", async () => {
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
});
