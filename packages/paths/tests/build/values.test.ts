import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("build", () => {
  describe("a path without params", () => {
    it("builds the root path", () => {
      expect(compile("/").build()).toStrictEqual("/");
    });

    it("builds a static path", () => {
      expect(compile("/profile").build()).toBe("/profile");
    });
  });

  describe("a scalar param", () => {
    it("interpolates a string value", () => {
      expect(compile("/profile/:id").build({ id: "123" })).toBe("/profile/123");
    });

    it("interpolates a <number> value, including zero", () => {
      const { build } = compile("/profile/:id<number>");
      expect(build({ id: 123 })).toBe("/profile/123");
      expect(build({ id: 0 })).toBe("/profile/0");
    });

    it("interpolates a <union> member", () => {
      const { build } = compile("/profile/:id<hello|world>");
      expect(build({ id: "hello" })).toBe("/profile/hello");
      expect(build({ id: "world" })).toBe("/profile/world");
    });
  });

  describe("an optional '?' param", () => {
    it("interpolates a present string value or omits the segment", () => {
      const { build } = compile("/profile/:id?");
      expect(build({ id: "world" })).toBe("/profile/world");
      expect(build({ id: undefined })).toBe("/profile");
    });

    it("interpolates a present <number> value or omits the segment", () => {
      const { build } = compile("/profile/:id<number>?");
      expect(build({ id: 123 })).toBe("/profile/123");
      expect(build({ id: undefined })).toBe("/profile");
    });

    it("interpolates a present <union> value or omits the segment", () => {
      const { build } = compile("/profile/:id<hello|world>?");
      expect(build({ id: "hello" })).toBe("/profile/hello");
      expect(build({ id: undefined })).toBe("/profile");
    });
  });
});
