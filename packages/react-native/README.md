# @virentia/router-react-native

React Native bindings for Virentia Router with React Navigation integration.

## Install

```sh
pnpm add @virentia/router-react-native @virentia/router @virentia/router-react @virentia/react react react-native
pnpm add @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
pnpm add react-native-gesture-handler react-native-safe-area-context react-native-screens
```

## Stack Navigator

```tsx
import { NavigationContainer } from "@react-navigation/native";
import { createVirentiaStackNavigator } from "@virentia/router-react-native";
import { RouterProvider, createRouteView } from "@virentia/router-react";
import { router, homeRoute, profileRoute } from "./router";
import { HomeScreen, ProfileScreen } from "./screens";

const routes = [
  createRouteView({ route: homeRoute, view: HomeScreen }),
  createRouteView({ route: profileRoute, view: ProfileScreen }),
];

const { Navigator } = createVirentiaStackNavigator({
  router,
  routes,
  initialRouteName: "/",
  screenOptions: {
    headerShown: false,
  },
});

export function App() {
  return (
    <RouterProvider router={router}>
      <NavigationContainer>
        <Navigator />
      </NavigationContainer>
    </RouterProvider>
  );
}
```

## Bottom Tabs Navigator

```tsx
import { createVirentiaBottomTabsNavigator } from "@virentia/router-react-native";
import { createRouteView } from "@virentia/router-react";
import { router, homeRoute, settingsRoute } from "./router";
import { HomeScreen, SettingsScreen } from "./screens";

const { Navigator } = createVirentiaBottomTabsNavigator({
  router,
  routes: [
    createRouteView({ route: homeRoute, view: HomeScreen }),
    createRouteView({ route: settingsRoute, view: SettingsScreen }),
  ],
  initialRouteName: "home",
});
```

## Main API

`createVirentiaStackNavigator`, `createVirentiaBottomTabsNavigator`.

## License

MIT © 2026 movpushmov
