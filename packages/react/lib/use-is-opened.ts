import { useUnit } from "@virentia/react";
import type { Route, Router, VirtualRoute } from "@virentia/router";
import { is } from "@virentia/router";

export function useIsOpened(route: Route<any> | Router | VirtualRoute<any, any>): boolean {
  if (is.router(route)) {
    return useUnit(route.activeRoutes).length > 0;
  }

  return useUnit(route.isOpened);
}
