import { event, reaction, store, type Event, type EventCallable, type Store } from "@virentia/core";
import type {
  NavigatePayload,
  Query,
  QueryTracker,
  QueryTrackerConfig,
  Route
} from "./types";
import { writeStore } from "./utils";

function routeIsActive(forRoutes: Route<any>[] | undefined, activeRoutes: Route<any>[]) {
  if (!forRoutes) {
    return true;
  }

  return forRoutes.some((route) => activeRoutes.includes(route));
}

function readActiveRoutes(activeRoutes: Store<Route<any>[]>): Route<any>[] {
  return activeRoutes.value.filter((route): route is Route<any> => Boolean(route));
}

interface TrackQueryFactoryConfig {
  activeRoutes: Store<Route<any>[]>;
  query: Store<Query>;
  readQuery?: () => Query;
  navigate: EventCallable<NavigatePayload>;
}

export function trackQueryFactory({
  activeRoutes,
  query,
  readQuery = () => ({}),
  navigate
}: TrackQueryFactoryConfig) {
  return function trackQuery<Parameters>(
    config: QueryTrackerConfig<Parameters>,
  ): QueryTracker<Parameters> {
    const entryState = store<{ entered: boolean; key: string | null }>({
      entered: false,
      key: null
    });
    const entered = event<Parameters>();
    const exited = event<void>();
    const enter = event<Parameters>();
    const exit = event<{ ignoreParams: string[] } | void>();

    const evaluate = () => {
      const currentQuery = readQuery();
      const currentRoutes = readActiveRoutes(activeRoutes);
      const parsed = config.parameters.safeParse(currentQuery);
      const active = routeIsActive(config.forRoutes, currentRoutes) && parsed.success;

      if (active && parsed.success) {
        const nextKey = createEntryKey(parsed.data, config.forRoutes, currentRoutes);

        if (entryState.value.entered && entryState.value.key === nextKey) {
          return;
        }

        writeStore(entryState, { entered: true, key: nextKey });
        void entered(parsed.data);
        return;
      }

      if (entryState.value.entered) {
        writeStore(entryState, { entered: false, key: null });
        void exited();
      }
    };

    if (config.check) {
      reaction({
        on: config.check as Event<void>,
        run: evaluate
      });

      reaction(() => {
        readQuery();
        readActiveRoutes(activeRoutes);

        if (entryState.value.entered) {
          evaluate();
        }
      });
    } else {
      reaction(evaluate);
    }

    reaction({
      on: enter,
      run(payload) {
        void navigate({
          query: {
            ...readQuery(),
            ...(payload as Query)
          }
        });
      }
    });

    reaction({
      on: exit,
      run(payload) {
        if (payload?.ignoreParams) {
          const currentQuery = readQuery();
          const nextQuery: Query = {};

          for (const key of payload.ignoreParams) {
            if (key in currentQuery) {
              nextQuery[key] = currentQuery[key]!;
            }
          }

          void navigate({ query: nextQuery });
          return;
        }

        void navigate({ query: {} });
      }
    });

    return {
      entered,
      exited,
      enter,
      exit
    };
  };
}

function createEntryKey(
  data: unknown,
  forRoutes: Route<any>[] | undefined,
  activeRoutes: Route<any>[],
): string {
  const routeKey = forRoutes
    ? activeRoutes.map((route) => forRoutes.indexOf(route)).join(",")
    : activeRoutes.map((route) => ("path" in route ? route.path : "")).join(",");

  return `${routeKey}:${JSON.stringify(data)}`;
}
