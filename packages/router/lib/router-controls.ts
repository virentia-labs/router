import { computed, event, reaction, scoped, store } from "@virentia/core";
import queryString from "query-string";
import { trackQueryFactory } from "./track-query";
import type {
  LocationOrigin,
  LocationState,
  NavigatePayload,
  Query,
  RouterAdapter,
  RouterControls,
  RouterLocation,
  Route
} from "./types";

interface SubscriptionState {
  unsubscribe: (() => void) | null;
}

interface HistoryState {
  current: RouterAdapter | null;
}

interface CommittedUrlState {
  /** The URL the router itself last wrote, used to recognize its own echo. */
  current: string | null;
}

export function routerControls(): RouterControls {
  const historyState = store<HistoryState>({ current: null });
  const history = computed(() => historyState.value.current);
  const locationState = store<LocationState>({
    path: "",
    query: {},
    origin: undefined
  });
  const subscriptionState = store<SubscriptionState>({ unsubscribe: null });
  const committedUrl = store<CommittedUrlState>({ current: null });
  const query = computed(() => locationState.value.query);
  const path = computed(() => locationState.value.path);

  const setHistory = event<RouterAdapter>();
  const navigate = event<NavigatePayload>();
  const back = event<void>();
  const forward = event<void>();
  const dispose = event<void>();
  const locationUpdated = event<LocationState>();

  reaction({
    on: setHistory,
    run(nextHistory) {
      const inRouterScope = scoped();

      subscriptionState.value.unsubscribe?.();
      historyState.value = { current: nextHistory };

      const emit = (location: RouterLocation, origin: LocationOrigin) =>
        inRouterScope(() => {
          void locationUpdated({
            path: location.pathname,
            query: parseQuery(location.search),
            origin
          });
        });

      emit(nextHistory.location, "external");

      const subscription = nextHistory.listen((location) => {
        inRouterScope(() => {
          // Structurally tell our own echo from a real history change: if this
          // is the URL we just wrote, it's programmatic (guards already ran).
          const url = formatUrl(location.pathname, location.search);
          const isEcho = committedUrl.value.current === url;

          committedUrl.value = { current: null };
          emit(location, isEcho ? "programmatic" : "external");
        });
      });

      subscriptionState.value = { unsubscribe: () => subscription.unsubscribe() };
    }
  });

  reaction({
    on: locationUpdated,
    run(nextLocation) {
      locationState.value = {
        path: nextLocation.path,
        query: nextLocation.query,
        origin: nextLocation.origin
      };
    }
  });

  reaction({
    on: navigate,
    run(payload) {
      const history = historyState.value.current;

      if (!history) {
        throw new Error("history not found");
      }

      const pathname = payload.path ?? path.value;
      const query = payload.query ?? readQuery(locationState.value.query);
      const search = stringifyQuery(query);
      const url = formatUrl(pathname, search);

      // Mark this URL as router-originated so its history echo is classified as
      // "programmatic" and activation skips beforeOpen (guards already ran).
      committedUrl.value = { current: url };

      const to = {
        pathname,
        search
      };

      if (payload.replace) {
        history.replace(to);
      } else {
        history.push(to);
      }

      // History refused the change (e.g. a navigation block): drop the marker so
      // a later genuine navigation to the same URL isn't mistaken for an echo.
      if (formatUrl(history.location.pathname, history.location.search) !== url) {
        committedUrl.value = { current: null };
      }
    }
  });

  reaction({
    on: back,
    run() {
      const history = historyState.value.current;

      if (!history) {
        throw new Error("history not found");
      }

      history.goBack();
    }
  });

  reaction({
    on: forward,
    run() {
      const history = historyState.value.current;

      if (!history) {
        throw new Error("history not found");
      }

      history.goForward();
    }
  });

  reaction({
    on: dispose,
    run() {
      subscriptionState.value.unsubscribe?.();
      subscriptionState.value = { unsubscribe: null };
      historyState.value = { current: null };
      committedUrl.value = { current: null };
    }
  });

  return {
    history,
    locationState,
    query,
    path,
    setHistory,
    navigate,
    back,
    forward,
    dispose,
    locationUpdated,
    trackQuery: trackQueryFactory({
      activeRoutes: store<Route<any>[]>([]),
      query,
      readQuery: () => readQuery(locationState.value.query),
      readOrigin: () => locationState.value.origin,
      navigate
    })
  };
}

function parseQuery(search: string): Query {
  return { ...queryString.parse(search) };
}

function stringifyQuery(query: Query): string {
  const search = queryString.stringify(query);
  return search ? `?${search}` : "";
}

function readQuery(query: Query): Query {
  return { ...query };
}

function formatUrl(pathname: string, search: string): string {
  return `${pathname}${search}`;
}
