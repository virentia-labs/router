import * as React from "react";
import { useEffect } from "react";
import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions
} from "@react-navigation/bottom-tabs";
import { useUnit } from "@virentia/react";
import type { Route, Router, VirtualRoute } from "@virentia/router";
import { useOpenedViews, type RouteView } from "@virentia/router-react";
import {
  screenComponent,
  getRouteKey,
  getTabRouteName,
  getTabTitle,
  hasOpen
} from "./navigation-utils";

type OpenableRouteView = RouteView & {
  route: Route<any> | VirtualRoute<any, any>;
};

export interface BottomTabsRouteView extends RouteView {
  openPayload?: unknown | (() => unknown);
}

export interface BottomTabsNavigatorConfig {
  router: Router;
  routes: BottomTabsRouteView[];
  screenOptions?: BottomTabNavigationOptions;
  initialRouteName?: string;
}

export type { BottomTabNavigationOptions as BottomTabsNavigatorOptions };

const Tab = createBottomTabNavigator();

export function bottomTabsNavigator(
  config: BottomTabsNavigatorConfig,
): { Navigator: React.ComponentType } {
  const { initialRouteName, routes, screenOptions } = config;
  const screens = routes.map((routeView) => ({
    routeView,
    component: screenComponent(routeView)
  }));

  function BottomTabsNavigator() {
    const openedViews = useOpenedViews(routes);
    const openableViews = routes.filter(isOpenableRouteView);
    const openRoutes = useUnit(openableViews.map((routeView) => routeView.route.open));
    const navigationRef = React.useRef<any>(null);
    const navigatorProps = {
      ...(initialRouteName !== undefined ? { initialRouteName } : {}),
      ...(screenOptions !== undefined ? { screenOptions } : {})
    };

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

      const routeName = getTabRouteName(matchingView.route, matchingIndex);

      navigationRef.current.navigate(routeName);
    }, [openedViews, routes]);

    function openRoute(routeView: BottomTabsRouteView): void {
      const openIndex = openableViews.findIndex((view) => view.route === routeView.route);
      const open = openRoutes[openIndex] as ((payload?: unknown) => Promise<void>) | undefined;

      if (typeof open === "function") {
        const payload = readOpenPayload(routeView);

        if (payload === undefined) {
          void open();
        } else {
          void open(payload);
        }
      }
    }

    return (
      <Tab.Navigator
        {...navigatorProps}
        screenListeners={({ navigation }) => {
          navigationRef.current = navigation;

          return {};
        }}
      >
        {screens.map(({ component, routeView }, index) => (
          <Tab.Screen
            key={getRouteKey(routeView.route, index)}
            name={getTabRouteName(routeView.route, index)}
            component={component}
            options={{
              ...screenOptions,
              title: getTabTitle(routeView.route, index)
            }}
            listeners={{
              tabPress(event) {
                if (!hasOpen(routeView.route)) {
                  return;
                }

                event.preventDefault();
                openRoute(routeView);
              }
            }}
          />
        ))}
      </Tab.Navigator>
    );
  }

  return { Navigator: BottomTabsNavigator };
}

function isOpenableRouteView(routeView: RouteView): routeView is OpenableRouteView {
  return hasOpen(routeView.route);
}

function readOpenPayload(routeView: BottomTabsRouteView): unknown {
  if (typeof routeView.openPayload === "function") {
    return routeView.openPayload();
  }

  return routeView.openPayload;
}
