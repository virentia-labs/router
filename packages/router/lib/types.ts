import type {
  Effect,
  Event,
  EventCallable,
  Store,
  StoreWritable
} from "@virentia/core";
import type { ScopedRunner } from "@virentia/core";
import type { Builder, Parser } from "@virentia/router-paths";

export type AsyncBundleImport = () => Promise<{ default: unknown }>;
export type RoutePreloader = () => Promise<unknown> | unknown;

export type Query = Record<string, string | null | Array<string | null>>;

export interface OpenPayloadBase {
  query?: Query;
  replace?: boolean;
}

export type RouteOpenedPayload<T> = [T] extends [void]
  ? void | OpenPayloadBase
  : { params: T } & OpenPayloadBase;

export type RouteActivationCause =
  | { type: "route.open"; route: Route<any>; id: symbol }
  | { type: "history"; source: "initial" | "push" | "replace" | "pop" }
  | { type: "redirect"; from: Route<any>; id: symbol };

export type InternalOpenedPayload<T> = OpenPayloadBase & {
  params?: T;
  navigate?: boolean;
  skipBeforeOpen?: boolean;
  causedBy?: RouteActivationCause;
};

export type RouteBeforeOpen<T extends object | void = void> =
  | EventCallable<InternalOpenedPayload<T>>
  | Effect<InternalOpenedPayload<T>, any, any>
  | ((payload: InternalOpenedPayload<T>) => unknown | PromiseLike<unknown>);

export interface PathlessRoute<T extends object | void = void> {
  readonly "@@type": "pathless-route";

  readonly params: StoreWritable<T>;
  readonly isOpened: StoreWritable<boolean>;
  readonly isPending: Store<boolean>;

  readonly open: EventCallable<RouteOpenedPayload<T>>;
  readonly opened: Event<InternalOpenedPayload<T>>;
  readonly openedOnServer: Event<InternalOpenedPayload<T>>;
  readonly openedOnClient: Event<InternalOpenedPayload<T>>;

  readonly closed: Event<void>;

  readonly parent?: PathRoute<any> | PathlessRoute<any>;
  readonly beforeOpen?: RouteBeforeOpen<any>[];

  readonly units: {
    params: Store<T>;
    isOpened: Store<boolean>;
    isPending: Store<boolean>;
    onOpen: EventCallable<RouteOpenedPayload<T>>;
  };
}

export interface PathRoute<T extends object | void = void>
  extends Omit<PathlessRoute<T>, "@@type"> {
  readonly "@@type": "path-route";
  readonly path: string;
}

export type Route<T extends object | void = void> = PathRoute<T> | PathlessRoute<T>;

export interface InternalRouteParams<T extends object | void = any> {
  close: EventCallable<void>;
  openFx: Effect<InternalOpenedPayload<T>, InternalOpenedPayload<T>, Error>;
  activateFx: Effect<InternalOpenedPayload<T>, InternalOpenedPayload<T>, Error>;
  openRoute(
    payload: InternalOpenedPayload<T>,
    inRouteScope: ScopedRunner,
  ): Promise<InternalOpenedPayload<T>>;
  activateRoute(
    payload: InternalOpenedPayload<T>,
    inRouteScope: ScopedRunner,
  ): Promise<InternalOpenedPayload<T>>;
  setAsyncImport(value: AsyncBundleImport): void;
  addPreloader(preloader: RoutePreloader): () => void;
}

export type InternalRoute<T extends object | void = any> = Route<T> & {
  internal: InternalRouteParams<T>;
};

export interface VirtualRoute<T, Params> {
  readonly "@@type": "pathless-route";

  readonly params: StoreWritable<Params>;
  readonly isOpened: StoreWritable<boolean>;
  readonly isPending: Store<boolean>;

  readonly open: EventCallable<T>;
  readonly opened: Event<T>;
  readonly openedOnServer: Event<T>;
  readonly openedOnClient: Event<T>;

