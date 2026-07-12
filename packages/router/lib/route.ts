import {
  computed,
  effect,
  event,
  reaction,
  scoped,
  store,
  type ScopedRunner
} from "@virentia/core";
import type { ParseUrlParams, ValidatePath } from "@virentia/router-paths";
import type {
  AsyncBundleImport,
  InternalOpenedPayload,
  InternalRoute,
  OpenPayloadBase,
  PathlessRoute,
  PathRoute,
  Route,
  RouteBeforeOpen,
  RouteOpenedPayload,
  RoutePreloader
} from "./types";

type WithBaseRouteConfig<T = object> = T & {
  parent?: Route<any>;
  beforeOpen?: RouteBeforeOpen<any>[];
};

export type RouteConfig<Path> =
  ValidatePath<Path> extends ["invalid", infer Template]
    ? WithBaseRouteConfig<{ path: Template }>
    : WithBaseRouteConfig<{ path: Path }>;

export function route<
  T extends string,
  Params extends object | void = ParseUrlParams<T>,
>(config: RouteConfig<T>): PathRoute<Params>;
export function route<Params extends object | void = void>(
  config?: WithBaseRouteConfig,
): PathlessRoute<Params>;
export function route<Params extends object | void = void>(
  config: WithBaseRouteConfig | RouteConfig<any> = {},
): PathRoute<Params> | PathlessRoute<Params> {
  const preloaders = new Set<RoutePreloader>();
  const beforeOpen = config.beforeOpen ?? [];
  const defaultParams = {} as Params;

  const params = store<Params>(defaultParams);
  const isOpened = store<boolean>(false);
  // Identity of the current activation (params + query). Lets the projection be
  // idempotent: re-applying the same location does not re-run activation/opened.
  const activationKey = store<string | null>(null);
  const open = event<RouteOpenedPayload<Params>>();
  const closed = event<void>();
  const opened = event<InternalOpenedPayload<Params>>();
  const openedOnServer = event<InternalOpenedPayload<Params>>();
  const openedOnClient = event<InternalOpenedPayload<Params>>();
  const close = event<void>();

  const openFx = effect<InternalOpenedPayload<Params>, InternalOpenedPayload<Params>, Error>(
    async (payload) => {
      const inRouteScope = scoped();

      return openRoute(payload, inRouteScope);
    }
  );

  const activateFx = effect<InternalOpenedPayload<Params>, InternalOpenedPayload<Params>, Error>(
    async (payload) => {
      const inRouteScope = scoped();

      return activateRoute(payload, inRouteScope);
    }
  );

  const isPending = computed(() => openFx.pending.value || activateFx.pending.value);

  const self = {
    "@@type": "path" in config ? "path-route" : "pathless-route",

    params,
    isOpened,
    isPending,

    open,
    opened,
    openedOnClient,
    openedOnServer,
    closed,

    parent: config.parent,
    beforeOpen,
    ...("path" in config ? { path: config.path } : {}),

    units: {
      params,
      isOpened,
      isPending,
      onOpen: open
    },

    internal: {
      close,
      openFx,
      activateFx,
      openRoute,
      activateRoute,
      setAsyncImport(value: AsyncBundleImport) {
        preloaders.add(value);
      },
      addPreloader(preloader: RoutePreloader) {
        preloaders.add(preloader);

        return () => {
          preloaders.delete(preloader);
        };
      }
    }
  } as InternalRoute<Params>;

  reaction({
    on: open,
    run(payload) {
      const normalized = normalizeRoutePayload(payload);

      void openFx(normalized);
    }
  });

  reaction({
    on: close,
    run() {
      if (!isOpened.value) {
        return;
      }

      isOpened.value = false;
      activationKey.value = null;
      void closed();
    }
  });

  return self;

  async function openRoute(
    payload: InternalOpenedPayload<Params>,
    inRouteScope: ScopedRunner,
  ): Promise<InternalOpenedPayload<Params>> {
    await runPreloaders(inRouteScope);

    if (!payload.skipBeforeOpen) {
      await runBeforeOpen(payload, inRouteScope);
    }

    const parent = config.parent as InternalRoute<any> | undefined;

    if (parent) {
      await parent.internal.openRoute(
        {
          ...(payload as InternalOpenedPayload<any>),
          navigate: false
        },
        inRouteScope,
      );
    }

    return payload;
  }

  async function activateRoute(
    payload: InternalOpenedPayload<Params>,
    inRouteScope: ScopedRunner,
  ): Promise<InternalOpenedPayload<Params>> {
    const nextKey = activationKeyOf(payload, defaultParams);
    const alreadyActive = inRouteScope(
      () => isOpened.value && activationKey.value === nextKey,
    );

    if (alreadyActive) {
      return payload;
    }

    await runPreloaders(inRouteScope);

    if (!payload.skipBeforeOpen) {
      await runBeforeOpen(payload, inRouteScope);
    }

    const parent = config.parent as InternalRoute<any> | undefined;

    if (parent) {
      const parentPayload: InternalOpenedPayload<any> = {
        ...(payload as InternalOpenedPayload<any>),
        navigate: false
      };

      await parent.internal.activateRoute(parentPayload, inRouteScope);
    }

    inRouteScope(() => {
      params.value = readPayloadParams(payload, defaultParams);
      activationKey.value = nextKey;
      isOpened.value = true;

      if (typeof window === "undefined") {
        void openedOnServer(payload);
      } else {
        void openedOnClient(payload);
      }

      void opened(payload);
    });

    return payload;
  }

  async function runPreloaders(inRouteScope: ScopedRunner): Promise<void> {
    for (const preloader of preloaders) {
      await inRouteScope(() => preloader());
    }
  }

  async function runBeforeOpen(
    payload: InternalOpenedPayload<Params>,
    inRouteScope: ScopedRunner,
  ): Promise<void> {
    for (const trigger of beforeOpen) {
      await inRouteScope(() => trigger(payload as never));
    }
  }
}

