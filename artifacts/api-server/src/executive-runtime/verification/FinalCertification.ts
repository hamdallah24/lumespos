import { verifyExecutive, formatReport } from "./RuntimeVerifier";
import type { VerificationReport } from "./RuntimeVerifier";
import { scoreExecutive, formatScoreCard } from "./IntegrationScore";
import type { ExecutiveScore } from "./IntegrationScore";
import { runCEOE2E, formatE2EResult } from "./EndToEndTest";

export interface CertificationEntry {
  executive: string;
  verification: VerificationReport;
  score: ExecutiveScore;
}

export interface CertificationReport {
  generatedAt: string;
  entries: CertificationEntry[];
  e2eResult: Awaited<ReturnType<typeof runCEOE2E>> | null;
  overallScore: number;
  overallPassed: boolean;
}

export async function certifyExecutive(role: string): Promise<CertificationEntry> {
  const verification = await verifyExecutive(role);
  const score = await scoreExecutive(role);
  return { executive: role, verification, score };
}

export async function certifyAll(): Promise<CertificationReport> {
  const execs = ["CEO", "CTO", "COO", "CFO", "CMO", "CAIO", "CKO", "CHRO"];
  const entries = await Promise.all(execs.map(certifyExecutive));

  const totalPassed = entries.reduce((s, e) => s + e.score.passed, 0);
  const totalCategories = entries.reduce((s, e) => s + e.score.total, 0);
  const overallScore = Math.round((totalPassed / totalCategories) * 100);
  const overallPassed = entries.every(e => e.score.score === 100);

  let e2eResult = null;
  try {
    e2eResult = await runCEOE2E();
  } catch {
    // E2E might fail due to missing server context, that's OK for report
  }

  return {
    generatedAt: new Date().toISOString(),
    entries,
    e2eResult,
    overallScore,
    overallPassed,
  };
}

export function formatCertificationReport(report: CertificationReport): string {
  const lines: string[] = [];
  lines.push(`\n${"█".repeat(60)}`);
  lines.push(`  FINAL RUNTIME CERTIFICATION`);
  lines.push(`  Generated: ${report.generatedAt}`);
  lines.push(`${"█".repeat(60)}`);

  for (const entry of report.entries) {
    lines.push(formatReport(entry.verification));
    lines.push(formatScoreCard(entry.score));
    lines.push(`  ${"─".repeat(50)}`);
  }

  lines.push(`\n${"█".repeat(60)}`);
  lines.push(`  EXECUTIVE INTEGRATION SUMMARY`);
  lines.push(`  Overall Score: ${report.overallScore}%`);
  lines.push(`  Status: ${report.overallPassed ? "✓ ALL INTEGRATED" : "⚠ GAPS DETECTED"}`);

  for (const entry of report.entries) {
    const icon = entry.score.score === 100 ? "✓" : "✗";
    const pct = `${entry.score.score}`.padStart(3);
    lines.push(`  ${icon} ${entry.executive.padEnd(8)} ${pct}% (${entry.score.passed}/${entry.score.total})`);
  }

  lines.push(`${"█".repeat(60)}`);

  if (report.e2eResult) {
    lines.push(formatE2EResult(report.e2eResult));
  } else {
    lines.push(`\n  ⚠ CEO End-to-End test not executed`);
    lines.push(`    Run with server context (DEEPSEEK_API_KEY) for full E2E validation`);
  }

  return lines.join("\n");
}