  readonly close: EventCallable<void>;
  readonly closed: Event<void>;
  readonly cancelled: EventCallable<void>;

  readonly path: "";

  readonly units: {
    params: Store<Params>;
    isOpened: Store<boolean>;
    isPending: Store<boolean>;
    onOpen: EventCallable<T>;
    onClose: EventCallable<void>;
  };
}

export interface NavigatePayload {
  query?: Query;
  path?: string;
  replace?: boolean;
  causedBy?: RouteActivationCause;
}

export interface LocationState {
  path: string;
  query: Query;
  causedBy: RouteActivationCause | undefined;
}

export interface RouterLocation {
  pathname: string;
  search: string;
  hash: string;
}

export type To = string | Partial<RouterLocation>;

export interface RouterSubscription {
  unsubscribe(): void;
}

export interface HistoryLike {
  readonly location: RouterLocation;
  push(to: To): void;
  replace(to: To): void;
  back(): void;
  forward(): void;
  listen(listener: (update: { location: RouterLocation }) => void): (() => void) | RouterSubscription;
}

export interface RouterAdapter {
  readonly location: RouterLocation;
  push(to: To): void;
  replace(to: To): void;
  goBack(): void;
  goForward(): void;
  listen(callback: (location: RouterLocation) => void): RouterSubscription;
}

export interface RouterControls {
  readonly history: Store<RouterAdapter | null>;
  readonly locationState: StoreWritable<LocationState>;
  readonly query: Store<Query>;
  readonly path: Store<string>;

  readonly setHistory: EventCallable<RouterAdapter>;
  readonly navigate: EventCallable<NavigatePayload>;
  readonly back: EventCallable<void>;
  readonly forward: EventCallable<void>;
  readonly dispose: EventCallable<void>;
  readonly locationUpdated: EventCallable<LocationState>;

  trackQuery<Parameters>(config: Omit<QueryTrackerConfig<Parameters>, "forRoutes">): QueryTracker<Parameters>;
}

export interface MappedRoute {
  route: InternalRoute<any>;
  path: string;
  build: Builder<any>;
  parse: Parser<any>;
}

export type InputRoute =
  | PathRoute<any>
  | { path: string; route: PathlessRoute<any> }
  | Router;

export interface Router {
  readonly "@@type": "router";

  readonly query: Store<Query>;
  readonly path: Store<string>;
  readonly history: Store<RouterAdapter | null>;
  readonly activeRoutes: Store<Route<any>[]>;

  readonly back: EventCallable<void>;
  readonly forward: EventCallable<void>;
  readonly navigate: EventCallable<NavigatePayload>;
  readonly setHistory: EventCallable<RouterAdapter>;
  readonly dispose: EventCallable<void>;

  readonly ownRoutes: MappedRoute[];
  readonly knownRoutes: MappedRoute[];

  registerRoute(route: InputRoute): void;
  trackQuery<Parameters>(config: QueryTrackerConfig<Parameters>): QueryTracker<Parameters>;

  readonly units: {
    query: Store<Query>;
    path: Store<string>;
    activeRoutes: Store<Route<any>[]>;
    onBack: EventCallable<void>;
    onForward: EventCallable<void>;
    onNavigate: EventCallable<NavigatePayload>;
    onDispose: EventCallable<void>;
  };

  readonly internal: {
    parent: Router | null;
    base: string;
  };
}

export interface CreateRouterConfig {
  base?: string;
  routes: InputRoute[];
  controls?: RouterControls;
}

export interface QuerySchema<T> {
  safeParse(value: Query): { success: true; data: T } | { success: false };
}

export interface QueryTrackerConfig<Parameters> {
  forRoutes?: Route<any>[];
  check?: EventCallable<void> | Event<void>;
  parameters: QuerySchema<Parameters>;
}

export interface QueryTracker<Parameters> {
  readonly entered: Event<Parameters>;
  readonly exited: Event<void>;
  readonly enter: EventCallable<Parameters>;
  readonly exit: EventCallable<{ ignoreParams: string[] } | void>;
}
