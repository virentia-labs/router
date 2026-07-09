import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("build", () => {
  describe("a value containing reserved characters", () => {
    it("percent-encodes a slash into a single segment", () => {
      expect(compile("/p/:id").build({ id: "a/b" } as never)).toBe("/p/a%2Fb");
    });

    it("percent-encodes a space", () => {
      expect(compile("/p/:id").build({ id: "hi there" } as never)).toBe("/p/hi%20there");
    });
  });
});
