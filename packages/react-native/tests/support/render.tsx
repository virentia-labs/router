import { NavigationContainer } from "@react-navigation/native";
import { scoped } from "@virentia/core";
import type { EventCallable, Scope } from "@virentia/core";
import { ScopeProvider } from "@virentia/react";
import { createMemoryHistory } from "history";
import * as React from "react";
import { act, render } from "@testing-library/react-native";
import { historyAdapter } from "@virentia/router";
import type { Route, Router } from "@virentia/router";
import { RouterProvider } from "@virentia/router-react";

export function renderWithNavigation(appRouter: Router, appScope: Scope, children: React.ReactNode) {
  return render(
    <ScopeProvider scope={appScope}>
      <RouterProvider router={appRouter}>
        <NavigationContainer>{children}</NavigationContainer>
      </RouterProvider>
    </ScopeProvider>,
  );
}

export async function attachHistory(
  appRouter: Router,
  appScope: Scope,
  initialEntries: string[],
) {
  await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries }))));
}

export async function openRoute(
  route: Route<any>,
  appScope: Scope,
  payload: unknown = {},
) {
  await act(async () => {
    await scoped(appScope, () => (route.open as EventCallable<any>)(payload));
  });
}
