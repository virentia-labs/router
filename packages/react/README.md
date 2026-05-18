# @virentia/router-react

React bindings for Virentia Router.

Keep routing state in `@virentia/router`; use this package at the rendering boundary. Route views are mapped to route objects, links open typed routes, and outlets render nested route trees.

## Links

- Documentation: [movpushmov.dev/virentia/router/react](https://movpushmov.dev/virentia/router/react)

## Install

```sh
pnpm add @virentia/router-react @virentia/router @virentia/react react
```

Install `history` in applications that use the bundled `historyAdapter` from `@virentia/router`.

```sh
pnpm add history
```

## RouterProvider

```tsx
import { scope } from "@virentia/core";
import { ScopeProvider } from "@virentia/react";
import { createMemoryHistory } from "history";
import { createRoute, createRouter, historyAdapter } from "@virentia/router";
import { createRouteView, createRoutesView, Link, RouterProvider } from "@virentia/router-react";

const homeRoute = createRoute({ path: "/" });
const profileRoute = createRoute({ path: "/profile/:id" });

const router = createRouter({
  routes: [homeRoute, profileRoute],
});

const history = historyAdapter(createMemoryHistory());
const appScope = scope();

function HomePage() {
  return (
    <Link to={profileRoute} params={{ id: "42" }}>
      Profile
    </Link>
  );
}

function ProfilePage() {
  return <h1>Profile</h1>;
}

const RoutesView = createRoutesView({
  routes: [
    createRouteView({ route: homeRoute, view: HomePage }),
    createRouteView({ route: profileRoute, view: ProfilePage }),
  ],
});

export function App() {
  return (
    <ScopeProvider scope={appScope}>
      <RouterProvider router={router} history={history}>
        <RoutesView />
      </RouterProvider>
    </ScopeProvider>
  );
}
```

## Lazy route views

`createLazyRouteView` connects React lazy rendering with router preloading. Opening the route waits for the same dynamic import that renders the page.

```tsx
import { createLazyRouteView } from "@virentia/router-react";
import { profileRoute } from "./routes";
import { Spinner } from "./spinner";

export const profileView = createLazyRouteView({
  route: profileRoute,
  view: () => import("./profile-page"),
  fallback: Spinner,
});
```

## Main API

`RouterProvider`, `createRouteView`, `createLazyRouteView`, `createRoutesView`, `Link`, `Outlet`, `withLayout`, `useRouter`, `useLink`, `useIsOpened`, `useOpenedViews`.

## License

MIT © 2026 movpushmov
