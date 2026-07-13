import {
  computed,
  effect,
  reaction,
  scoped,
  store,
  type Effect,
  type EventCallable,
  type UnitList,
} from "@virentia/core";
import { virtualRoute } from "./virtual-route";
import type {
  AsyncBundleImport,
  Route,
  RouteOpenedPayload,
  VirtualRoute,
} from "./types";

type BeforeOpenUnit<T extends object | void = void> =
  | EventCallable<RouteOpenedPayload<T>>
  | Effect<RouteOpenedPayload<T>, any, any>
  | ((payload: RouteOpenedPayload<T>) => unknown | PromiseLike<unknown>);

interface ChainRouteProps<T extends object | void = void> {
  route: Route<T> | VirtualRoute<RouteOpenedPayload<T>, T>;
  beforeOpen: BeforeOpenUnit<T> | BeforeOpenUnit<T>[];
  openOn?: UnitList<any>;
  cancelOn?: UnitList<any>;
}

export function chainRoute<T extends object | void = void>(
  props: ChainRouteProps<T>,
): VirtualRoute<RouteOpenedPayload<T>, T> {
  const { route, beforeOpen, openOn, cancelOn } = props;
  const beforeOpenUnits = ([] as BeforeOpenUnit<T>[]).concat(beforeOpen);
  let asyncImport: AsyncBundleImport | null = null;

  const lastPayload = store<RouteOpenedPayload<T> | null>(null);

  const runBeforeOpenFx = effect(async (payload: RouteOpenedPayload<T>) => {
    if (asyncImport) {
      await scoped(() => asyncImport?.());
    }

    for (const unit of beforeOpenUnits) {
      await scoped(() => unit(payload as never));
    }
  });

  const self = virtualRoute<RouteOpenedPayload<T>, T>({
    isPending: runBeforeOpenFx.pending,
    transformer,
  });

  reaction({
    on: route.opened,
    async run(payload: any) {
      // Remember the payload for the deferred open, but do NOT write self.params
      // yet: the guard may still reject, and a rejected chain must not leak the
      // source route's params into a route that never opens. params are set when
      // self.open actually fires (via the virtualRoute transformer).
      lastPayload.value = payload as RouteOpenedPayload<T>;
      await runBeforeOpenFx(payload as RouteOpenedPayload<T>);
    },
  });

  if (openOn) {
    reaction({
      on: openOn,
      run() {
        void self.open(lastPayload.value ?? ({} as RouteOpenedPayload<T>));
      },
    });
  }

  // Closing the source route always closes the chained route, whether or not a
  // cancelOn is configured — a chained route cannot outlive its source.
  reaction({
    on: route.closed,
    run() {
      void self.close();
    },
  });

  if (cancelOn) {
    reaction({
      on: cancelOn,
      run() {
        void self.close();
        void self.cancelled();
      },
    });
  }

  return Object.assign(self, {
    internal: {
      setAsyncImport(value: AsyncBundleImport) {
        asyncImport = value;
      },
    },
  });
}

function transformer<T extends object | void>(
  payload: RouteOpenedPayload<T>,
): T {
  if (payload && typeof payload === "object" && "params" in payload) {
    return payload.params as T;
  }

  return {} as T;
}
