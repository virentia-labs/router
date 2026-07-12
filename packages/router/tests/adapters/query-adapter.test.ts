import { describe, expect, it } from "vitest";
import { queryAdapter } from "../../lib";

describe("queryAdapter", () => {
  describe("with a malformed percent-encoded search", () => {
    it("does not throw", () => {
      const fakeHistory = {
        location: { pathname: "/", search: "?x=%E0%A4%A", hash: "" },
        push() {},
        replace() {},
        back() {},
        forward() {},
        listen: () => () => {}
      };
      expect(() => queryAdapter(fakeHistory as any)).not.toThrow();
      expect(() => queryAdapter(fakeHistory as any).location).not.toThrow();
    });
  });
});
