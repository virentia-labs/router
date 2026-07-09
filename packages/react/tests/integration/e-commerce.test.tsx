import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { waitFor, type RenderResult } from "@testing-library/react";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView, Outlet } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

async function setup() {
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

  await scoped(appScope, () => mainRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))));

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

  const rendered: RenderResult = renderWithRouter(mainRouter, appScope, <MainRoutesView />);

  return { appScope, authRoutes, shopRoutes, accountRoutes, getByTestId: rendered.getByTestId };
}

describe("e-commerce app structure", () => {
  it("renders the home page on initial load", async () => {
    const { getByTestId } = await setup();

    await waitFor(() => expect(getByTestId("page-title").textContent).toBe("Home"));
  });

  it("opens the authentication section with the login view", async () => {
    const { appScope, authRoutes, getByTestId } = await setup();

    await openRoute(authRoutes.login, appScope);
    await waitFor(() => {
      expect(getByTestId("page-title").textContent).toBe("Authentication");
      expect(getByTestId("auth-title").textContent).toBe("Login");
    });
  });

  it("swaps to the register view within the authentication section", async () => {
    const { appScope, authRoutes, getByTestId } = await setup();

    await openRoute(authRoutes.register, appScope);
    await waitFor(() => expect(getByTestId("auth-title").textContent).toBe("Register"));
  });

  it("opens the shop section with the products view", async () => {
    const { appScope, shopRoutes, getByTestId } = await setup();

    await openRoute(shopRoutes.products, appScope);
    await waitFor(() => {
      expect(getByTestId("page-title").textContent).toBe("Shop");
      expect(getByTestId("shop-content").textContent).toBe("Products List");
    });
  });

  it("swaps to the categories view within the shop section", async () => {
    const { appScope, shopRoutes, getByTestId } = await setup();

    await openRoute(shopRoutes.categories, appScope);
    await waitFor(() => expect(getByTestId("shop-content").textContent).toBe("Categories"));
  });

  it("renders the account layout with the profile page", async () => {
    const { appScope, accountRoutes, getByTestId } = await setup();

    await openRoute(accountRoutes.profile, appScope);
    await waitFor(() => {
      expect(getByTestId("account-header").textContent).toContain("My Account");
      expect(getByTestId("account-page").textContent).toContain("Profile Settings");
    });
  });

  it("switches the account layout to the orders page", async () => {
    const { appScope, accountRoutes, getByTestId } = await setup();

    await openRoute(accountRoutes.orders, appScope);
    await waitFor(() =>
      expect(getByTestId("account-page").textContent).toContain("Order History"),
    );
  });

  it("reopens the profile page after visiting orders", async () => {
    const { appScope, accountRoutes, getByTestId } = await setup();

    await openRoute(accountRoutes.orders, appScope);
    await waitFor(() =>
      expect(getByTestId("account-page").textContent).toContain("Order History"),
    );

    await openRoute(accountRoutes.profile, appScope);
    await waitFor(() =>
      expect(getByTestId("account-page").textContent).toContain("Profile Settings"),
    );
  });

  it("renders the account root with an empty outlet", async () => {
    const { appScope, accountRoutes, getByTestId } = await setup();

    await openRoute(accountRoutes.root, appScope);
    await waitFor(() => {
      expect(getByTestId("account-header")).toBeTruthy();
      expect(getByTestId("account-content").children.length).toBe(0);
    });
  });
});
