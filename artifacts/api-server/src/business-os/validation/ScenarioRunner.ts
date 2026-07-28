import { ScenarioEngine } from "./ScenarioEngine";
import { HealthDashboard } from "./HealthDashboard";
import { DeadChainDetector } from "./DeadChainDetector";
import { ALL_SCENARIOS } from "./scenarios";
import type { ScenarioResult, RuntimeProfile, HealthSummary } from "./types";

export class ScenarioRunner {
  private engine = new ScenarioEngine();
  private dashboard = new HealthDashboard();
  private detector = new DeadChainDetector();
  private results: ScenarioResult[] = [];

  async runAll(): Promise<{
    results: ScenarioResult[];
    health: HealthSummary;
    profile: RuntimeProfile;
    chainReport: string;
  }> {
    console.log(`[ScenarioRunner] Running ${ALL_SCENARIOS.length} business scenarios...`);

    const batchSize = 10;
    for (let i = 0; i < ALL_SCENARIOS.length; i += batchSize) {
      const batch = ALL_SCENARIOS.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(s => this.engine.runScenario(s)));
      this.results.push(...batchResults);
      const done = Math.min(i + batchSize, ALL_SCENARIOS.length);
      console.log(`[ScenarioRunner] ${done}/${ALL_SCENARIOS.length} scenarios complete`);
    }

    const passed = this.results.filter(r => r.passed).length;
    console.log(`[ScenarioRunner] ${passed}/${ALL_SCENARIOS.length} passed (${Math.round(passed/ALL_SCENARIOS.length*100)}%)`);

    const health = this.dashboard.checkHealth();
    health.scenarioPassRate = ALL_SCENARIOS.length > 0 ? passed / ALL_SCENARIOS.length : 0;
    health.totalScenarios = ALL_SCENARIOS.length;
    health.passedScenarios = passed;

    const profile: RuntimeProfile = {
      scenarioId: "all",
      stages: this.engine.getProfiler().getEntries(),
      totalMs: this.engine.getProfiler().getTotalMs(),
    };

    const chainReport = this.detector.formatReport(this.detector.detect());

    return { results: this.results, health, profile, chainReport };
  }

  async runByDomain(domain: string): Promise<ScenarioResult[]> {
    const { getScenariosByDomain } = await import("./scenarios");
    const scenarios = getScenariosByDomain(domain);
    if (scenarios.length === 0) return [];
    const results: ScenarioResult[] = [];
    for (const s of scenarios) {
      results.push(await this.engine.runScenario(s));
    }
    this.results = results;
    return results;
  }

  async runById(ids: string[]): Promise<ScenarioResult[]> {
    const { getScenarioById } = await import("./scenarios");
    const results: ScenarioResult[] = [];
    for (const id of ids) {
      const s = getScenarioById(id);
      if (s) results.push(await this.engine.runScenario(s));
    }
    this.results = results;
    return results;
  }

  getResults(): ScenarioResult[] { return this.results; }
  getEngine(): ScenarioEngine { return this.engine; }
  getDashboard(): HealthDashboard { return this.dashboard; }
  getDetector(): DeadChainDetector { return this.detector; }

  printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const rate = total > 0 ? Math.round(passed / total * 100) : 0;
    const avgDur = total > 0 ? Math.round(this.results.reduce((s, r) => s + r.durationMs, 0) / total) : 0;

    const lines: string[] = [];
    lines.push("┌─────────────────────────────────────────────────────────────┐");
    lines.push("│              BUSINESS OS SCENARIO SUMMARY                  │");
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push(`│  Total: ${String(total).padStart(3)}  Passed: ${String(passed).padStart(3)}  Failed: ${String(total-passed).padStart(3)}  Rate: ${String(rate).padStart(2)}%        │`);
    lines.push(`│  Avg Duration: ${String(avgDur).padStart(6)} ms                                    │`);
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push("│  Results by Domain:                                        │");

    const domains = [...new Set(this.results.map(r => r.scenarioId.split("-")[0]))];
    for (const domain of domains) {
      const domainResults = this.results.filter(r => r.scenarioId.startsWith(domain));
      const domainPassed = domainResults.filter(r => r.passed).length;
      const domainRate = Math.round(domainPassed / domainResults.length * 100);
      const icon = domainRate >= 80 ? "✓" : domainRate >= 50 ? "~" : "✗";
      lines.push(`│  ${icon} ${domain.padEnd(8)} ${String(domainPassed).padStart(2)}/${String(domainResults.length).padStart(2)} (${String(domainRate).padStart(2)}%)                         │`);
    }

    lines.push("├─────────────────────────────────────────────────────────────┤");
    if (this.results.some(r => !r.passed)) {
      lines.push("│  Failed Scenarios:                                         │");
      for (const r of this.results.filter(r => !r.passed)) {
        lines.push(`│  ✗ ${r.scenarioId.padEnd(8)} ${r.scenarioName.padEnd(30)} ${r.error ? r.error.slice(0, 30) : ""} │`);
      }
    }
    lines.push("└─────────────────────────────────────────────────────────────┘");

    console.log(lines.join("\n"));
  }
}
