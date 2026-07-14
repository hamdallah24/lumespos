import { describe, it, expect, vi } from "vitest";

describe("AuditEngine", () => {
  it("should log and retrieve audit entries", async () => {
    const { auditEngine } = await import("../../src/governance/core/AuditEngine");
    auditEngine.log({
      actor: "CEO", action: "approve_budget",
      resource: "budget", result: "allowed",
      reason: "Within limits",
    });
    const recent = auditEngine.getRecent(10);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent[0].actor).toBe("CEO");
  });
});

describe("PermissionEngine", () => {
  it("should check if role can execute action", async () => {
    const { PermissionEngine } = await import("../../src/governance/core/PermissionEngine");
    const result = PermissionEngine.canExecute("CEO", "approve_budget", "budget", 10000000);
    expect(result).toHaveProperty("allow");
    expect(result).toHaveProperty("reason");
  });
});

describe("ApprovalMatrix", () => {
  it("should determine approval level by value", async () => {
    const { ApprovalMatrix } = await import("../../src/governance/core/ApprovalMatrix");
    const level = ApprovalMatrix.getApprovalLevel(500000, "purchase");
    expect(level).toBeDefined();
    expect(typeof level).toBe("string");
  });

  it("should return required approvers for level", async () => {
    const { ApprovalMatrix } = await import("../../src/governance/core/ApprovalMatrix");
    const approvers = ApprovalMatrix.getRequiredApprovers("high");
    expect(Array.isArray(approvers)).toBe(true);
  });
});

describe("GovernanceProvider", () => {
  it("should provide unified canExecute check", async () => {
    const { GovernanceProvider } = await import("../../src/governance/providers/GovernanceProvider");
    const result = GovernanceProvider.canExecute("CEO", "approve_budget", "budget");
    expect(result).toHaveProperty("allow");
    expect(result).toHaveProperty("reason");
  });

  it("should check compliance rules", async () => {
    const { GovernanceProvider } = await import("../../src/governance/providers/GovernanceProvider");
    const result = GovernanceProvider.checkCompliance("CEO", "approve_budget", "budget");
    expect(result).toBeDefined();
  });
});
