import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("an unbounded array before a trailing segment", () => {
    it("leaves the last segment for a trailing const", () => {
      const { parse } = compile("/:path*/end");
      expect(parse("/a/b/end")).toStrictEqual({ path: "/a/b/end", params: { path: ["a", "b"] } });
      expect(parse("/end")).toStrictEqual({ path: "/end", params: { path: [] } });
      expect(parse("/a/b/c")).toBeNull();
    });

    it("leaves the last segment for a trailing required param", () => {
      expect(compile("/:path+/:tail").parse("/a/b/c")).toStrictEqual({
        path: "/a/b/c",
        params: { path: ["a", "b"], tail: "c" }
      });
      expect(compile("/:path+/:tail").parse("/only")).toBeNull();
    });
  });

  describe("a bounded array before a scalar", () => {
    it("splits the fixed count off and captures the remainder", () => {
      expect(compile("/items/:id{2,2}/:hi").parse("/items/1/2/hello")).toStrictEqual({
        path: "/items/1/2/hello",
        params: { id: ["1", "2"], hi: "hello" }
      });
    });
  });
});
