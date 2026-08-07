import { describe, it, expect } from "vitest";
import { SettingsStore } from "../../../src/settings/store";

describe("SettingsStore SQL-backed hydration (seedFromPersisted)", () => {
  it("restores overrides + revision counter from persisted rows", async () => {
    const store = new SettingsStore();
    store.commit(
      { type: "default", workspaceId: null, branchId: null, executiveRole: null },
      { "providers.deepseek.model": "deepseek-chat" },
      "tester",
      "c-1",
    );

    store.seedFromPersisted(
      [
        {
          scope: { type: "default", workspaceId: null, branchId: null, executiveRole: null },
          values: { "providers.deepseek.model": "deepseek-v4-flash" },
        },
      ],
      5,
    );

    expect(store.revisionCount).toBe(5);
    const overrides = await store.loadOverrides();
    expect(overrides).toHaveLength(1);
    expect(overrides[0].values["providers.deepseek.model"]).toBe("deepseek-v4-flash");
  });

  it("clears previously committed values when seeding an empty set", async () => {
    const store = new SettingsStore();
    store.commit(
      { type: "default", workspaceId: null, branchId: null, executiveRole: null },
      { "stale.keypace": "old" },
      "tester",
      "c-2",
    );

    store.seedFromPersisted([], 0);
    expect(store.revisionCount).toBe(0);
    const overrides = await store.loadOverrides();
    expect(overrides).toHaveLength(0);
  });

  it("executive scoped persisted rows hydrate with their coordinates", async () => {
    const store = new SettingsStore();
    store.seedFromPersisted(
      [
        {
          scope: { type: "executive", workspaceId: null, branchId: null, executiveRole: "CTO" as never },
          values: { "ai.provider": "deepseek" },
        },
      ],
      3,
    );

    const overrides = await store.loadOverrides();
    expect(overrides).toHaveLength(1);
    expect(overrides[0].scope.executiveRole).toBe("CTO");
    expect(overrides[0].values["ai.provider"]).toBe("deepseek");
  });
});