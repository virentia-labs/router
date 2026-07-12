import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter } from "../../lib";

describe("historyAdapter listen", () => {
  describe("the returned subscription", () => {
    it("stops further callbacks once unsubscribed", () => {
      const history = createMemoryHistory({ initialEntries: ["/"] });
      const adapter = historyAdapter(history);
      const callback = vi.fn();

      const subscription = adapter.listen(callback);

      history.push("/a");
      expect(callback).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();

      history.push("/b");
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
