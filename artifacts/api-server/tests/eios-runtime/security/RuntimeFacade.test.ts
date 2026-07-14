import { createRuntimeFacade } from "../../../src/eios-runtime/internal/runtime-security/RuntimeFacade";
import { Authorization } from "../../../src/eios-runtime/internal/runtime-security/Authorization";
import { RegistryLifecycle } from "../../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle";
import type { ComponentId } from "../../../src/eios-runtime/contracts/ComponentId";

const pluginId: ComponentId = { type: "plugin", namespace: "eios.core", name: "test-plugin", version: { major: 1, minor: 0, patch: 0 } };

describe("RuntimeFacade", () => {
  beforeEach(() => {
    Authorization.clear();
    RegistryLifecycle.reset();
    RegistryLifecycle.transition("REGISTERING");
    RegistryLifecycle.transition("VALIDATING");
    RegistryLifecycle.transition("FROZEN");
  });

  test("createRuntimeFacade returns facade with all methods", () => {
    const facade = createRuntimeFacade(pluginId);
    expect(facade).toHaveProperty("execute");
    expect(facade).toHaveProperty("subscribe");
    expect(facade).toHaveProperty("capability");
    expect(facade).toHaveProperty("emit");
    expect(facade).toHaveProperty("context");
  });

  test("execute throws without permission", async () => {
    const facade = createRuntimeFacade(pluginId);
    await expect(facade.execute("test")).rejects.toThrow("Permission denied");
  });

  test("execute succeeds with permission", async () => {
    Authorization.grant("plugin:test-plugin", "execute_pipeline");
    const facade = createRuntimeFacade(pluginId);
    const result = await facade.execute("test");
    expect(result).toBeDefined();
  });
});
