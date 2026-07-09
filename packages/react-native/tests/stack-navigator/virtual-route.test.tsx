import { scope, scoped } from "@virentia/core";
import { useUnit } from "@virentia/react";
import * as React from "react";
import { Text } from "react-native";
import { act, screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route, router, virtualRoute } from "@virentia/router";
import type { RouteView } from "@virentia/router-react";
import { stackNavigator } from "../../lib";
import { attachHistory, renderWithNavigation } from "../support/render";

describe("stack navigator", () => {
  it("renders a pathless virtual route screen with transformed params", async () => {
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
});
