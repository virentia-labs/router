import {
  computed,
  reaction,
  scoped,
  store,
  type Effect,
  type EventCallable,
  type UnitList
} from "@virentia/core";
import { createVirtualRoute } from "./create-virtual-route";
import type {
  AsyncBundleImport,
  Route,
  RouteOpenedPayload,
  VirtualRoute
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
  const isPendingState = store<boolean>(false);
  const isPending = computed(() => isPendingState.value);

  async function runBeforeOpen(payload: RouteOpenedPayload<T>): Promise<void> {
    const inRouteScope = scoped();

    isPendingState.value = true;

    try {
      if (asyncImport) {
        await inRouteScope(() => asyncImport?.());
      }

      for (const unit of beforeOpenUnits) {
        await inRouteScope(() => unit(payload as never));
      }
    } finally {
      inRouteScope(() => {
        isPendingState.value = false;
      });
    }
  }

  const virtualRoute = createVirtualRoute<RouteOpenedPayload<T>, T>({
    isPending,
    transformer
  });

  reaction({
    on: route.opened,
    run(payload: any) {
      lastPayload.value = payload as RouteOpenedPayload<T>;
      virtualRoute.params.value = transformer(payload as RouteOpenedPayload<T>);
      void runBeforeOpen(payload as RouteOpenedPayload<T>);
    }
  });

  if (openOn) {
    reaction({
      on: openOn,
      run() {
        void virtualRoute.open(lastPayload.value ?? ({} as RouteOpenedPayload<T>));
      }
    });
  }

  if (cancelOn) {
    reaction({
      on: [route.closed, ...toArray(cancelOn)] as UnitList<any>,
      run() {
        void virtualRoute.close();
      }
    });

    reaction({
      on: cancelOn,
      run() {
        void virtualRoute.cancelled();
      }
    });
  }

  return Object.assign(virtualRoute, {
    internal: {
      setAsyncImport(value: AsyncBundleImport) {
        asyncImport = value;
      }
    }
  });
}

function transformer<T extends object | void>(payload: RouteOpenedPayload<T>): T {
  if (payload && typeof payload === "object" && "params" in payload) {
    return payload.params as T;
  }

  return {} as T;
}

function toArray(value: UnitList<any>): any[] {
  return Array.isArray(value) ? [...value] : [value];
}
