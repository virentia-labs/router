import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("the root path", () => {
    it("matches only the empty path set", () => {
      const { parse } = compile("/");
      expect(parse("/")).toStrictEqual({ path: "/", params: null });
      expect(parse("/not-found")).toStrictEqual(null);
      expect(parse("/x")).toBeNull();
    });
  });
});
