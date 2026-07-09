import { scope, scoped } from "@virentia/core";
import * as React from "react";
import { Text } from "react-native";
import { screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route, router } from "@virentia/router";
import type { RouteView } from "@virentia/router-react";
import { stackNavigator } from "../../lib";
import { attachHistory, openRoute, renderWithNavigation } from "../support/render";

describe("stack navigator", () => {
  it("prefers a nested child view over its opened parent, then returns to the parent", async () => {
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
});
