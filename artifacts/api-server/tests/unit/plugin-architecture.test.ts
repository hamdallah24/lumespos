import { describe, it, expect, beforeEach } from "vitest";
import type { Plugin, PluginContext } from "../../src/plugin-architecture/types";

beforeEach(async () => {
  const { clearPlugins } = await import("../../src/plugin-architecture/PluginRegistry");
  const { clearAllState } = await import("../../src/plugin-architecture/PluginHost");
  clearPlugins();
  clearAllState();
});

describe("PluginRegistry", () => {
  it("should register and retrieve a plugin", async () => {
    const { registerPlugin, getPlugin, getAllPlugins } = await import("../../src/plugin-architecture/PluginRegistry");

    const plugin: Plugin = {
      manifest: { id: "test-1", name: "Test", version: "1.0", description: "A test plugin", hooks: ["before_execute"] },
      init: () => {},
    };

    const ok = registerPlugin(plugin);
    expect(ok).toBe(true);

    const retrieved = getPlugin("test-1");
    expect(retrieved).toBeDefined();
    expect(retrieved!.manifest.id).toBe("test-1");

    const all = getAllPlugins();
    expect(all.length).toBe(1);
  });

  it("should reject duplicate registration", async () => {
    const { registerPlugin } = await import("../../src/plugin-architecture/PluginRegistry");
    const plugin: Plugin = {
      manifest: { id: "dup", name: "Dup", version: "1.0", description: "", hooks: [] },
      init: () => {},
    };
    expect(registerPlugin(plugin)).toBe(true);
    expect(registerPlugin(plugin)).toBe(false);
  });

  it("should unregister a plugin", async () => {
    const { registerPlugin, unregisterPlugin, getAllPlugins } = await import("../../src/plugin-architecture/PluginRegistry");
    const plugin: Plugin = {
      manifest: { id: "del", name: "Del", version: "1.0", description: "", hooks: [] },
      init: () => {},
    };
    registerPlugin(plugin);
    expect(unregisterPlugin("del")).toBe(true);
    expect(getAllPlugins().length).toBe(0);
  });
});

describe("PluginManager", () => {
  it("should initialize and start a plugin", async () => {
    const { PluginManager } = await import("../../src/plugin-architecture/PluginManager");
    let initCalled = false;
    let startCalled = false;

    const plugin: Plugin = {
      manifest: { id: "p1", name: "P1", version: "1.0", description: "", hooks: ["before_execute"] },
      init: () => { initCalled = true; },
      start: () => { startCalled = true; },
    };

    PluginManager.register(plugin);
    const ok = await PluginManager.initialize("p1");
    expect(ok).toBe(true);
    expect(initCalled).toBe(true);

    const started = await PluginManager.start("p1");
    expect(started).toBe(true);
    expect(startCalled).toBe(true);
  });

  it("should execute hooks on matching plugins", async () => {
    const { PluginManager } = await import("../../src/plugin-architecture/PluginManager");

    const plugin: Plugin = {
      manifest: { id: "p2", name: "P2", version: "1.0", description: "", hooks: ["before_execute", "after_execute"] },
      init: () => {},
      execute: async (_hook: string, payload: unknown) => `processed:${payload}`,
    };

    PluginManager.register(plugin);
    await PluginManager.initialize("p2");
    await PluginManager.start("p2");

    const results = await PluginManager.executeHook("before_execute", "hello");
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    expect(results[0].result).toBe("processed:hello");
  });

  it("should stop a plugin", async () => {
    const { PluginManager } = await import("../../src/plugin-architecture/PluginManager");
    let stopCalled = false;

    const plugin: Plugin = {
      manifest: { id: "p3", name: "P3", version: "1.0", description: "", hooks: [] },
      init: () => {},
      stop: () => { stopCalled = true; },
    };

    PluginManager.register(plugin);
    await PluginManager.initialize("p3");
    await PluginManager.start("p3");
    await PluginManager.stop("p3");

    expect(stopCalled).toBe(true);
    const status = PluginManager.getStatus("p3");
    expect(status).toBe("inactive");
  });
});

describe("PluginProvider", () => {
  it("should provide simplified registration", async () => {
    const { PluginProvider } = await import("../../src/plugin-architecture/PluginProvider");

    const ok = PluginProvider.register(
      { id: "simple", name: "Simple", version: "1.0", description: "", hooks: ["on_event"] },
      () => "handled",
    );
    expect(ok).toBe(true);

    await PluginProvider.initialize("simple");
    await PluginProvider.start("simple");

    const results = await PluginProvider.executeHook("on_event", { type: "test" });
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
  });

  it("should initialize without error", async () => {
    const { initializePluginArchitecture } = await import("../../src/plugin-architecture");
    expect(() => initializePluginArchitecture()).not.toThrow();
  });
});
