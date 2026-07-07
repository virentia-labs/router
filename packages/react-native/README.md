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
import { stackNavigator } from "@virentia/router-react-native";
import { RouterProvider, routeView } from "@virentia/router-react";
import { router, homeRoute, profileRoute } from "./router";
import { HomeScreen, ProfileScreen } from "./screens";

const routes = [
  routeView({ route: homeRoute, view: HomeScreen }),
  routeView({ route: profileRoute, view: ProfileScreen }),
];

const { Navigator } = stackNavigator({
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
import { bottomTabsNavigator } from "@virentia/router-react-native";
import { routeView } from "@virentia/router-react";
import { router, homeRoute, settingsRoute } from "./router";
import { HomeScreen, SettingsScreen } from "./screens";

const { Navigator } = bottomTabsNavigator({
  router,
  routes: [
    routeView({ route: homeRoute, view: HomeScreen }),
    routeView({ route: settingsRoute, view: SettingsScreen }),
  ],
  initialRouteName: "home",
});
```

## Main API

`stackNavigator`, `bottomTabsNavigator`.

## License

MIT © 2026 movpushmov
