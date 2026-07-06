import { event, reaction, store, type Event, type EventCallable, type Store } from "@virentia/core";
import type {
  LocationOrigin,
  NavigatePayload,
  Query,
  QueryTracker,
  QueryTrackerConfig,
  Route
} from "./types";

function routeIsActive(forRoutes: Route<any>[] | undefined, activeRoutes: Route<any>[]) {
  if (!forRoutes) {
    return true;
  }

  return forRoutes.some((route) => activeRoutes.includes(route));
}

function readActiveRoutesFromStore(activeRoutes: Store<Route<any>[]>): Route<any>[] {
  return activeRoutes.value.filter((route): route is Route<any> => Boolean(route));
}

interface TrackQueryFactoryConfig {
  activeRoutes: Store<Route<any>[]>;
  query: Store<Query>;
  readQuery?: () => Query;
  readOrigin?: () => LocationOrigin | undefined;
  /**
   * Reads the active routes for the current location. Injected so the tracker
   * can read them from the same location snapshot as `readQuery` — deriving
   * "active" from a separate computed chain lets query and active-set disagree
   * for a propagation frame, which fires a spurious enter/exit.
   */
  readActiveRoutes?: () => Route<any>[];
  navigate: EventCallable<NavigatePayload>;
}

export function trackQueryFactory({
  activeRoutes,
  query,
  readQuery = () => ({}),
  readOrigin = () => undefined,
  readActiveRoutes = () => readActiveRoutesFromStore(activeRoutes),
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
    const enteredExternally = event<Parameters>();
    const enteredProgrammatically = event<Parameters>();
    const exitedExternally = event<void>();
    const exitedProgrammatically = event<void>();
    const enter = event<Parameters>();
    const exit = event<{ ignoreParams: string[] } | void>();

    const evaluate = () => {
      const currentQuery = readQuery();
      const currentRoutes = readActiveRoutes();
      const parsed = config.parameters.safeParse(currentQuery);
      const active = routeIsActive(config.forRoutes, currentRoutes) && parsed.success;

      if (active && parsed.success) {
        const nextKey = createEntryKey(parsed.data, config.forRoutes, currentRoutes);

        if (entryState.value.entered && entryState.value.key === nextKey) {
          return;
        }

        entryState.value = { entered: true, key: nextKey };
        void entered(parsed.data);

        if (readOrigin() === "programmatic") {
          void enteredProgrammatically(parsed.data);
        } else {
          void enteredExternally(parsed.data);
        }
        return;
      }

      if (entryState.value.entered) {
        entryState.value = { entered: false, key: null };
        void exited();

        if (readOrigin() === "programmatic") {
          void exitedProgrammatically();
        } else {
          void exitedExternally();
        }
      }
    };

    if (config.check) {
      reaction({
        on: config.check as Event<void>,
        run: evaluate
      });

      reaction(() => {
        readQuery();
        readActiveRoutes();

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
      enteredExternally,
      enteredProgrammatically,
      exitedExternally,
      exitedProgrammatically,
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
