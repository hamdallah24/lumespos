import { PermissionTokenManager } from "../../../src/eios-runtime/internal/runtime-security/PermissionTokenManager";
import type { ComponentId } from "../../../src/eios-runtime/contracts/ComponentId";

const pluginId: ComponentId = { type: "plugin", namespace: "eios.core", name: "test-plugin", version: { major: 1, minor: 0, patch: 0 } };

describe("PermissionTokenManager", () => {
  test("issue creates valid token", () => {
    const token = PermissionTokenManager.issue(pluginId, ["read_context"]);
    expect(token.pluginId.name).toBe("test-plugin");
    expect(token.capabilities).toEqual(["read_context"]);
    expect(token.signature).toBeTruthy();
  });

  test("verify returns true for valid token", () => {
    const token = PermissionTokenManager.issue(pluginId, ["emit_event"]);
    expect(PermissionTokenManager.verify(token)).toBe(true);
  });

  test("verify returns false for expired token", () => {
    const token = PermissionTokenManager.issue(pluginId, ["read_context"], -1000);
    expect(PermissionTokenManager.verify(token)).toBe(false);
  });

  test("hasCapability checks capability", () => {
    const token = PermissionTokenManager.issue(pluginId, ["execute_pipeline", "read_context"]);
    expect(PermissionTokenManager.hasCapability(token, "execute_pipeline")).toBe(true);
    expect(PermissionTokenManager.hasCapability(token, "delete_all")).toBe(false);
  });
});
