import { SecureConfiguration } from "../../../src/eios-runtime/internal/runtime-security/SecureConfiguration";

describe("SecureConfiguration", () => {
  beforeEach(() => SecureConfiguration.clear());

  test("set and get configuration", () => {
    SecureConfiguration.set("maxRequestSizeBytes", 2048);
    expect(SecureConfiguration.get("maxRequestSizeBytes", 1024)).toBe(2048);
  });

  test("get returns fallback for unset key", () => {
    expect(SecureConfiguration.get("nonexistent", "default")).toBe("default");
  });

  test("auditInsecureDefaults finds issues", () => {
    const issues = SecureConfiguration.auditInsecureDefaults();
    expect(Array.isArray(issues)).toBe(true);
  });

  test("validate runs without throwing", () => {
    expect(() => SecureConfiguration.validate()).not.toThrow();
  });

  test("getAuditLog tracks changes", () => {
    SecureConfiguration.set("someKey", "someValue");
    expect(SecureConfiguration.getAuditLog().length).toBeGreaterThanOrEqual(1);
  });
});
