import { describe, expect, test } from "vitest";
import { route, router } from "../lib";

describe("paths generation", () => {
  test("without base", () => {
    const route1 = route({ path: "/hi" });
    const route2 = route({ path: "/hello" });
    const nested1 = route({ path: "/ff", parent: route1 });
    const nested2 = route({ path: "/ss", parent: route2 });
    const nested3 = route({ path: "/ss", parent: nested1 });

    const { knownRoutes } = router({
      routes: [route1, route2, nested1, nested2, nested3]
    });

    expect(knownRoutes.map((route) => route.path)).toStrictEqual([
      "/hi",
      "/hello",
      "/hi/ff",
      "/hello/ss",
      "/hi/ff/ss"
    ]);
  });

  test("with base", () => {
    const route1 = route({ path: "/hi" });
    const route2 = route({ path: "/hello" });
    const nested1 = route({ path: "/ff", parent: route1 });
    const nested2 = route({ path: "/ss", parent: route2 });
    const nested3 = route({ path: "/ss", parent: nested1 });

    const { knownRoutes } = router({
      base: "/movpushmov",
      routes: [route1, route2, nested1, nested2, nested3]
    });

    expect(knownRoutes.map((route) => route.path)).toStrictEqual([
      "/movpushmov/hi",
      "/movpushmov/hello",
      "/movpushmov/hi/ff",
      "/movpushmov/hello/ss",
      "/movpushmov/hi/ff/ss"
    ]);
  });
});
