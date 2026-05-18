import { createContext } from "react";
import type { RouteView } from "./types";
import type { Router } from "@virentia/router";

export const RouterContext = createContext<Router | null>(null);
export const OutletContext = createContext<{ children: RouteView[] } | null>(null);
