import { SecretManager } from "../../../src/eios-runtime/internal/runtime-security/SecretManager";

describe("SecretManager", () => {
  beforeEach(() => SecretManager.clear());

  test("set and get secret", () => {
    SecretManager.set("api-key", "sk-123456");
    expect(SecretManager.get("api-key")).toBe("sk-123456");
  });

  test("get returns null for unknown secret", () => {
    expect(SecretManager.get("nonexistent")).toBeNull();
  });

  test("get returns null for expired secret", () => {
    SecretManager.set("temp", "value", -1);
    expect(SecretManager.get("temp")).toBeNull();
  });

  test("rotate updates secret value", () => {
    SecretManager.set("key", "old");
    SecretManager.rotate("key", "new");
    expect(SecretManager.get("key")).toBe("new");
  });

  test("revoke removes secret", () => {
    SecretManager.set("key", "value");
    SecretManager.revoke("key");
    expect(SecretManager.get("key")).toBeNull();
  });

  test("getAccessLog records access", () => {
    SecretManager.set("key", "val");
    SecretManager.get("key");
    expect(SecretManager.getAccessLog().length).toBeGreaterThanOrEqual(1);
  });
});
