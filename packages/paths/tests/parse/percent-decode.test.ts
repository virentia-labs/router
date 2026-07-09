import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("a percent-encoded segment", () => {
    it("decodes it into the param value", () => {
      expect(compile("/p/:id").parse("/p/a%2Fb")).toStrictEqual({ path: "/p/a%2Fb", params: { id: "a/b" } });
      expect(compile("/p/:id").parse("/p/hi%20there")).toStrictEqual({ path: "/p/hi%20there", params: { id: "hi there" } });
    });

    it("falls back to the raw value on malformed encoding without throwing", () => {
      expect(() => compile("/p/:id").parse("/p/%E0%A4%A")).not.toThrow();
      expect(compile("/p/:id").parse("/p/%")).toStrictEqual({ path: "/p/%", params: { id: "%" } });
    });
  });
});
