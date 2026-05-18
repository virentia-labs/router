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

export interface CreateRoutesViewProps {
  routes: RouteView[];
  otherwise?: ComponentType;
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
