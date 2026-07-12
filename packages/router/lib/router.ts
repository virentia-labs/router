import { computed, reaction, scoped } from "@virentia/core";
import { compile } from "@virentia/router-paths";
import { routerControls } from "./router-controls";
import { trackQueryFactory } from "./track-query";
import type {
  CreateRouterConfig,
  InputRoute,
  InternalOpenedPayload,
  InternalRoute,
  LocationState,
  MappedRoute,
  NavigatePayload,
  PathlessRoute,
  PathRoute,
  Query,
  Route,
  Router
} from "./types";
import { is } from "./utils";

const inputIs = {
  pathlessRoute(input: InputRoute): input is { path: string; route: PathlessRoute<any> } {
    return !is.router(input) && typeof input === "object" && input !== null && "route" in input;
  },

  pathRoute(input: InputRoute): input is PathRoute<any> {
    return is.pathRoute(input);
  },

  router(input: InputRoute): input is Router {
    return is.router(input);
  }
};

export function router(config: CreateRouterConfig): Router {
  const { base = "/", routes } = config;
  const controls = config.controls ?? routerControls();
  const ownRoutes: MappedRoute[] = [];
  const knownRoutes: MappedRoute[] = [];
  let parent: Router | null = null;

  const activeRoutes = computed(() => {
    const currentPath = controls.path.value;

    if (!currentPath) {
      return [] as Route<any>[];
    }

    return ownRoutes
      .filter(({ parse }) => parse(currentPath))
      .map(({ route }) => route as Route<any>);
  });

  const trackQuery = trackQueryFactory({
    activeRoutes,
    query: controls.query,
    readQuery: () => ({ ...controls.locationState.value.query }),
    readOrigin: () => controls.locationState.value.origin,
    // Derive the active set from the same location snapshot as readQuery, so the
    // tracker never observes a fresh query against a stale active set.
    readActiveRoutes: () => deriveDesired(controls.locationState.value.path).map(({ route }) => route),
    navigate: controls.navigate
  });

  // Projection, part 1 — derive the desired open set from the URL. Pure read
  // over the route table: which routes the path wants open, with their params.
  function deriveDesired(path: string): Array<{ route: InternalRoute<any>; params: unknown }> {
    const desired: Array<{ route: InternalRoute<any>; params: unknown }> = [];

    for (const mapped of ownRoutes) {
      const match = mapped.parse(path);

      if (match) {
        desired.push({ route: mapped.route, params: match.params });
      }
    }

    return desired;
  }

  // Projection, part 2 — reconcile the open route tree to the location.
  // Idempotent: routes already open with the same params/query are left
  // untouched by activateRoute. `beforeOpen` runs only for "external" origins;
  // a "programmatic" origin means the change echoes a router-initiated
  // navigation whose guards already ran on `route.open`, so activation skips them.
  async function reconcile(location: LocationState): Promise<void> {
    const inRouterScope = scoped();
    const desired = deriveDesired(location.path);
    const skipBeforeOpen = location.origin === "programmatic";
    const matchedRoutes = new Set<InternalRoute<any>>();

    for (const { route, params } of desired) {
      addMatchedRoute(route, matchedRoutes);

      const payload = activationPayload(params, location.query, skipBeforeOpen);

      await route.internal.activateRoute(payload, inRouterScope);
    }

    for (const { route } of ownRoutes) {
      if (!matchedRoutes.has(route) && inRouterScope(() => route.isOpened.value)) {
        await inRouterScope(() => route.internal.close());
      }
    }
  }

  const self = {
    "@@type": "router",

    query: controls.query,
    path: controls.path,
    history: controls.history,
    activeRoutes,

    back: controls.back,
    forward: controls.forward,
    navigate: controls.navigate,
    setHistory: controls.setHistory,
    dispose: controls.dispose,

    ownRoutes,
    knownRoutes,

    registerRoute(inputRoute: InputRoute) {
      const mappedRoute = mapRoute(inputRoute);

      if (mappedRoute) {
        ownRoutes.push(mappedRoute);
        knownRoutes.push(mappedRoute);
        registerRouteApi(mappedRoute);
      }

      if (inputIs.router(inputRoute)) {
        inputRoute.internal.parent = self;
        knownRoutes.push(...inputRoute.knownRoutes);
      }
    },

    trackQuery,

    units: {
      query: controls.query,
      path: controls.path,
      activeRoutes,
      onBack: controls.back,
      onForward: controls.forward,
      onNavigate: controls.navigate,
      onDispose: controls.dispose
    },

    internal: {
      get parent() {
        return parent;
      },

      set parent(nextParent: Router | null) {
        parent = nextParent;
      },

      base
    }
  } satisfies Router;

  for (const route of routes) {
    self.registerRoute(route);
  }

  reaction({
    on: controls.locationUpdated,
    run(location) {
      void reconcile(location);
    }
  });

  return self;

  function registerRouteApi({ route, build }: MappedRoute) {
    reaction({
      on: route.internal.openFx.doneData,
      run(payload) {
        if (payload?.navigate === false) {
          return;
        }

        const navigatePayload: NavigatePayload = {
          path: build(readPayloadParams(payload)),
          query: payload?.query ?? {}
        };

        if (payload?.replace !== undefined) {
          navigatePayload.replace = payload.replace;
        }

        void controls.navigate(navigatePayload);
      }
    });
  }

  function addMatchedRoute(
    route: InternalRoute<any>,
    matchedRoutes: Set<InternalRoute<any>>,
  ): void {
    let cursor: Route<any> | undefined = route;

    while (cursor && is.route(cursor)) {
      matchedRoutes.add(cursor as InternalRoute<any>);
      cursor = cursor.parent;
    }
  }

  function mapRoute(inputRoute: InputRoute): MappedRoute | null {
    if (inputIs.pathlessRoute(inputRoute)) {
      const path = getPathWithBase(inputRoute.path);
      const { build, parse } = compile<string, any>(path);

      return {
        route: inputRoute.route as InternalRoute<any>,
        // Store the base-joined path, consistent with the PathRoute branch, so
        // knownRoutes/ownRoutes report the same URL the parser/builder use.
        path,
        build,
        parse
      };
    }

    if (inputIs.router(inputRoute)) {
      reaction({
        on: controls.setHistory,
        run(history) {
          void inputRoute.setHistory(history);
        }
      });

      return null;
    }

    let internalRoute = inputRoute as PathRoute<any> & InternalRoute<any>;
    const parts: string[] = [];

    // A leaf whose own path is "/" must not append a trailing slash to the
    // joined URL (ancestors already skip "/" for the same reason).
    if (internalRoute.path !== "/") {
      parts.unshift(internalRoute.path);
    }

    while (internalRoute.parent) {
      if (is.pathlessRoute(internalRoute.parent)) {
        break;
      }

      internalRoute = internalRoute.parent as PathRoute<any> & InternalRoute<any>;

      if (internalRoute.path !== "/") {
        parts.unshift(internalRoute.path);
      }
    }

    const path = getPathWithBase(parts.join(""));
    const { build, parse } = compile<string, any>(path);

    return {
      route: inputRoute as InternalRoute<any>,
      path,
      build,
      parse
    };
  }

  function getPathWithBase(path: string): string {
    const normalizedPath = path || "/";

    if (base === "/") {
      return normalizedPath;
    }

    return normalizedPath === "/" ? base : `${base}${normalizedPath}`;
  }
}

function activationPayload(
  params: unknown,
  query: Query,
  skipBeforeOpen: boolean,
): InternalOpenedPayload<any> {
  const base: InternalOpenedPayload<any> = {
    query,
    skipBeforeOpen,
    navigate: false
  };

  if (params && typeof params === "object") {
    base.params = { ...params };
  }

  return base;
}

function readPayloadParams(payload: InternalOpenedPayload<any>): any {
  if (payload && typeof payload === "object" && "params" in payload) {
    return payload.params;
  }

  return undefined;
}
