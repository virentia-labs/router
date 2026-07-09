import * as React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { route } from "@virentia/router";
import { screenComponent } from "../../lib/navigation-utils";

describe("screenComponent", () => {
  it("renders null when the route view has no component", () => {
    const homeRoute = route({ path: "/home" });

    const RouteScreen = screenComponent({
      route: homeRoute,
      view: undefined as never
    });

    const rendered = render(<RouteScreen />);

    expect(rendered.toJSON()).toBeNull();
  });

  it("renders the provided component when a view exists", () => {
    const homeRoute = route({ path: "/home" });

    const RouteScreen = screenComponent({
      route: homeRoute,
      view: () => <Text testID="guarded-screen">Guarded</Text>
    });

    render(<RouteScreen />);

    expect(screen.getByTestId("guarded-screen")).toBeTruthy();
  });
});
