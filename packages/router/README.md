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
import { route } from "@virentia/router";

export const homeRoute = route({ path: "/" });
export const profileRoute = route({ path: "/profile/:id<number>" });
```

Route params are inferred from path templates. `profileRoute.open` accepts a typed payload with `params.id` as a number.

## Router

```ts
import { allSettled, scope } from "@virentia/core";
import { createMemoryHistory } from "history";
import { router, historyAdapter } from "@virentia/router";
import { homeRoute, profileRoute } from "./routes";

const appRouter = router({
  routes: [homeRoute, profileRoute],
});

const appScope = scope();
const history = createMemoryHistory();

await allSettled(appRouter.setHistory, {
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

`beforeOpen` runs before a route is activated. It receives the activation payload, including params, query, and the replace flag. Guards run only for external (history-driven) activations; a programmatic `route.open`/`navigate` runs its guards once, up front, so the resulting URL echo skips them.

```ts
import { route } from "@virentia/router";

const profileRoute = route({
  path: "/profile/:id<number>",
  beforeOpen: [
    async ({ params }) => {
      await loadProfile(params.id);
    },
  ],
});
```

## Query tracking

`router.trackQuery` watches a slice of the query string and fires `entered`/`exited` when it enters or leaves a matching state. Each is also split by the origin of the change, so you can react to router-driven and location-driven updates separately:

- `enteredExternally` / `exitedExternally` — the URL changed from the outside (initial load, back/forward, a manually edited URL);
- `enteredProgrammatically` / `exitedProgrammatically` — the router itself changed the query (`tracker.enter`/`tracker.exit`, a `route.open`, or a `navigate`).

`entered`/`exited` still fire in both cases; the `*Externally`/`*Programmatically` events are the explicit split. Origin is classified structurally — the router recognizes the history echo of a URL it just wrote — not by threading a cause through payloads.

```ts
const tracker = appRouter.trackQuery({
  forRoutes: [profileRoute],
  parameters: mySchema,
});

tracker.enteredExternally.watch((params) => {
  // user landed here via a shared link or back/forward
});

tracker.enteredProgrammatically.watch((params) => {
  // the app itself opened this state
});

// drive the query from the router:
tracker.enter({ tab: "friends" });
tracker.exit();
```

## Main API

`route`, `router`, `routerControls`, `virtualRoute`, `chainRoute`, `group`, `trackQueryFactory`, `historyAdapter`, `queryAdapter`, `is`.

## License

MIT © 2026 movpushmov
