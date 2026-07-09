import { scope } from "@virentia/core";
import { useUnit } from "@virentia/react";
import * as React from "react";
import { Text } from "react-native";
import { screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route, router } from "@virentia/router";
import type { RouteView } from "@virentia/router-react";
import { stackNavigator } from "../../lib";
import { attachHistory, openRoute, renderWithNavigation } from "../support/render";

describe("stack navigator", () => {
  it("carries route params into the profile screen on open", async () => {
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

  describe("successive opens", () => {
    async function buildApp() {
      const homeRoute = route({ path: "/home" });
      const settingsRoute = route({ path: "/settings" });
      const profileRoute = route({ path: "/profile/:id" });
      const appRouter = router({ routes: [homeRoute, settingsRoute, profileRoute] });
      const appScope = scope();

      await attachHistory(appRouter, appScope, ["/home"]);

      const routes: RouteView[] = [
        { route: homeRoute, view: () => <Text testID="home-screen">Home</Text> },
        { route: settingsRoute, view: () => <Text testID="settings-screen">Settings</Text> },
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

      return { appScope, settingsRoute, profileRoute };
    }

    it("mounts the initial home screen from history", async () => {
      await buildApp();

      expect(screen.getByTestId("home-screen")).toBeTruthy();
    });

    it("follows an open to the settings route", async () => {
      const { appScope, settingsRoute } = await buildApp();

      await openRoute(settingsRoute, appScope);

      await waitFor(() => {
        expect(screen.getByTestId("settings-screen")).toBeTruthy();
      });
    });

    it("carries params across a successive open to profile", async () => {
      const { appScope, settingsRoute, profileRoute } = await buildApp();

      await openRoute(settingsRoute, appScope);

      await waitFor(() => {
        expect(screen.getByTestId("settings-screen")).toBeTruthy();
      });

      await openRoute(profileRoute, appScope, { params: { id: "7" } });

      await waitFor(() => {
        expect(screen.getByTestId("profile-screen").props.children).toEqual([
          "Profile ",
          "7"
        ]);
      });
    });
  });
});
