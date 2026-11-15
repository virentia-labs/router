import { reaction, scope, scoped } from "@virentia/core";
import { staticModel } from "@virentia/core/models";
import { withUnitDeclarationTracker } from "@virentia/core/internal";
import { createMemoryHistory } from "history";
import { expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";

it("keeps separate histories for staticModel instances in one application", async () => {
  const Screen = staticModel({
    name: "RouterScreen",
    setup() {
      const page = route({ path: "/edit/:id" });
      const navigation = router({ routes: [page] });
      return { page, navigation };
    },
  });
  const app = scope();
  const counts: string[] = [];
  const rows = withUnitDeclarationTracker(kind => counts.push(kind), () => scoped(app, () => Screen.create([{ id: "a" }, { id: "b" }])));
  const a = rows[0]!, b = rows[1]!;
  const first = createMemoryHistory(), second = createMemoryHistory();
  const firstAdapter = historyAdapter(first), secondAdapter = historyAdapter(second);
  try {
    expect(counts).toEqual([]);
    expect(a.page.params.node).toBe(b.page.params.node);
    expect(a.navigation.knownRoutes[0]!.route).toBe(a.page);
    expect(b.navigation.knownRoutes[0]!.route).toBe(b.page);
    await a.navigation.setHistory(firstAdapter);
    await b.navigation.setHistory(secondAdapter);
    expect([a.navigation.history.value, b.navigation.history.value]).toEqual([firstAdapter, secondAdapter]);
    expect([a.navigation.path.value, b.navigation.path.value]).toEqual(["/", "/"]);
    await a.page.open({ params: { id: "first" } });
    await b.page.open({ params: { id: "second" } });
    await vi.waitFor(() => expect([a.page.params.value, b.page.params.value]).toEqual([{ id: "first" }, { id: "second" }]));
    expect([first.location.pathname, second.location.pathname]).toEqual(["/edit/first", "/edit/second"]);
    expect([a.page.isOpened.value, b.page.isOpened.value]).toEqual([true, true]);
    expect(a.navigation.activeRoutes.value).toEqual([a.page]);
    expect(b.navigation.activeRoutes.value).toEqual([b.page]);
  } finally {
    await a.dispose(); await b.dispose();
  }
});

it("releases a model-owned history listener automatically and leaves the sibling live", async () => {
  const Screen = staticModel({ setup() {
    return { navigation: router({ routes: [] }) };
  } });
  const rows = scoped(scope(), () => Screen.create([{}, {}]));
  const a = rows[0]!, b = rows[1]!;
  const histories = [createMemoryHistory(), createMemoryHistory()];
  const adapters = histories.map(history => {
    const adapter = historyAdapter(history), unsubscribe = vi.fn();
    const listen = adapter.listen.bind(adapter);
    adapter.listen = callback => { const listener = listen(callback); return { unsubscribe() { unsubscribe(); listener.unsubscribe(); } }; };
    return { adapter, unsubscribe };
  });
  try {
    await a.navigation.setHistory(adapters[0]!.adapter); await b.navigation.setHistory(adapters[1]!.adapter);
    await a.dispose();
    expect(adapters.map(entry => entry.unsubscribe.mock.calls.length)).toEqual([1, 0]);
    histories[1]!.push("/live");
    await vi.waitFor(() => expect(b.navigation.path.value).toBe("/live"));
  } finally { await a.dispose(); await b.dispose(); }
  expect(adapters.map(entry => entry.unsubscribe.mock.calls.length)).toEqual([1, 1]);
});

it("declares query trackers once and keeps their events and history scoped to each model", async () => {
  const Screen = staticModel({ setup() {
    const page = route({ path: "/edit/:id" }), navigation = router({ routes: [page] });
    const tracker = navigation.trackQuery({ forRoutes: [page], parameters: {
      safeParse(query) { return typeof query.tab === "string"
        ? { success: true as const, data: { tab: query.tab } }
        : { success: false as const }; },
    } });
    return { page, navigation, tracker };
  } });
  const counts: string[] = [];
  const rows = withUnitDeclarationTracker(kind => counts.push(kind), () => scoped(scope(), () => Screen.create([{}, {}])));
  const a = rows[0]!, b = rows[1]!, first: string[] = [], second: string[] = [];
  const stopA = reaction({ on: a.tracker.entered, run(value) { first.push(value.tab); } });
  const stopB = reaction({ on: b.tracker.entered, run(value) { second.push(value.tab); } });
  try {
    expect(counts).toEqual([]);
    await a.navigation.setHistory(historyAdapter(createMemoryHistory()));
    await b.navigation.setHistory(historyAdapter(createMemoryHistory()));
    await a.page.open({ params: { id: "a" } }); await b.page.open({ params: { id: "b" } });
    await a.tracker.enter({ tab: "first" });
    await vi.waitFor(() => expect(first).toEqual(["first"]));
    expect(second).toEqual([]);
    expect(b.navigation.query.value).toEqual({});
    await a.dispose();
    await b.tracker.enter({ tab: "second" });
    await vi.waitFor(() => expect(second).toEqual(["second"]));
    expect(first).toEqual(["first"]);
  } finally { stopA.stop(); stopB.stop(); await a.dispose(); await b.dispose(); }
});

it("binds nested router tables and releases old histories before reusing an identity", async () => {
  const Screen = staticModel({ setup() {
    const page = route({ path: "/general" });
    const settings = router({ base: "/settings", routes: [page] });
    return { page, settings, navigation: router({ routes: [settings] }) };
  } });
  const app = scope(), rows = scoped(app, () => Screen.create([{ id: "a" }, { id: "b" }]));
  const a = rows[0]!, b = rows[1]!;
  const first = createMemoryHistory({ initialEntries: ["/settings/general"] });
  const second = createMemoryHistory();
  try {
    expect(a.navigation.knownRoutes[0]!.route).toBe(a.page);
    expect(a.settings.knownRoutes[0]!.route).toBe(a.page);
    expect(b.navigation.knownRoutes[0]!.route).toBe(b.page);
    await a.navigation.setHistory(historyAdapter(first));
    await b.navigation.setHistory(historyAdapter(second));
    await vi.waitFor(() => expect(a.page.isOpened.value).toBe(true));
    expect(b.page.isOpened.value).toBe(false);
    await a.dispose();
    const fresh = scoped(app, () => Screen.create({ id: "a" }));
    try {
      const freshHistory = createMemoryHistory();
      await fresh.navigation.setHistory(historyAdapter(freshHistory));
      first.push("/settings/general");
      await b.page.open();
      await vi.waitFor(() => expect(b.page.isOpened.value).toBe(true));
      expect(fresh.navigation.path.value).toBe("/");
      expect(fresh.page.isOpened.value).toBe(false);
      expect(second.location.pathname).toBe("/settings/general");
    } finally { await fresh.dispose(); }
  } finally { await a.dispose(); await b.dispose(); }
});
