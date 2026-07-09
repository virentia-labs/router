import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("build", () => {
  describe("a param named after a prototype member", () => {
    it("treats an absent constructor param as missing, not inherited", () => {
      expect(() => compile("/:constructor").build({} as never)).toThrow(/Missing required/);
    });

    it("treats an absent toString param as missing, not inherited", () => {
      expect(() => compile("/:toString").build({} as never)).toThrow(/Missing required/);
    });

    it("interpolates an own hasOwnProperty value", () => {
      expect(compile("/:hasOwnProperty").build({ hasOwnProperty: "x" } as never)).toBe("/x");
    });
  });
});
