import { ScenarioRunner } from "./ScenarioRunner";
import { HealthDashboard } from "./HealthDashboard";
import { DeadChainDetector } from "./DeadChainDetector";
import { RuntimeProfiler } from "./RuntimeProfiler";

let verifierInitialized = false;

export async function runBootVerification(): Promise<{
  passed: boolean;
  summary: string;
}> {
  const profiler = new RuntimeProfiler();
  console.log("");
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│              BUSINESS OS BOOT VERIFICATION                 │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  profiler.start("Chain Detection");
  const detector = new DeadChainDetector();
  const chainReport = detector.detect();
  profiler.end("Chain Detection");

  console.log(detector.formatReport(chainReport));

  if (chainReport.deadModules.length > 0) {
    const msg = `FATAL: ${chainReport.deadModules.length} dead module(s) detected`;
    console.log(`  ✗ ${msg}`);
    return { passed: false, summary: msg };
  }

  if (chainReport.brokenChains.length > 0) {
    const msg = `FATAL: ${chainReport.brokenChains.length} broken integration chain(s)`;
    console.log(`  ✗ ${msg}`);
    return { passed: false, summary: msg };
  }

  console.log("  ✓ All modules connected, all chains intact");

  profiler.start("Health Check");
  const dashboard = new HealthDashboard();
  const health = dashboard.checkHealth();
  profiler.end("Health Check");

  console.log("");
  console.log(dashboard.formatDashboard(health));

  if (health.overall < 80) {
    const msg = `Health too low: ${health.overall}%`;
    console.log(`  ✗ ${msg}`);
    return { passed: false, summary: msg };
  }

  profiler.start("Scenario Run");
  const runner = new ScenarioRunner();
  const { results } = await runner.runAll();
  profiler.end("Scenario Run");

  runner.printSummary();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? passed / total : 0;

  if (passRate < 0.8) {
    const msg = `Scenario pass rate too low: ${Math.round(passRate * 100)}% (${passed}/${total})`;
    console.log(`  ✗ ${msg}`);
    return { passed: false, summary: msg };
  }

  console.log("");
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│              BUSINESS OS VERIFICATION PASSED               │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  Modules: ${chainReport.overallPercent}% connected                             │`);
  console.log(`│  Health:  ${health.overall}% healthy                                │`);
  console.log(`│  Scenarios: ${String(passed)}/${String(total)} (${Math.round(passRate*100)}%) passed                         │`);
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log("");

  verifierInitialized = true;
  return { passed: true, summary: `Verification passed: ${chainReport.overallPercent}% modules, ${health.overall}% health, ${Math.round(passRate*100)}% scenarios` };
}

export function isVerifierInitialized(): boolean {
  return verifierInitialized;
}
