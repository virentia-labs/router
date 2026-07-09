import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

// build() must never emit a URL its own parser would reject.
describe("build", () => {
  describe("a required scalar param", () => {
    it("throws a named error when missing", () => {
      expect(() => compile("/users/:id").build({} as never)).toThrow(/Missing required parameter "id"/);
      expect(() => compile("/users/:id").build(undefined as never)).toThrow(/Missing required/);
    });

    it("throws when given an empty string", () => {
      expect(() => compile("/user/:id").build({ id: "" } as never)).toThrow(/Missing required/);
    });
  });

  describe("an omittable param", () => {
    it("builds the base path when an optional scalar is absent", () => {
      expect(compile("/users/:id?").build({} as never)).toBe("/users");
    });

    it("skips an empty-string optional scalar instead of emitting an empty segment", () => {
      expect(compile("/user/:id?").build({ id: "" } as never)).toBe("/user");
    });

    it("builds the base path when a '*' array is empty or absent", () => {
      expect(compile("/files/:path*").build({ path: [] } as never)).toBe("/files");
      expect(compile("/files/:path*").build({} as never)).toBe("/files");
    });
  });

  describe("a required array param", () => {
    it("throws when a '+' array is empty or absent", () => {
      expect(() => compile("/files/:path+").build({ path: [] } as never)).toThrow(/at least 1/);
      expect(() => compile("/files/:path+").build({} as never)).toThrow(/at least 1/);
    });

    it("throws when fewer than the minimum elements are given", () => {
      expect(() => compile("/files/:path{2,4}").build({ path: ["x"] } as never)).toThrow(/at least 2/);
    });
  });
});
