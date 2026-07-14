import type { ValidationIssue, DoctorReport } from "../types/index.js";

export function logIssue(issue: ValidationIssue): void {
  const tag = issue.severity === "ERROR" ? "✗" : issue.severity === "WARNING" ? "!" : "i";
  const file = issue.file ? ` [${issue.file}]` : "";
  console.log(`  ${tag} ${issue.message}${file}`);
}

export function logReport(issues: ValidationIssue[]): void {
  const errors = issues.filter(i => i.severity === "ERROR").length;
  const warnings = issues.filter(i => i.severity === "WARNING").length;
  const infos = issues.filter(i => i.severity === "INFO").length;
  for (const issue of issues) logIssue(issue);
  console.log(`\n  ${errors} errors, ${warnings} warnings, ${infos} info`);
}

export function printDoctor(report: DoctorReport): void {
  console.log("\n── Doctor Report ──\n");
  console.log(`  Duplicate IDs:          ${report.duplicate_ids.length}`);
  console.log(`  Broken Links:           ${report.broken_links.length}`);
  console.log(`  Dead Documents:         ${report.dead_documents.length}`);
  console.log(`  Unused Assets:          ${report.unused_assets.length}`);
  console.log(`  Circular Dependencies:  ${report.circular_dependencies.length}`);
  console.log(`  Shadowed Assets:        ${report.shadowed_assets.length}`);
  console.log(`  Duplicate Canonical:    ${report.duplicate_canonical_sources.length}`);
  console.log(`\n  Coverage:`);
  console.log(`    Foundation: ${report.coverage.foundation}%`);
  console.log(`    Knowledge:  ${report.coverage.knowledge}%`);
  console.log(`    Prompt:     ${report.coverage.prompt}%`);
  console.log(`    Directive:  ${report.coverage.directive}%`);
  console.log(`    ADR:        ${report.coverage.adr}%`);
  console.log(`\n  Health Score: ${report.health_score}/100`);
}
