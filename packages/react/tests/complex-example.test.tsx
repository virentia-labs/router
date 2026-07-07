import { allSettled, scope } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test } from "vitest";
import { waitFor } from "@testing-library/react";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView, Outlet } from "../lib";
import { openRoute, renderWithRouter } from "./utils";

describe("complex nested router and outlet example", () => {
  test("complete e-commerce app structure", async () => {
    const appScope = scope();
    const authRoutes = {
      login: route({ path: "/login" }),
      register: route({ path: "/register" })
    };
    const authRouter = router({
      routes: [authRoutes.login, authRoutes.register]
    });
    const shopRoutes = {
      products: route({ path: "/products" }),
      categories: route({ path: "/categories" })
    };
    const shopRouter = router({
      routes: [shopRoutes.products, shopRoutes.categories]
    });
    const accountRoot = route({ path: "/account" });
    const accountProfile = route({
      path: "/profile",
      parent: accountRoot
    });
    const accountOrders = route({
      path: "/orders",
      parent: accountRoot
    });
    const accountRoutes = {
      root: accountRoot,
      profile: accountProfile,
      orders: accountOrders
    };

    const mainRoutes = {
      home: route({ path: "/" })
    };
    const mainRouter = router({
      routes: [
        mainRoutes.home,
        authRouter,
        shopRouter,
        accountRoutes.root,
        accountRoutes.profile,
        accountRoutes.orders
      ]
    });

    await allSettled(mainRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))
    });

    const AuthRoutesView = routesView({
      routes: [
        {
          route: authRoutes.login,
          view: () => (
            <div>
              <h2 data-testid="auth-title">Login</h2>
            </div>
          )
        },
        {
          route: authRoutes.register,
          view: () => (
            <div>
              <h2 data-testid="auth-title">Register</h2>
            </div>
          )
        }
      ]
    });
    const ShopRoutesView = routesView({
      routes: [
        {
          route: shopRoutes.products,
          view: () => (
            <div>
              <h3 data-testid="shop-content">Products List</h3>
            </div>
          )
        },
        {
          route: shopRoutes.categories,
          view: () => (
            <div>
              <h3 data-testid="shop-content">Categories</h3>
            </div>
          )
        }
      ]
    });
    const AccountLayout = () => (
      <div>
        <div data-testid="account-header">
          <h2>My Account</h2>
        </div>
        <div data-testid="account-content">
          <Outlet />
        </div>
      </div>
    );
    const MainRoutesView = routesView({
      routes: [
        {
          route: mainRoutes.home,
          view: () => (
            <div>
              <h1 data-testid="page-title">Home</h1>
            </div>
          )
        },
        {
          route: authRouter,
          view: () => (
            <div>
              <h1 data-testid="page-title">Authentication</h1>
              <AuthRoutesView />
            </div>
          )
        },
        {
          route: shopRouter,
          view: () => (
            <div>
              <h1 data-testid="page-title">Shop</h1>
              <ShopRoutesView />
            </div>
          )
        },
        {
          route: accountRoutes.root,
          view: AccountLayout,
          children: [
            {
              route: accountRoutes.profile,
              view: () => (
                <div data-testid="account-page">
                  <h3>Profile Settings</h3>
                  <p>Edit your profile information here</p>
                </div>
              )
            },
            {
              route: accountRoutes.orders,
              view: () => (
                <div data-testid="account-page">
                  <h3>Order History</h3>
                  <p>View your past orders</p>
                </div>
              )
            }
          ]
        }
      ]
    });

    const { getByTestId } = renderWithRouter(mainRouter, appScope, <MainRoutesView />);

    await waitFor(() => expect(getByTestId("page-title").textContent).toBe("Home"));

    await openRoute(authRoutes.login, appScope);
    await waitFor(() => {
      expect(getByTestId("page-title").textContent).toBe("Authentication");
      expect(getByTestId("auth-title").textContent).toBe("Login");
    });

    await openRoute(authRoutes.register, appScope);
    await waitFor(() => expect(getByTestId("auth-title").textContent).toBe("Register"));

    await openRoute(shopRoutes.products, appScope);
    await waitFor(() => {
      expect(getByTestId("page-title").textContent).toBe("Shop");
      expect(getByTestId("shop-content").textContent).toBe("Products List");
    });

    await openRoute(shopRoutes.categories, appScope);
    await waitFor(() => expect(getByTestId("shop-content").textContent).toBe("Categories"));

    await openRoute(accountRoutes.profile, appScope);
    await waitFor(() => {
      expect(getByTestId("account-header").textContent).toContain("My Account");
      expect(getByTestId("account-page").textContent).toContain("Profile Settings");
    });

    await openRoute(accountRoutes.orders, appScope);
    await waitFor(() =>
      expect(getByTestId("account-page").textContent).toContain("Order History"),
    );

    await openRoute(accountRoutes.profile, appScope);
    await waitFor(() =>
      expect(getByTestId("account-page").textContent).toContain("Profile Settings"),
    );

    await openRoute(accountRoutes.root, appScope);
    await waitFor(() => {
      expect(getByTestId("account-header")).toBeTruthy();
      expect(getByTestId("account-content").children.length).toBe(0);
    });
  });
});
