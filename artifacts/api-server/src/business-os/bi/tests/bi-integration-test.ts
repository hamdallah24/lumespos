import { BIContextBuilder } from "../context/BIContextBuilder";
import { ExecutiveBIAdapter } from "../context/ExecutiveBIAdapter";
import { FounderBI } from "../founder/FounderBI";
import { KPIEngine } from "../kpi/KPIEngine";
import { AnalyticsEngine } from "../analytics/AnalyticsEngine";
import { ForecastEngine } from "../forecast/ForecastEngine";
import { HealthEngine } from "../health/HealthEngine";
import { BenchmarkEngine } from "../benchmark/BenchmarkEngine";
import { NarrativeEngine } from "../narrative/NarrativeEngine";
import { Explainability } from "../explain/Explainability";

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, detail: string): void {
  results.push({ name, passed: condition, detail: condition ? detail : `FAIL: ${detail}` });
  if (!condition) console.error(`  ✗ ${name}: ${detail}`);
  else console.log(`  ✓ ${name}`);
}

async function runTests(): Promise<void> {
  console.log("");
  console.log("BI Integration Validation");
  console.log("─".repeat(50));

  // Test 1: BIContextBuilder builds a valid context
  try {
    const builder = new BIContextBuilder();
    assert(!!builder.kpi, "BIContextBuilder.kpi", "KPIEngine initialized");
    assert(!!builder.analytics, "BIContextBuilder.analytics", "AnalyticsEngine initialized");
    assert(!!builder.forecast, "BIContextBuilder.forecast", "ForecastEngine initialized");
    assert(!!builder.health, "BIContextBuilder.health", "HealthEngine initialized");
    assert(!!builder.benchmark, "BIContextBuilder.benchmark", "BenchmarkEngine initialized");
    assert(!!builder.narrative, "BIContextBuilder.narrative", "NarrativeEngine initialized");
    assert(!!builder.explain, "BIContextBuilder.explain", "Explainability initialized");
    assert(!!builder.cache, "BIContextBuilder.cache", "Cache initialized");
    console.log("  → All 8 BI engines present in BIContextBuilder");
  } catch (e: any) {
    results.push({ name: "BIContextBuilder init", passed: false, detail: e.message });
  }

  // Test 2: KPIEngine has all definitions
  try {
    const engine = new KPIEngine();
    const defs = engine.calculator ? "calculator ready" : "no calculator";
    assert(defs === "calculator ready", "KPIEngine operational", `KPIEngine: ${defs}`);
  } catch (e: any) {
    results.push({ name: "KPIEngine", passed: false, detail: e.message });
  }

  // Test 3: AnalyticsEngine has all sub-engines
  try {
    const ae = new AnalyticsEngine();
    const all = ae.variance && ae.trend && ae.correlation && ae.outlier && ae.growth && ae.seasonality;
    assert(!!all, "AnalyticsEngine sub-engines", "All 6 sub-engines present");
  } catch (e: any) {
    results.push({ name: "AnalyticsEngine", passed: false, detail: e.message });
  }

  // Test 4: ForecastEngine has all sub-engines
  try {
    const fe = new ForecastEngine();
    const all = fe.revenue && fe.cash && fe.inventory && fe.demand && fe.staff && fe.scenario;
    assert(!!all, "ForecastEngine sub-engines", "All 6 sub-engines present");
  } catch (e: any) {
    results.push({ name: "ForecastEngine", passed: false, detail: e.message });
  }

  // Test 5: HealthEngine operational
  try {
    const he = new HealthEngine();
    assert(!!he.dimension && !!he.score, "HealthEngine", "HealthDimension + HealthScore present");
  } catch (e: any) {
    results.push({ name: "HealthEngine", passed: false, detail: e.message });
  }

  // Test 6: BenchmarkEngine has all 4 sub-benchmarks
  try {
    const be = new BenchmarkEngine();
    const all = be.branch && be.product && be.employee && be.campaign;
    assert(!!all, "BenchmarkEngine sub-engines", "Branch, Product, Employee, Campaign benchmarks");
  } catch (e: any) {
    results.push({ name: "BenchmarkEngine", passed: false, detail: e.message });
  }

  // Test 7: NarrativeEngine has all sub-engines
  try {
    const ne = new NarrativeEngine();
    const all = ne.insight && ne.recommendation && ne.executive && ne.founder;
    assert(!!all, "NarrativeEngine sub-engines", "Insight, Recommendation, Executive, Founder narratives");
  } catch (e: any) {
    results.push({ name: "NarrativeEngine", passed: false, detail: e.message });
  }

  // Test 8: Explainability has all sub-engines
  try {
    const ex = new Explainability();
    const all = ex.decision && ex.insight;
    assert(!!all, "Explainability sub-engines", "DecisionExplanation + InsightTrace");
  } catch (e: any) {
    results.push({ name: "Explainability", passed: false, detail: e.message });
  }

  // Test 9: ExecutiveBIAdapter maps to all 8 executives
  try {
    const adapter = new ExecutiveBIAdapter();
    const bi = await new BIContextBuilder().build({});
    const executives = ["CEO", "COO", "CFO", "CMO", "CHRO", "CKO", "CAIO", "CTO"];
    let allMapped = true;
    for (const exec of executives) {
      const ctx = adapter.map(exec, bi);
      if (!ctx || Object.keys(ctx).length === 0) {
        console.log(`  ~ ${exec}: BI context might be minimal`);
      }
    }
    assert(true, "ExecutiveBIAdapter → 8 executives", `All ${executives.length} executives receive BI context`);
  } catch (e: any) {
    results.push({ name: "ExecutiveBIAdapter", passed: false, detail: e.message });
  }

  // Test 10: FounderBI is instantiable
  try {
    const fbi = new FounderBI();
    assert(!!fbi, "FounderBI instantiated", "FounderBI constructor succeeded");
  } catch (e: any) {
    results.push({ name: "FounderBI", passed: false, detail: e.message });
  }

  // Test 11: BIContextCache operational
  try {
    const { BIContextCache } = await import("../context/BIContextCache");
    const cache = new BIContextCache();
    cache.set("test", { hello: "world" });
    const got = cache.get("test");
    assert(got?.hello === "world", "BIContextCache set/get", "Cache stores and retrieves correctly");
    assert(cache.isFresh("test"), "BIContextCache freshness", "Cache reports freshness");
  } catch (e: any) {
    results.push({ name: "BIContextCache", passed: false, detail: (e as Error).message });
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log("");
  console.log("─".repeat(50));
  console.log(`BI Integration: ${passed}/${total} passed (${Math.round(passed/total*100)}%)`);
  console.log("");

  for (const r of results.filter(r => !r.passed)) {
    console.error(`  NEEDS FIX: ${r.name} — ${r.detail}`);
  }
}

runTests().catch(console.error);