function normalizeRoutePayload<T extends object | void>(
  payload: RouteOpenedPayload<T>,
): InternalOpenedPayload<T> {
  return (
    payload && typeof payload === "object" ? { ...(payload as OpenPayloadBase) } : {}
  ) as InternalOpenedPayload<T>;
}

function readPayloadParams<T extends object | void>(
  payload: InternalOpenedPayload<T>,
  fallback: T,
): T {
  if (payload && typeof payload === "object" && "params" in payload && payload.params != null) {
    return { ...(payload.params as object) } as T;
  }

  return fallback;
}

let nonSerializableCounter = 0;

function activationKeyOf<T extends object | void>(
  payload: InternalOpenedPayload<T>,
  fallback: T,
): string {
  const shape = {
    params: readPayloadParams(payload, fallback),
    query: payload.query ?? {}
  };

  try {
    // Order-independent so `{a,b}` and `{b,a}` yield the same key — otherwise
    // idempotency is defeated by mere key-insertion order.
    return stableStringify(shape);
  } catch {
    // Non-serializable params (BigInt, circular refs, …): fall back to a unique
    // key so activation is never skipped and never throws.
    return ` nonserializable:${nonSerializableCounter++}`;
  }
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (node: unknown): unknown => {
    if (node && typeof node === "object") {
      // Cycle detection: an object is "circular" only if it appears in its OWN
      // ancestry path. Remove it from `seen` after visiting its children, so a
      // shared (DAG) reference across sibling keys is NOT mistaken for a cycle.
      if (seen.has(node)) {
        throw new Error("circular");
      }

      seen.add(node);

      let result: unknown;

      if (Array.isArray(node)) {
        result = node.map(normalize);
      } else {
        const out: Record<string, unknown> = {};

        for (const key of Object.keys(node).sort()) {
          out[key] = normalize((node as Record<string, unknown>)[key]);
        }

        result = out;
      }

      seen.delete(node);

      return result;
    }

    return node;
  };

  return JSON.stringify(normalize(value));
}
