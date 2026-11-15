import { createContext } from "react";
import type { RouteView } from "./types";
import type { Router } from "@virentia/router";

export const RouterContext = /* @__PURE__ */ createContext<Router | null>(null);
export const OutletContext = /* @__PURE__ */ createContext<{ children: RouteView[] } | null>(null);
