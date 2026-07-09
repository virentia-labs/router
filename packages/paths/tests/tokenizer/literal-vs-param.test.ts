import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("tokenizer", () => {
  describe("a ':' inside a literal segment", () => {
    it("stays a const and matches only itself", () => {
      expect(compile("/a:b/x").parse("/a:b/x")).toStrictEqual({ path: "/a:b/x", params: null });
      expect(compile("/a:b/x").parse("/anything/x")).toBeNull();
      expect(compile("/localhost:3000").parse("/localhost:3000")).toStrictEqual({
        path: "/localhost:3000",
        params: null
      });
    });

    it("does not turn a hyphen-prefixed segment into a param", () => {
      expect(compile("/user-:id").parse("/user-42")).toBeNull();
    });
  });

  describe("a param name", () => {
    it("accepts a purely numeric name", () => {
      expect(compile("/x/:123").parse("/x/hello")).toStrictEqual({
        path: "/x/hello",
        params: { 123: "hello" }
      });
    });

    it("tokenizes a fully-decorated param (generic, range, optional)", () => {
      expect(compile("/:id<number>{2,3}?").parse("/1/2")).toStrictEqual({
        path: "/1/2",
        params: { id: [1, 2] }
      });
    });
  });
});
