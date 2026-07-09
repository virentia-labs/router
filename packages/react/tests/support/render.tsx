import { scoped, type EventCallable, type Scope } from "@virentia/core";
import { ScopeProvider } from "@virentia/react";
import { act, render, waitFor, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Route, Router, RouterAdapter } from "@virentia/router";
import { expect } from "vitest";
import { RouterProvider } from "../../lib";

export function renderWithRouter(
  router: Router,
  appScope: Scope,
  children: ReactNode,
  history?: RouterAdapter,
): RenderResult {
  const providerProps = history === undefined ? { router } : { router, history };

  return render(
    <ScopeProvider scope={appScope}>
      <RouterProvider {...providerProps}>{children}</RouterProvider>
    </ScopeProvider>,
  );
}

export async function openRoute(
  route: Route<any>,
  appScope: Scope,
  payload: any = {},
) {
  await act(async () => {
    await scoped(appScope, () => (route.open as EventCallable<any>)(payload as any));
  });
}

export async function callUnit<T>(
  unit: EventCallable<T>,
  appScope: Scope,
  payload: T,
) {
  await act(async () => {
    await scoped(appScope, () => (unit as EventCallable<any>)(payload as any));
  });
}

export async function waitForText(getText: () => string | null, expected: string) {
  await waitFor(() => expect(getText()).toBe(expected));
}
