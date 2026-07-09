import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("tokenizer", () => {
  describe("empty and collapsing slashes", () => {
    it("compiles an empty template to a matcher for the empty path", () => {
      expect(compile("").parse("")).toStrictEqual({ path: "", params: null });
    });

    it("collapses a double slash to a single root segment", () => {
      expect(compile("//").parse("/")).toStrictEqual({ path: "/", params: null });
    });

    it("drops empty segments when building", () => {
      expect(compile("/a//b").build({} as never)).toBe("/a/b");
    });
  });
});
