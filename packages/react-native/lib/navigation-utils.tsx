import { createElement, type ComponentType } from "react";
import type { Route, Router, VirtualRoute } from "@virentia/router";
import type { RouteView } from "@virentia/router-react";

type NavigationRoute = Route<any> | Router | VirtualRoute<any, any>;

export function getStackRouteName(route: NavigationRoute, index: number): string {
  const path = getStringPath(route);

  if (path) {
    return path;
  }

  return `Route${index}`;
}

export function getTabRouteName(route: NavigationRoute, index: number): string {
  const path = getStringPath(route);

  if (path) {
    return path.replace(/\//g, "") || `Tab${index}`;
  }

  return `Tab${index}`;
}

export function getRouteKey(route: NavigationRoute, index: number): string {
  const path = getStringPath(route);

  if (path) {
    return path;
  }

  return `route-${index}`;
}

export function getTabTitle(route: NavigationRoute, index: number): string {
  const path = getStringPath(route);

  if (path) {
    const parts = path.split("/").filter(Boolean);
    const staticTitle = [...parts].reverse().find((part) => !part.startsWith(":"));

    return staticTitle ?? `Tab ${index + 1}`;
  }

  return `Tab ${index + 1}`;
}

export function hasOpen(route: NavigationRoute): route is Route<any> | VirtualRoute<any, any> {
  return "open" in route && typeof route.open === "function";
}

export function screenComponent(routeView: RouteView): ComponentType {
  const View = routeView.view;

  return function RouteScreen() {
    return createElement(View);
  };
}

function getStringPath(route: NavigationRoute): string | null {
  if (!("path" in route) || typeof route.path !== "string") {
    return null;
  }

  return route.path;
}
