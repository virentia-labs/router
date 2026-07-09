import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("a path without params", () => {
    it("matches itself and captures no params", () => {
      expect(compile("/profile").parse("/profile")).toStrictEqual({
        path: "/profile",
        params: null
      });
    });

    it("rejects a trailing extra segment", () => {
      expect(compile("/profile").parse("/profile/1")).toBeNull();
    });
  });

  describe("a scalar string param", () => {
    it("captures the segment value", () => {
      expect(compile("/profile/:id").parse("/profile/12323")).toStrictEqual({
        path: "/profile/12323",
        params: { id: "12323" }
      });
    });

    it("requires the exact segment count", () => {
      const { parse } = compile("/a/:id");
      expect(parse("/a/1")).toStrictEqual({ path: "/a/1", params: { id: "1" } });
      expect(parse("/a")).toBeNull();
      expect(parse("/a/1/2")).toBeNull();
    });

    it("rejects a const-segment mismatch", () => {
      expect(compile("/a/:id").parse("/b/1")).toBeNull();
    });

    it("captures the value in a segment a bare path would reject", () => {
      expect(compile("/profile/:id").parse("/profile/1")).toStrictEqual({
        path: "/profile/1",
        params: { id: "1" }
      });
    });
  });
});
