import { reaction, type Scope } from "@virentia/core";
import { vi } from "vitest";

export function watchCalls<T>(unit: any, appScope: Scope) {
  const fn = vi.fn<(payload: T) => void>();

  void appScope;

  reaction({ on: unit, run: (payload: T) => fn(payload) });

  return fn;
}
