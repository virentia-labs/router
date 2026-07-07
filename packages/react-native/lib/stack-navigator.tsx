import * as React from "react";
import { useEffect } from "react";
import {
  createStackNavigator,
  type StackNavigationOptions
} from "@react-navigation/stack";
import type { Router } from "@virentia/router";
import { useOpenedViews, type RouteView } from "@virentia/router-react";
import {
  screenComponent,
  getRouteKey,
  getStackRouteName
} from "./navigation-utils";

export interface StackNavigatorConfig {
  router: Router;
  routes: RouteView[];
  screenOptions?: StackNavigationOptions;
  initialRouteName?: string;
}

export type { StackNavigationOptions as StackNavigatorOptions };

const Stack = createStackNavigator();

export function stackNavigator(
  config: StackNavigatorConfig,
): { Navigator: React.ComponentType } {
  const { initialRouteName, routes, screenOptions } = config;
  const screens = routes.map((routeView) => ({
    routeView,
    component: screenComponent(routeView)
  }));

  function StackNavigator() {
    const openedViews = useOpenedViews(routes);
    const navigationRef = React.useRef<any>(null);
    const navigatorProps = {
      ...(initialRouteName !== undefined ? { initialRouteName } : {}),
      ...(screenOptions !== undefined ? { screenOptions } : {})
    };
    const screenOptionsProps =
      screenOptions !== undefined ? { options: screenOptions } : {};

    useEffect(() => {
      if (!navigationRef.current) {
        return;
      }

      const matchingView = openedViews.at(-1);

      if (!matchingView) {
        return;
      }

      const matchingIndex = routes.findIndex((view) => view.route === matchingView.route);

      if (matchingIndex === -1) {
        return;
      }

      const routeName = getStackRouteName(matchingView.route, matchingIndex);

      navigationRef.current.navigate(routeName);
    }, [openedViews, routes]);

    return (
      <Stack.Navigator
        {...navigatorProps}
        screenListeners={({ navigation }) => {
          navigationRef.current = navigation;

          return {};
        }}
      >
        {screens.map(({ component, routeView }, index) => (
          <Stack.Screen
            key={getRouteKey(routeView.route, index)}
            name={getStackRouteName(routeView.route, index)}
            component={component}
            {...screenOptionsProps}
          />
        ))}
      </Stack.Navigator>
    );
  }

  return { Navigator: StackNavigator };
}
