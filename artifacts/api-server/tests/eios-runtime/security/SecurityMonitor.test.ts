import { SecurityMonitor } from "../../../src/eios-runtime/internal/runtime-security/SecurityMonitor";

describe("SecurityMonitor", () => {
  beforeEach(() => SecurityMonitor.clear());

  test("report creates security event", () => {
    SecurityMonitor.report("PERMISSION_DENIED", "user1", "missing admin", "high");
    expect(SecurityMonitor.getEvents().length).toBe(1);
  });

  test("detectBruteForce returns false below threshold", () => {
    SecurityMonitor.report("PERMISSION_DENIED", "user2", "denied", "low");
    expect(SecurityMonitor.detectBruteForce("user2")).toBe(false);
  });

  test("detectBruteForce returns true after 3 denied", () => {
    for (let i = 0; i < 3; i++) {
      SecurityMonitor.report("PERMISSION_DENIED", "user3", "denied", "medium");
    }
    expect(SecurityMonitor.detectBruteForce("user3")).toBe(true);
  });

  test("getEvents returns all events", () => {
    SecurityMonitor.report("TOKEN_FORGERY", "attacker", "bad sig", "critical");
    expect(SecurityMonitor.getEvents().length).toBe(1);
  });

  test("increments count for same key", () => {
    for (let i = 0; i < 5; i++) SecurityMonitor.report("PERMISSION_DENIED", "spammer", "fail", "medium");
    const events = SecurityMonitor.getEvents();
    expect(events[0].count).toBe(5);
  });
});
