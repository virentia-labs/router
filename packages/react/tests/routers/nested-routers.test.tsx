import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { waitFor, type RenderResult } from "@testing-library/react";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("nested routers", () => {
  describe("single nested router", () => {
    async function setup() {
      const appScope = scope();
      const shopRoutes = {
        products: route({ path: "/products" }),
        cart: route({ path: "/cart" })
      };
      const shopRouter = router({
        routes: [shopRoutes.products, shopRoutes.cart]
      });
      const mainRoutes = {
        home: route({ path: "/" }),
        settings: route({ path: "/settings" })
      };
      const mainRouter = router({
        routes: [mainRoutes.home, mainRoutes.settings, shopRouter]
      });

      await scoped(appScope, () => mainRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))));

      const ShopRoutesView = routesView({
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
      const MainRoutesView = routesView({
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

      const rendered: RenderResult = renderWithRouter(mainRouter, appScope, <MainRoutesView />);
      return { appScope, shopRoutes, mainRoutes, getByTestId: rendered.getByTestId };
    }

    it("renders the home view initially", async () => {
      const { getByTestId } = await setup();

      await waitFor(() => expect(getByTestId("message").textContent).toBe("home"));
    });

    it("opens a route inside the nested router", async () => {
      const { appScope, shopRoutes, getByTestId } = await setup();

      await openRoute(shopRoutes.products, appScope);
      await waitFor(() => {
        expect(getByTestId("message").textContent).toBe("products");
        scoped(appScope, () => expect(shopRoutes.products.isOpened.value).toBe(true));
      });
    });

    it("switches between routes inside the nested router", async () => {
      const { appScope, shopRoutes, getByTestId } = await setup();

      await openRoute(shopRoutes.cart, appScope);
      await waitFor(() => {
        expect(getByTestId("message").textContent).toBe("cart");
        scoped(appScope, () => expect(shopRoutes.cart.isOpened.value).toBe(true));
      });
    });

    it("opens a sibling route on the main router", async () => {
      const { appScope, mainRoutes, getByTestId } = await setup();

      await openRoute(mainRoutes.settings, appScope);
      await waitFor(() => {
        expect(getByTestId("message").textContent).toBe("settings");
        scoped(appScope, () => expect(mainRoutes.settings.isOpened.value).toBe(true));
      });
    });
  });

  describe("multiple routers at the same level", () => {
    async function setup() {
      const appScope = scope();
      const shopRoutes = {
        products: route({ path: "/products" }),
        orders: route({ path: "/orders" })
      };
      const shopRouter = router({
        routes: [shopRoutes.products, shopRoutes.orders]
      });
      const blogRoutes = {
        posts: route({ path: "/posts" }),
        authors: route({ path: "/authors" })
      };
      const blogRouter = router({
        routes: [blogRoutes.posts, blogRoutes.authors]
      });
      const mainRoutes = {
        home: route({ path: "/" })
      };
      const mainRouter = router({
        routes: [mainRoutes.home, shopRouter, blogRouter]
      });

      await scoped(appScope, () => mainRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))));

      const ShopRoutesView = routesView({
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
      const BlogRoutesView = routesView({
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
      const MainRoutesView = routesView({
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

      const rendered: RenderResult = renderWithRouter(mainRouter, appScope, <MainRoutesView />);
      return { appScope, shopRoutes, blogRoutes, getByTestId: rendered.getByTestId };
    }

    it("renders the home view initially", async () => {
      const { getByTestId } = await setup();

      await waitFor(() => expect(getByTestId("message").textContent).toBe("Home"));
    });

    it("opens a route in the shop router", async () => {
      const { appScope, shopRoutes, getByTestId } = await setup();

      await openRoute(shopRoutes.products, appScope);
      await waitFor(() => expect(getByTestId("message").textContent).toBe("Shop - Products"));
    });

    it("opens a route in the blog router", async () => {
      const { appScope, blogRoutes, getByTestId } = await setup();

      await openRoute(blogRoutes.posts, appScope);
      await waitFor(() => expect(getByTestId("message").textContent).toBe("Blog - Posts"));
    });

    it("switches to a second route in the shop router", async () => {
      const { appScope, shopRoutes, getByTestId } = await setup();

      await openRoute(shopRoutes.orders, appScope);
      await waitFor(() => expect(getByTestId("message").textContent).toBe("Shop - Orders"));
    });

    it("switches to a second route in the blog router", async () => {
      const { appScope, blogRoutes, getByTestId } = await setup();

      await openRoute(blogRoutes.authors, appScope);
      await waitFor(() => expect(getByTestId("message").textContent).toBe("Blog - Authors"));
    });
  });

  describe("state isolation between sibling routes", () => {
    async function setup() {
      const appScope = scope();
      const moduleARoute = route({ path: "/module-a" });
      const moduleBRoute = route({ path: "/module-b" });
      const mainRouter = router({
        routes: [moduleARoute, moduleBRoute]
      });

      await scoped(appScope, () => mainRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))));

      const MainRoutesView = routesView({
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

      const rendered: RenderResult = renderWithRouter(mainRouter, appScope, <MainRoutesView />);
      return {
        appScope,
        moduleARoute,
        moduleBRoute,
        getByTestId: rendered.getByTestId,
        queryByTestId: rendered.queryByTestId
      };
    }

    it("renders nothing when no route matches", async () => {
      const { queryByTestId } = await setup();

      expect(queryByTestId("message")).toBeFalsy();
    });

    it("opens module A and leaves module B closed", async () => {
      const { appScope, moduleARoute, moduleBRoute, getByTestId } = await setup();

      await openRoute(moduleARoute, appScope);
      await waitFor(() => {
        expect(getByTestId("message").textContent).toBe("Module A");
        scoped(appScope, () => {
          expect(moduleARoute.isOpened.value).toBe(true);
          expect(moduleBRoute.isOpened.value).toBe(false);
        });
      });
    });

    it("closes module A when switching to module B", async () => {
      const { appScope, moduleARoute, moduleBRoute, getByTestId } = await setup();

      await openRoute(moduleARoute, appScope);
      await openRoute(moduleBRoute, appScope);
      await waitFor(() => {
        expect(getByTestId("message").textContent).toBe("Module B");
        scoped(appScope, () => {
          expect(moduleARoute.isOpened.value).toBe(false);
          expect(moduleBRoute.isOpened.value).toBe(true);
        });
      });
    });
  });

  describe("routes with parameters", () => {
    async function setup() {
      const appScope = scope();
      const projectRoutes = {
        details: route({ path: "/details" }),
        tasks: route({ path: "/tasks/:taskId" })
      };
      const projectRouter = router({
        routes: [projectRoutes.details, projectRoutes.tasks]
      });
      const mainRoutes = {
        workspace: route({ path: "/workspace/:workspaceId" })
      };
      const mainRouter = router({
        routes: [mainRoutes.workspace, projectRouter]
      });

      await scoped(appScope, () => mainRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/workspace/ws-123"] }))));

      const ProjectRoutesView = routesView({
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
      const MainRoutesView = routesView({
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

      const rendered: RenderResult = renderWithRouter(mainRouter, appScope, <MainRoutesView />);
      return { appScope, projectRoutes, mainRoutes, getByTestId: rendered.getByTestId };
    }

    it("renders the workspace route with its params", async () => {
      const { appScope, mainRoutes, getByTestId } = await setup();

      await waitFor(() => {
        expect(getByTestId("message").textContent).toBe("Workspace");
        scoped(appScope, () => expect(mainRoutes.workspace.params.value.workspaceId).toBe("ws-123"));
      });
    });

    it("opens a task route carrying its params", async () => {
      const { appScope, projectRoutes, getByTestId } = await setup();

      await openRoute(projectRoutes.tasks, appScope, { params: { taskId: "task-456" } });
      await waitFor(() => {
        expect(getByTestId("message").textContent).toBe("Task View");
        scoped(appScope, () => expect(projectRoutes.tasks.params.value.taskId).toBe("task-456"));
      });
    });

    it("opens the details route in the nested router", async () => {
      const { appScope, projectRoutes, getByTestId } = await setup();

      await openRoute(projectRoutes.details, appScope);
      await waitFor(() => expect(getByTestId("message").textContent).toBe("Project Details"));
    });
  });

  describe("state isolation between module routers", () => {
    async function setup() {
      const appScope = scope();
      const moduleARoutes = {
        page1: route({ path: "/module-a/page1" }),
        page2: route({ path: "/module-a/page2" })
      };
      const moduleARouter = router({
        routes: [moduleARoutes.page1, moduleARoutes.page2]
      });
      const moduleBRoutes = {
        page1: route({ path: "/module-b/page1" }),
        page2: route({ path: "/module-b/page2" })
      };
      const moduleBRouter = router({
        routes: [moduleBRoutes.page1, moduleBRoutes.page2]
      });
      const mainRouter = router({
        routes: [moduleARouter, moduleBRouter]
      });

      await scoped(appScope, () => mainRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))));

      const ModuleARoutesView = routesView({
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
      const ModuleBRoutesView = routesView({
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
      const MainRoutesView = routesView({
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

      const rendered: RenderResult = renderWithRouter(mainRouter, appScope, <MainRoutesView />);
      return { appScope, moduleARoutes, moduleBRoutes, getByTestId: rendered.getByTestId };
    }

    it("isolates opened state across module routers as pages change", async () => {
      const { appScope, moduleARoutes, moduleBRoutes, getByTestId } = await setup();

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
});
