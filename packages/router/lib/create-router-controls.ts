import { computed, event, reaction, scoped, store } from "@virentia/core";
import queryString from "query-string";
import { trackQueryFactory } from "./track-query";
import type {
  LocationState,
  NavigatePayload,
  Query,
  RouterAdapter,
  RouterControls,
  RouterLocation,
  Route,
  RouteActivationCause
} from "./types";

interface SubscriptionState {
  unsubscribe: (() => void) | null;
}

interface HistoryState {
  current: RouterAdapter | null;
}

interface PendingCauseState {
  current: RouteActivationCause | null;
}

export function createRouterControls(): RouterControls {
  const historyState = store<HistoryState>({ current: null });
  const history = computed(() => historyState.current);
  const locationState = store<LocationState>({ path: "", query: {}, causedBy: undefined });
  const subscriptionState = store<SubscriptionState>({ unsubscribe: null });
  const pendingCause = store<PendingCauseState>({ current: null });
  const query = computed(() => locationState.query);
  const path = computed(() => locationState.path);

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

      subscriptionState.unsubscribe?.();
      historyState.current = nextHistory;

      const emit = (
        location: RouterLocation,
        causedBy: RouteActivationCause = { type: "history", source: "pop" },
      ) =>
        inRouterScope(() => {
          void locationUpdated({
            path: location.pathname,
            query: parseQuery(location.search),
            causedBy
          });
        });

      emit(nextHistory.location, { type: "history", source: "initial" });

      const subscription = nextHistory.listen((location) => {
        inRouterScope(() => {
          const causedBy =
            pendingCause.current ?? { type: "history" as const, source: "pop" as const };

          pendingCause.current = null;
          emit(location, causedBy);
        });
      });

      subscriptionState.unsubscribe = () => subscription.unsubscribe();
    }
  });

  reaction({
    on: locationUpdated,
    run(nextLocation) {
      locationState.path = nextLocation.path;
      locationState.query = nextLocation.query;
      locationState.causedBy = nextLocation.causedBy;
    }
  });

  reaction({
    on: navigate,
    run(payload) {
      const history = historyState.current;

      if (!history) {
        throw new Error("history not found");
      }

      const pathname = payload.path ?? path.value;
      const query = payload.query ?? readQuery(locationState.query);
      const search = stringifyQuery(query);
      const causedBy =
        payload.causedBy ??
        ({
          type: "history",
          source: payload.replace ? "replace" : "push"
        } satisfies RouteActivationCause);

      pendingCause.current = causedBy ?? null;

      const to = {
        pathname,
        search
      };

      if (payload.replace) {
        history.replace(to);
      } else {
        history.push(to);
      }

      if (pendingCause.current && history.location.pathname !== pathname) {
        pendingCause.current = null;
      }
    }
  });

  reaction({
    on: back,
    run() {
      const history = historyState.current;

      if (!history) {
        throw new Error("history not found");
      }

      history.goBack();
    }
  });

  reaction({
    on: forward,
    run() {
      const history = historyState.current;

      if (!history) {
        throw new Error("history not found");
      }

      history.goForward();
    }
  });

  reaction({
    on: dispose,
    run() {
      subscriptionState.unsubscribe?.();
      subscriptionState.unsubscribe = null;
      historyState.current = null;
      pendingCause.current = null;
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
      readQuery: () => readQuery(locationState.query),
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
