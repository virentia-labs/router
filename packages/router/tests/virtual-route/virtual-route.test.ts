import { scope, scoped } from "@virentia/core";
import { describe, expect, it } from "vitest";
import { virtualRoute } from "../../lib";
import { watchCalls } from "../support/router-harness";

describe("virtualRoute", () => {
  it("opens and stores params via the default transformer", async () => {
    const v = virtualRoute<{ id: string }>();
    const appScope = scope();

    await scoped(appScope, () => v.open({ id: "7" }));
    expect(scoped(appScope, () => v.isOpened.value)).toBe(true);
    expect(scoped(appScope, () => (v.params.value as any).id)).toBe("7");
  });

  it("fires closed once across repeated close", async () => {
    const v = virtualRoute<{ id: string }>();
    const appScope = scope();
    const closed = watchCalls(v.closed, appScope);

    await scoped(appScope, () => v.open({ id: "7" }));

    await scoped(appScope, () => v.close());
    await scoped(appScope, () => v.close()); // second close is a no-op
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
