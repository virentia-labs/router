import { describe, expect, it } from "vitest";
import { convertPath } from "../../lib";

describe("convertPath", () => {
  describe("express mode", () => {
    it("preserves the documented express fixtures", () => {
      expect(convertPath("/", "express")).toBe("/");
      expect(convertPath("/:id", "express")).toBe("/:id");
      expect(convertPath("/:id+", "express")).toBe("/*id");
      expect(convertPath("/:id*", "express")).toBe("/*id");
      expect(convertPath("/:id?", "express")).toBe("/{:id}");
      expect(convertPath("/files/:id?", "express")).toBe("/files{/:id}");
      expect(convertPath("/files/:id<number>", "express")).toBe("/files/:id");
      expect(convertPath("/files/:id<number>?", "express")).toBe("/files{/:id}");
      expect(convertPath("/files/:id{1,2}", "express")).toBe("/files/*id");
      expect(convertPath("/files/:id{1,2}?", "express")).toBe("/files{/*id}");
    });

    it("applies name-agnostically across param names", () => {
      expect(convertPath("/:userId+", "express")).toBe("/*userId");
      expect(convertPath("/:slug?", "express")).toBe("/{:slug}");
      expect(convertPath("/files/:fileName<number>", "express")).toBe("/files/:fileName");
    });

    it("does not collapse adjacent params", () => {
      expect(convertPath("/:a<x>/:b<y>", "express")).toBe("/:a/:b");
      expect(convertPath("/:a{1,2}/:b{3,4}", "express")).toBe("/*a/*b");
    });
  });

  describe("an unknown mode", () => {
    it("returns the path unchanged", () => {
      expect(convertPath("/:id", "nope" as never)).toBe("/:id");
    });
  });
});
