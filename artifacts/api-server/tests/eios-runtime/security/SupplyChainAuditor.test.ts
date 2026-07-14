import { SupplyChainAuditor } from "../../../src/eios-runtime/internal/runtime-security/SupplyChainAuditor";

describe("SupplyChainAuditor", () => {
  test("checkDependency flags * version", () => {
    const results = SupplyChainAuditor.checkDependency("lodash", "*");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test("checkDependency flags range version", () => {
    const results = SupplyChainAuditor.checkDependency("express", "^4.18.0");
    const rangeIssue = results.find(r => r.description.includes("Range"));
    expect(rangeIssue).toBeTruthy();
  });

  test("checkDependency flags 0.0.0 version", () => {
    const results = SupplyChainAuditor.checkDependency("lib", "0.0.0");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test("auditDependencies scans all deps", () => {
    const results = SupplyChainAuditor.auditDependencies({ "safe": "1.2.3", "unsafe": "*" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    const unsafeResult = results.find(r => r.name === "unsafe");
    expect(unsafeResult).toBeTruthy();
  });
});
