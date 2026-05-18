import { allSettled, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, test } from "vitest";
import { waitFor } from "@testing-library/react";
import { createRoute, createRouter, historyAdapter } from "@virentia/router";
import { createRoutesView } from "../lib";
import { openRoute, renderWithRouter } from "./utils";

describe("nested routers", () => {
  test("basic nested router functionality", async () => {
    const appScope = scope();
    const shopRoutes = {
      products: createRoute({ path: "/products" }),
      cart: createRoute({ path: "/cart" })
    };
    const shopRouter = createRouter({
      routes: [shopRoutes.products, shopRoutes.cart]
    });
    const mainRoutes = {
      home: createRoute({ path: "/" }),
      settings: createRoute({ path: "/settings" })
    };
    const mainRouter = createRouter({
      routes: [mainRoutes.home, mainRoutes.settings, shopRouter]
    });

    await allSettled(mainRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))
    });

    const ShopRoutesView = createRoutesView({
      routes: [
        {
          route: shopRoutes.products,
          view: () => <p data-testid="message">products</p>
        },
        {
          route: shopRoutes.cart,
          view: () => <p data-testid="message">cart</p>
        }
      ]
    });
    const MainRoutesView = createRoutesView({
      routes: [
        {
          route: mainRoutes.home,
          view: () => <p data-testid="message">home</p>
        },
        {
          route: mainRoutes.settings,
          view: () => <p data-testid="message">settings</p>
        },
        {
          route: shopRouter,
          view: ShopRoutesView
        }
      ]
    });

    const { getByTestId } = renderWithRouter(mainRouter, appScope, <MainRoutesView />);

    await waitFor(() => expect(getByTestId("message").textContent).toBe("home"));

    await openRoute(shopRoutes.products, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("products");
      scoped(appScope, () => expect(shopRoutes.products.isOpened.value).toBe(true));
    });

    await openRoute(shopRoutes.cart, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("cart");
      scoped(appScope, () => expect(shopRoutes.cart.isOpened.value).toBe(true));
    });

    await openRoute(mainRoutes.settings, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("settings");
      scoped(appScope, () => expect(mainRoutes.settings.isOpened.value).toBe(true));
    });
  });

  test("multiple nested routers at same level", async () => {
    const appScope = scope();
    const shopRoutes = {
      products: createRoute({ path: "/products" }),
      orders: createRoute({ path: "/orders" })
    };
    const shopRouter = createRouter({
      routes: [shopRoutes.products, shopRoutes.orders]
    });
    const blogRoutes = {
      posts: createRoute({ path: "/posts" }),
      authors: createRoute({ path: "/authors" })
    };
    const blogRouter = createRouter({
      routes: [blogRoutes.posts, blogRoutes.authors]
    });
    const mainRoutes = {
      home: createRoute({ path: "/" })
    };
    const mainRouter = createRouter({
      routes: [mainRoutes.home, shopRouter, blogRouter]
    });

    await allSettled(mainRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))
    });

    const ShopRoutesView = createRoutesView({
      routes: [
        {
          route: shopRoutes.products,
          view: () => <p data-testid="message">Shop - Products</p>
        },
        {
          route: shopRoutes.orders,
          view: () => <p data-testid="message">Shop - Orders</p>
        }
      ]
    });
    const BlogRoutesView = createRoutesView({
      routes: [
        {
          route: blogRoutes.posts,
          view: () => <p data-testid="message">Blog - Posts</p>
        },
        {
          route: blogRoutes.authors,
          view: () => <p data-testid="message">Blog - Authors</p>
        }
      ]
    });
    const MainRoutesView = createRoutesView({
      routes: [
        {
          route: mainRoutes.home,
          view: () => <p data-testid="message">Home</p>
        },
        {
          route: shopRouter,
          view: ShopRoutesView
        },
        {
          route: blogRouter,
          view: BlogRoutesView
        }
      ]
    });

    const { getByTestId } = renderWithRouter(mainRouter, appScope, <MainRoutesView />);

    await waitFor(() => expect(getByTestId("message").textContent).toBe("Home"));

    await openRoute(shopRoutes.products, appScope);
    await waitFor(() => expect(getByTestId("message").textContent).toBe("Shop - Products"));

    await openRoute(blogRoutes.posts, appScope);
    await waitFor(() => expect(getByTestId("message").textContent).toBe("Blog - Posts"));

    await openRoute(shopRoutes.orders, appScope);
    await waitFor(() => expect(getByTestId("message").textContent).toBe("Shop - Orders"));

    await openRoute(blogRoutes.authors, appScope);
    await waitFor(() => expect(getByTestId("message").textContent).toBe("Blog - Authors"));
  });

  test("nested router state isolation", async () => {
    const appScope = scope();
    const moduleARoute = createRoute({ path: "/module-a" });
    const moduleBRoute = createRoute({ path: "/module-b" });
    const mainRouter = createRouter({
      routes: [moduleARoute, moduleBRoute]
    });

    await allSettled(mainRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))
    });

    const MainRoutesView = createRoutesView({
      routes: [
        {
          route: moduleARoute,
          view: () => <p data-testid="message">Module A</p>
        },
        {
          route: moduleBRoute,
          view: () => <p data-testid="message">Module B</p>
        }
      ]
    });

    const { getByTestId, queryByTestId } = renderWithRouter(mainRouter, appScope, <MainRoutesView />);

    expect(queryByTestId("message")).toBeFalsy();

    await openRoute(moduleARoute, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("Module A");
      scoped(appScope, () => {
        expect(moduleARoute.isOpened.value).toBe(true);
        expect(moduleBRoute.isOpened.value).toBe(false);
      });
    });

    await openRoute(moduleBRoute, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("Module B");
      scoped(appScope, () => {
        expect(moduleARoute.isOpened.value).toBe(false);
        expect(moduleBRoute.isOpened.value).toBe(true);
      });
    });
  });

  test("nested router with route parameters", async () => {
    const appScope = scope();
    const projectRoutes = {
      details: createRoute({ path: "/details" }),
      tasks: createRoute({ path: "/tasks/:taskId" })
    };
    const projectRouter = createRouter({
      routes: [projectRoutes.details, projectRoutes.tasks]
    });
    const mainRoutes = {
      workspace: createRoute({ path: "/workspace/:workspaceId" })
    };
    const mainRouter = createRouter({
      routes: [mainRoutes.workspace, projectRouter]
    });

    await allSettled(mainRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/workspace/ws-123"] }))
    });

    const ProjectRoutesView = createRoutesView({
      routes: [
        {
          route: projectRoutes.details,
          view: () => <p data-testid="message">Project Details</p>
        },
        {
          route: projectRoutes.tasks,
          view: () => <p data-testid="message">Task View</p>
        }
      ]
    });
    const MainRoutesView = createRoutesView({
      routes: [
        {
          route: mainRoutes.workspace,
          view: () => <p data-testid="message">Workspace</p>
        },
        {
          route: projectRouter,
          view: ProjectRoutesView
        }
      ]
    });

    const { getByTestId } = renderWithRouter(mainRouter, appScope, <MainRoutesView />);

    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("Workspace");
      scoped(appScope, () => expect(mainRoutes.workspace.params.workspaceId).toBe("ws-123"));
    });

    await openRoute(projectRoutes.tasks, appScope, { params: { taskId: "task-456" } });
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("Task View");
      scoped(appScope, () => expect(projectRoutes.tasks.params.taskId).toBe("task-456"));
    });

    await openRoute(projectRoutes.details, appScope);
    await waitFor(() => expect(getByTestId("message").textContent).toBe("Project Details"));
  });

  test("nested router isolated state management", async () => {
    const appScope = scope();
    const moduleARoutes = {
      page1: createRoute({ path: "/module-a/page1" }),
      page2: createRoute({ path: "/module-a/page2" })
    };
    const moduleARouter = createRouter({
      routes: [moduleARoutes.page1, moduleARoutes.page2]
    });
    const moduleBRoutes = {
      page1: createRoute({ path: "/module-b/page1" }),
      page2: createRoute({ path: "/module-b/page2" })
    };
    const moduleBRouter = createRouter({
      routes: [moduleBRoutes.page1, moduleBRoutes.page2]
    });
    const mainRouter = createRouter({
      routes: [moduleARouter, moduleBRouter]
    });

    await allSettled(mainRouter.setHistory, {
      scope: appScope,
      payload: historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))
    });

    const ModuleARoutesView = createRoutesView({
      routes: [
        {
          route: moduleARoutes.page1,
          view: () => <p data-testid="message">Module A - Page 1</p>
        },
        {
          route: moduleARoutes.page2,
          view: () => <p data-testid="message">Module A - Page 2</p>
        }
      ]
    });
    const ModuleBRoutesView = createRoutesView({
      routes: [
        {
          route: moduleBRoutes.page1,
          view: () => <p data-testid="message">Module B - Page 1</p>
        },
        {
          route: moduleBRoutes.page2,
          view: () => <p data-testid="message">Module B - Page 2</p>
        }
      ]
    });
    const MainRoutesView = createRoutesView({
      routes: [
        {
          route: moduleARouter,
          view: ModuleARoutesView
        },
        {
          route: moduleBRouter,
          view: ModuleBRoutesView
        }
      ]
    });

    const { getByTestId } = renderWithRouter(mainRouter, appScope, <MainRoutesView />);

    await openRoute(moduleARoutes.page1, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("Module A - Page 1");
      scoped(appScope, () => {
        expect(moduleARoutes.page1.isOpened.value).toBe(true);
        expect(moduleBRoutes.page1.isOpened.value).toBe(false);
      });
    });

    await openRoute(moduleBRoutes.page1, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("Module B - Page 1");
      scoped(appScope, () => {
        expect(moduleARoutes.page1.isOpened.value).toBe(false);
        expect(moduleBRoutes.page1.isOpened.value).toBe(true);
      });
    });

    await openRoute(moduleARoutes.page2, appScope);
    await waitFor(() => {
      expect(getByTestId("message").textContent).toBe("Module A - Page 2");
      scoped(appScope, () => {
        expect(moduleARoutes.page2.isOpened.value).toBe(true);
        expect(moduleBRoutes.page1.isOpened.value).toBe(false);
      });
    });
  });
});
