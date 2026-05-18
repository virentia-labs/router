import { computed, reaction, scoped } from "@virentia/core";
import { compile } from "@virentia/router-paths";
import { createRouterControls } from "./create-router-controls";
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
import { is, shouldSkipBeforeOpenForCause } from "./utils";

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

export function createRouter(config: CreateRouterConfig): Router {
  const { base = "/", routes } = config;
  const controls = config.controls ?? createRouterControls();
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
    readQuery: () => ({ ...controls.locationState.query }),
    navigate: controls.navigate
  });

  async function openRoutesByLocation(location: LocationState): Promise<void> {
    const inRouterScope = scoped();
    const matchedRoutes = new Set<InternalRoute<any>>();

    for (const mapped of ownRoutes) {
      const match = mapped.parse(location.path);

      if (!match) {
        continue;
      }

      addMatchedRoute(mapped.route, matchedRoutes);

      const payload = createActivationPayload(
        match.params,
        location.query,
        location.causedBy,
        shouldSkipBeforeOpenForCause(mapped.route, location.causedBy),
      );

      await mapped.route.internal.activateRoute(payload, inRouterScope);
    }

    for (const { route } of ownRoutes) {
      if (!matchedRoutes.has(route) && inRouterScope(() => route.isOpened.value)) {
        await inRouterScope(() => route.internal.close());
      }
    }
  }

  const router = {
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
        inputRoute.internal.parent = router;
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
    router.registerRoute(route);
  }

  reaction({
    on: controls.locationUpdated,
    run(location) {
      void openRoutesByLocation(location);
    }
  });

  return router;

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

        if (payload?.causedBy !== undefined) {
          navigatePayload.causedBy = payload.causedBy;
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
      const { build, parse } = compile<string, any>(getPathWithBase(inputRoute.path));

      return {
        route: inputRoute.route as InternalRoute<any>,
        path: inputRoute.path,
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

    parts.unshift(internalRoute.path);

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

function createActivationPayload(
  params: unknown,
  query: Query,
  causedBy: LocationState["causedBy"],
  skipBeforeOpen: boolean,
): InternalOpenedPayload<any> {
  const base: InternalOpenedPayload<any> = {
    query,
    skipBeforeOpen,
    navigate: false
  };

  if (causedBy !== undefined) {
    base.causedBy = causedBy;
  }

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
