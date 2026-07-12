import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { historyAdapter } from "../../lib";

describe("historyAdapter", () => {
  describe("location", () => {
    it("is a live getter, not a construction snapshot", () => {
      const history = createMemoryHistory({ initialEntries: ["/one"] });
      const adapter = historyAdapter(history);
      expect(adapter.location.pathname).toBe("/one");
      history.push("/two");
      expect(adapter.location.pathname).toBe("/two");
    });
  });
});
