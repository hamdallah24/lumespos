import { AuditTrail } from "../../../src/eios-runtime/internal/runtime-security/AuditTrail";

describe("AuditTrail", () => {
  beforeEach(() => AuditTrail.clear());

  test("record creates entry", () => {
    AuditTrail.record("PERMISSION_DENIED", "test-user", "access denied");
    expect(AuditTrail.count()).toBe(1);
  });

  test("query filters by action", () => {
    AuditTrail.record("TOKEN_ISSUED", "user1", "issued token");
    AuditTrail.record("PERMISSION_DENIED", "user1", "denied");
    const results = AuditTrail.query({ action: "PERMISSION_DENIED" });
    expect(results.length).toBe(1);
    expect(results[0].action).toBe("PERMISSION_DENIED");
  });

  test("query without filter returns all", () => {
    AuditTrail.record("BOOTSTRAP_STARTED", "system", "starting");
    AuditTrail.record("BOOTSTRAP_COMPLETED", "system", "done");
    expect(AuditTrail.query().length).toBe(2);
  });

  test("record includes ID and timestamp", () => {
    AuditTrail.record("SECURITY_EVENT", "scanner", "found issue");
    const entries = AuditTrail.query();
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].timestamp).toBeTruthy();
  });
});
