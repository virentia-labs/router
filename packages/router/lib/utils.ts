import { run, type Scope, type StoreWritable } from "@virentia/core";
import type {
  InternalRoute,
  PathlessRoute,
  PathRoute,
  Route,
  RouteActivationCause,
  Router
} from "./types";

export const is = {
  route<T extends object | void = void>(input: unknown): input is Route<T> {
    return is.pathRoute(input) || is.pathlessRoute(input);
  },

  pathRoute<T extends object | void = void>(input: unknown): input is PathRoute<T> {
    return (
      typeof input === "object" &&
      input !== null &&
      "@@type" in input &&
      input["@@type"] === "path-route"
    );
  },

  pathlessRoute<T extends object | void = void>(input: unknown): input is PathlessRoute<T> {
    return (
      typeof input === "object" &&
      input !== null &&
      "@@type" in input &&
      input["@@type"] === "pathless-route"
    );
  },

  router(input: unknown): input is Router {
    return (
      typeof input === "object" &&
      input !== null &&
      "@@type" in input &&
      input["@@type"] === "router"
    );
  }
};

export function writeStore(target: StoreWritable<any>, value: unknown, scope?: Scope): void {
  void run(
    scope
      ? {
          unit: target.node,
          payload: value,
          scope
        }
      : {
          unit: target.node,
          payload: value
        },
  );
}

export function normalizePayload<T>(payload: T | void): T {
  return (payload ?? {}) as T;
}

export function createRouteOpenCause(route: Route<any>): RouteActivationCause {
  return {
    type: "route.open",
    route,
    id: Symbol("virentia.router.route.open")
  };
}

export function shouldSkipBeforeOpenForCause(
  route: InternalRoute<any>,
  causedBy: RouteActivationCause | undefined,
): boolean {
  if (causedBy?.type !== "route.open") {
    return false;
  }

  let cursor: Route<any> | undefined = causedBy.route;

  while (cursor) {
    if (cursor === route) {
      return true;
    }

    cursor = cursor.parent;
  }

  return false;
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}
