import { scope, scoped } from "@virentia/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { route } from "../../lib";
import { watchCalls } from "../support/router-harness";

describe("route activation key (property-based)", () => {
  it("stays idempotent regardless of query key order", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.tuple(fc.string(), fc.jsonValue()), {
          selector: ([key]) => key,
          minLength: 2,
          maxLength: 6
        }),
        async (entries) => {
          const r = route() as any;
          const appScope = scope();
          const runner = scoped(appScope);
          const opened = watchCalls(r.opened, appScope);

          const q1 = Object.fromEntries(entries);
          const q2 = Object.fromEntries([...entries].reverse());

          await runner(() =>
            r.internal.activateRoute(
              { params: { id: "1" }, query: q1, skipBeforeOpen: true, navigate: false },
              runner,
            ),
          );
          const afterFirst = opened.mock.calls.length;

          await runner(() =>
            r.internal.activateRoute(
              { params: { id: "1" }, query: q2, skipBeforeOpen: true, navigate: false },
              runner,
            ),
          );

          expect(opened.mock.calls.length).toBe(afterFirst);
        },
      ),
    );
  });

  it("treats a shared reference across two keys as a DAG, not a cycle", async () => {
    await fc.assert(
      fc.asyncProperty(fc.object(), async (shared) => {
        const r = route() as any;
        const appScope = scope();
        const runner = scoped(appScope);
        const opened = watchCalls(r.opened, appScope);

        const payload = () => ({
          params: { id: "1" },
          query: { a: shared, b: shared } as any,
          skipBeforeOpen: true,
          navigate: false
        });

        await runner(() => r.internal.activateRoute(payload(), runner));
        const afterFirst = opened.mock.calls.length;

        await runner(() => r.internal.activateRoute(payload(), runner));

        // A shared (non-circular) ref must not force a fresh non-serializable key,
        // so the second activation short-circuits instead of re-firing opened.
        expect(opened.mock.calls.length).toBe(afterFirst);
        scoped(appScope, () => expect(r.isOpened.value).toBe(true));
      }),
    );
  });
});
