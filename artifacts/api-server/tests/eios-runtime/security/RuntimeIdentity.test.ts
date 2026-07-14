import { RuntimeIdentity } from "../../../src/eios-runtime/internal/runtime-security/RuntimeIdentity";

describe("RuntimeIdentity", () => {
  test("getRuntimeId returns a non-empty string", () => {
    expect(RuntimeIdentity.getRuntimeId()).toBeTruthy();
  });

  test("createIdentity returns proper Identity object", () => {
    const identity = RuntimeIdentity.createIdentity("plugin", "test-plugin");
    expect(identity.id).toContain("plugin-");
    expect(identity.type).toBe("plugin");
    expect(identity.name).toBe("test-plugin");
    expect(identity.issuedAt).toBeTruthy();
  });

  test("verifyIdentity rejects expired identity", () => {
    const expired = { id: "plugin-old", type: "plugin" as const, name: "old", issuedAt: new Date(Date.now() - 90000000).toISOString() };
    expect(RuntimeIdentity.verifyIdentity(expired)).toBe(false);
  });

  test("verifyIdentity accepts fresh identity", () => {
    const fresh = RuntimeIdentity.createIdentity("executive", "ceo");
    expect(RuntimeIdentity.verifyIdentity(fresh)).toBe(true);
  });
});
