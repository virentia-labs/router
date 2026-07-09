import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("a deep static path", () => {
    it("matches every const segment in order", () => {
      const { parse } = compile("/a/b/c");
      expect(parse("/a/b/c")).toStrictEqual({ path: "/a/b/c", params: null });
      expect(parse("/a/x/c")).toBeNull();
    });
  });

  describe("consts interleaved with params", () => {
    it("captures each param at its position", () => {
      const { parse } = compile("/a/:x/b/:y");
      expect(parse("/a/1/b/2")).toStrictEqual({ path: "/a/1/b/2", params: { x: "1", y: "2" } });
      expect(parse("/a/1/x/2")).toBeNull();
    });
  });
});
