import { scope, scoped, store } from "@virentia/core";
import { describe, expect, it } from "vitest";
import { group, virtualRoute, type RouteOpenedPayload } from "../../lib";

describe("group isPending", () => {
  describe("when a member is pending", () => {
    it("reports the group as pending", async () => {
      const appScope = scope();
      const memberPending = store<boolean>(false);
      const member = virtualRoute<RouteOpenedPayload<void>, void>({ isPending: memberPending });
      const idle = virtualRoute<RouteOpenedPayload<void>, void>();
      const grouped = group([member, idle]);

      scoped(appScope, () => expect(grouped.isPending.value).toBe(false));

      scoped(appScope, () => {
        memberPending.value = true;
      });

      scoped(appScope, () => expect(grouped.isPending.value).toBe(true));

      scoped(appScope, () => {
        memberPending.value = false;
      });

      scoped(appScope, () => expect(grouped.isPending.value).toBe(false));
    });
  });
});
