# @virentia/router

Core routing package for Virentia applications.

It describes routes as Virentia units, connects them to a history adapter, activates routes from URL changes, and navigates by opening route objects. The package is UI-agnostic and does not create a browser history instance by itself.

## Links

- Documentation: [movpushmov.dev/virentia/router](https://movpushmov.dev/virentia/router/)

## Install

```sh
pnpm add @virentia/router @virentia/core
```

Install `history` in applications that use the bundled `historyAdapter`.

```sh
pnpm add history
```

## Routes

```ts
import { createRoute } from "@virentia/router";

export const homeRoute = createRoute({ path: "/" });
export const profileRoute = createRoute({ path: "/profile/:id<number>" });
```

Route params are inferred from path templates. `profileRoute.open` accepts a typed payload with `params.id` as a number.

## Router

```ts
import { allSettled, scope } from "@virentia/core";
import { createMemoryHistory } from "history";
import { createRouter, historyAdapter } from "@virentia/router";
import { homeRoute, profileRoute } from "./routes";

const router = createRouter({
  routes: [homeRoute, profileRoute],
});

const appScope = scope();
const history = createMemoryHistory();

await allSettled(router.setHistory, {
  scope: appScope,
  payload: historyAdapter(history),
});

await allSettled(profileRoute.open, {
  scope: appScope,
  payload: { params: { id: 42 } },
});

history.location.pathname;
// "/profile/42"
```

## Before open

`beforeOpen` runs before a route is activated. It receives the activation payload, including params, query, replace flag, and activation cause.

```ts
import { createRoute } from "@virentia/router";

const profileRoute = createRoute({
  path: "/profile/:id<number>",
  beforeOpen: [
    async ({ params }) => {
      await loadProfile(params.id);
    },
  ],
});
```

## Main API

`createRoute`, `createRouter`, `createRouterControls`, `createVirtualRoute`, `chainRoute`, `group`, `trackQueryFactory`, `historyAdapter`, `queryAdapter`, `is`.

## License

MIT © 2026 movpushmov
