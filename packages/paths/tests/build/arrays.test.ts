import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("build", () => {
  describe("a '+' array param", () => {
    it("joins string elements with slashes", () => {
      const { build } = compile("/profile/:id+");
      expect(build({ id: ["123", "321"] })).toBe("/profile/123/321");
      expect(build({ id: ["123"] })).toBe("/profile/123");
    });

    it("joins <number> elements", () => {
      const { build } = compile("/profile/:id<number>+");
      expect(build({ id: [123, 321] })).toBe("/profile/123/321");
      expect(build({ id: [123] })).toBe("/profile/123");
    });

    it("joins <union> elements", () => {
      const { build } = compile("/profile/:id<hello|world>+");
      expect(build({ id: ["hello", "world"] })).toBe("/profile/hello/world");
      expect(build({ id: ["hello"] })).toBe("/profile/hello");
    });
  });

  describe("a '*' array param", () => {
    it("joins string elements or omits when empty", () => {
      const { build } = compile("/profile/:id*");
      expect(build({ id: ["123", "321"] })).toBe("/profile/123/321");
      expect(build({ id: ["123"] })).toBe("/profile/123");
      expect(build({ id: [] })).toBe("/profile");
    });

    it("joins <number> elements or omits when empty", () => {
      const { build } = compile("/profile/:id<number>*");
      expect(build({ id: [123, 321] })).toBe("/profile/123/321");
      expect(build({ id: [123] })).toBe("/profile/123");
      expect(build({ id: [] })).toBe("/profile");
    });

    it("joins <union> elements or omits when empty", () => {
      const { build } = compile("/profile/:id<hello|world>*");
      expect(build({ id: ["hello", "world"] })).toBe("/profile/hello/world");
      expect(build({ id: ["hello"] })).toBe("/profile/hello");
      expect(build({ id: [] })).toBe("/profile");
    });
  });
});
