import type { OpenPayloadBase, Route, Router, VirtualRoute } from "@virentia/router";
import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";

export type LayoutComponent = ComponentType<{ children: ReactNode }>;

export interface RouteView {
  route: Route<any> | Router | VirtualRoute<any, any>;
  view: ComponentType;
  children?: RouteView[];
}

export interface CreateRouteViewProps<T extends object | void = void> {
  route: Route<T> | Router | VirtualRoute<any, any>;
  view: ComponentType;
  layout?: LayoutComponent;
  children?: RouteView[];
}

export interface CreateLazyRouteViewProps<T extends object | void = void>
  extends Omit<CreateRouteViewProps<T>, "view"> {
  view: () => Promise<{ default: ComponentType }>;
  fallback?: ComponentType;
}

// A set of route views that share one layout. `routesView` renders it: while any
// member is active the shared layout stays mounted and only the inner view swaps.
export interface RouteViewGroup {
  route: VirtualRoute<any, any>;
  views: RouteView[];
  layout?: LayoutComponent;
}

export interface CreateRoutesViewProps {
  routes: (RouteView | RouteViewGroup)[];
  otherwise?: ComponentType;
  layout?: LayoutComponent;
}

export interface CreateRouteViewGroupProps {
  views: RouteView[];
  layout?: LayoutComponent;
}

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

type BaseLinkProps<Params extends object | void = void> = {
  to: Route<Params>;
  children?: ReactNode;
} & AnchorProps &
  OpenPayloadBase;

export type LinkProps<Params extends object | void = void> = Params extends
  | Record<string, never>
  | void
  | undefined
  ? BaseLinkProps<Params> & { params?: Params }
  : BaseLinkProps<Params> & { params: Params };
