// SPRINT 10: Production Readiness — full pipeline verification
// Proves the Engineering OS works before building more agents

import { classifyIntent } from "./intent-classifier";
import { checkCapability } from "./capability-engine";
import { buildGraph, validateGraph } from "./knowledge-graph";
import { knowledgeRepo } from "./knowledge-repository";
import { loadKnowledgeWithContent } from "./knowledge-loader";
import { knowledgeMetrics, collect } from "./knowledge-metrics";
import { buildFoundationContext } from "./context-builder";
import { assembleSystemPrompt } from "./prompt-assembler";
import { health } from "./registry";

interface TestResult { name: string; passed: boolean; detail: string; }
interface TestSuite { suite: string; results: TestResult[]; passed: number; failed: number; }

function pass(name: string, detail = ""): TestResult { return { name, passed: true, detail }; }
function fail(name: string, detail = ""): TestResult { return { name, passed: false, detail }; }

function suite(name: string, results: TestResult[]): TestSuite {
  return { suite: name, results, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length };
}

// ═══════════════════════════════════════════════════════════
// TEST 1: Foundation Loading
// ═══════════════════════════════════════════════════════════
function testFoundation(): TestSuite {
  const results: TestResult[] = [];
  try {
    const graph = buildGraph();
    results.push(pass("KnowledgeGraph.build", `${graph.stats.totalNodes} nodes, ${graph.stats.totalEdges} edges`));
    results.push(graph.nodes.size > 5 ? pass("Foundation node count", `${graph.nodes.size} nodes (expect ≥6)`) : fail("Foundation node count", `Only ${graph.nodes.size} nodes`));

    const validation = validateGraph(graph);
    results.push(validation.passed ? pass("KnowledgeGraph.validate", "No broken refs, orphans, or cycles") : fail("KnowledgeGraph.validate", `${validation.brokenRefs.length} broken refs, ${validation.cycles.length} cycles`));

    // Verify all 7 Foundation docs exist in graph
    const foundationIds = ["north-star-v1", "constitution-v1", "project-context-v1", "op-model-v1", "cto-directive-v1", "foundation-index-v1", "readme-v1"];
    for (const id of foundationIds) {
      results.push(graph.nodes.has(id) ? pass(`Node: ${id}`, "exists") : fail(`Node: ${id}`, "MISSING from graph"));
    }
  } catch (e: any) {
    results.push(fail("Foundation loading", e.message));
  }
  return suite("Foundation Loading", results);
}

// ═══════════════════════════════════════════════════════════
// TEST 2: Knowledge Pipeline
// ═══════════════════════════════════════════════════════════
function testKnowledge(): TestSuite {
  const results: TestResult[] = [];
  try {
    const assets = loadKnowledgeWithContent({ strategy: "always" });
    results.push(assets.length > 0 ? pass("KnowledgeLoader.loadWithContent", `${assets.length} assets loaded`) : fail("KnowledgeLoader", "No assets loaded"));

    const pkg = buildFoundationContext(assets, "cto", 4000);
    results.push(pkg.assets.length > 0 ? pass("ContextBuilder.foundation", `${pkg.assets.length} assets in package`) : fail("ContextBuilder", "Empty package"));
    results.push(pkg.meta.totalAssets > 0 ? pass("Context package has meta", `total: ${pkg.meta.totalAssets}`) : fail("Context package meta", "Missing"));
    results.push(pkg.budget.used > 0 ? pass("Token budget allocated", `${pkg.budget.used}/${pkg.budget.total}`) : fail("Token budget", "Zero allocated"));

    const prompt = assembleSystemPrompt(pkg, "cto");
    results.push(prompt.length > 100 ? pass("PromptAssembler", `${prompt.length} chars prompt`) : fail("PromptAssembler", "Too short"));

    // Cache test: first load builds cache, second load hits it
    loadKnowledgeWithContent({ strategy: "always" }); // warm cache
    const cached = loadKnowledgeWithContent({ strategy: "always" }); // should hit
    results.push(cached.length === assets.length ? pass("Knowledge Cache (repeat load)", "Same result from cache") : fail("Knowledge Cache", `Expected ${assets.length}, got ${cached.length}`));

    const repo = knowledgeRepo.metrics();
    results.push(repo.hitRate > 0 ? pass("Cache hit rate", `${repo.hitRate}%`) : fail("Cache hit rate", "0% after warm+hit — cache may not be working"));
  } catch (e: any) {
    results.push(fail("Knowledge pipeline", e.message));
  }
  return suite("Knowledge Pipeline", results);
}

// ═══════════════════════════════════════════════════════════
// TEST 3: Cognitive Pipeline
// ═══════════════════════════════════════════════════════════
function testCognitive(): TestSuite {
  const results: TestResult[] = [];

  // Greeting → no tools, simple
  const halo = classifyIntent("halo");
  results.push(halo.category === "greeting" ? pass("Intent: halo → greeting") : fail("Intent: halo", `Got ${halo.category}`));
  results.push(!halo.requiresTools ? pass("Intent: greeting requires no tools") : fail("Intent: greeting requires tools?"));

  // DevOps → DEVOPS_TOOLS
  const deploy = classifyIntent("deploy perubahan ke VPS");
  results.push(deploy.category === "devops_operation" ? pass("Intent: deploy → devops") : fail("Intent: deploy", `Got ${deploy.category}`));
  results.push(deploy.suggestedToolSet === "DEVOPS_TOOLS" ? pass("Intent: deploy → DEVOPS") : fail("Intent: deploy toolset", `${deploy.suggestedToolSet}`));

  // Analyze code → READ_TOOLS
  const analyze = classifyIntent("analisis file ai.ts dan temukan semua bug");
  results.push(analyze.category === "analyze_code" ? pass("Intent: analyze → code_analysis") : fail("Intent: analyze", `Got ${analyze.category}`));
  results.push(analyze.suggestedToolSet === "READ_TOOLS" ? pass("Intent: analyze → READ_TOOLS") : fail("Intent: analyze toolset", `${analyze.suggestedToolSet}`));

  // Business → BUSINESS
  const biz = classifyIntent("tambah produk Kopi Susu harga 15000");
  results.push(biz.category === "business_action" ? pass("Intent: add product → business") : fail("Intent: business", `Got ${biz.category}`));

  // Knowledge query → no tools
  const know = classifyIntent("jelaskan arsitektur CTO Agent");
  results.push(know.category === "knowledge_query" ? pass("Intent: explain → knowledge_query") : fail("Intent: knowledge", `Got ${know.category}`));
  results.push(!know.requiresTools ? pass("Intent: knowledge query → no tools") : fail("Intent: knowledge query → tools?"));

  // Capability: verify tools blocked without evidence
  const blindAnalyze = classifyIntent("analisis saja");
  const cap = checkCapability(blindAnalyze);
  results.push(cap.blockedTools.includes("readFile") ? pass("Capability: readFile blocked (no file path)") : fail("Capability: readFile NOT blocked"));

  return suite("Cognitive Pipeline", results);
}

// ═══════════════════════════════════════════════════════════
// TEST 4: Component Health
// ═══════════════════════════════════════════════════════════
function testHealth(): TestSuite {
  const results: TestResult[] = [];
  try {
    const h = health();
    const total = Object.keys(h).length;
    const healthy = Object.entries(h).filter(([, v]: any) => v?.status === "healthy").length;
    const degraded = Object.entries(h).filter(([, v]: any) => v?.status === "degraded").length;
    const unhealthy = Object.entries(h).filter(([, v]: any) => v?.status === "unhealthy").length;

    results.push(total >= 25 ? pass("Component count", `${total} components`) : fail("Component count", `${total} (expect ≥25)`));
    results.push(unhealthy === 0 ? pass("Zero unhealthy", "") : fail("Unhealthy components", `${unhealthy} unhealthy`));
    if (degraded > 0) results.push(pass("Degraded components", `${degraded} degraded (expected: SSH, health checks, etc.)`));
    else results.push(pass("Zero degraded", ""));

    for (const [name, status] of Object.entries(h)) {
      if ((status as any)?.status === "unhealthy") results.push(fail(`Health: ${name}`, "UNHEALTHY"));
    }
  } catch (e: any) {
    results.push(fail("Health check", e.message));
  }
  return suite("Component Health", results);
}

// ═══════════════════════════════════════════════════════════
// TEST 5: Knowledge Metrics
// ═══════════════════════════════════════════════════════════
function testMetrics(): TestSuite {
  const results: TestResult[] = [];
  try {
    const metrics = collect();
    results.push(metrics.coverage.coveragePercent >= 50 ? pass("Knowledge coverage", `${metrics.coverage.coveragePercent}%`) : fail("Knowledge coverage", `${metrics.coverage.coveragePercent}% (expect ≥50%)`));
    results.push(metrics.validation.brokenRefs === 0 ? pass("Zero broken refs", "") : fail("Broken refs", `${metrics.validation.brokenRefs}`));
    results.push(metrics.validation.cycles === 0 ? pass("Zero cycles", "") : fail("Cycles detected", `${metrics.validation.cycles}`));
    results.push(metrics.coverage.totalAssets >= 25 ? pass("Asset count", `${metrics.coverage.totalAssets}`) : fail("Asset count", `${metrics.coverage.totalAssets} (expect ≥25)`));
  } catch (e: any) {
    results.push(fail("Knowledge metrics", e.message));
  }
  return suite("Knowledge Metrics", results);
}

// ═══════════════════════════════════════════════════════════
// TEST 6: Environment
// ═══════════════════════════════════════════════════════════
function testEnvironment(): TestSuite {
  const results: TestResult[] = [];
  results.push(!!process.env.DEEPSEEK_API_KEY ? pass("DeepSeek API key", "set") : fail("DeepSeek API key", "MISSING"));
  results.push(!!process.env.DEEPSEEK_BASE_URL ? pass("DeepSeek base URL", "set") : fail("DeepSeek base URL", "MISSING"));
  return suite("Environment", results);
}

// ═══════════════════════════════════════════════════════════
// Run All
// ═══════════════════════════════════════════════════════════
export function runAll(): { suites: TestSuite[]; total: number; passed: number; failed: number; ready: boolean; report: string } {
  const suites = [
    testEnvironment(),
    testFoundation(),
    testKnowledge(),
    testCognitive(),
    testMetrics(),
    testHealth(),
  ];

  const total = suites.reduce((s, t) => s + t.results.length, 0);
  const passed = suites.reduce((s, t) => s + t.passed, 0);
  const failed = suites.reduce((s, t) => s + t.failed, 0);

  const lines = ["═".repeat(50), "  ENGINEERING OS — PRODUCTION READINESS", "═".repeat(50)];
  for (const s of suites) {
    lines.push(`\n  ${s.suite}: ${s.failed === 0 ? "✅ PASS" : "❌ FAIL"} (${s.passed}/${s.passed + s.failed})`);
    for (const r of s.results) {
      lines.push(`    ${r.passed ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
  }
  lines.push(`\n${"═".repeat(50)}`);
  lines.push(`  TOTAL: ${passed}/${total} passed, ${failed} failed`);
  lines.push(`  CTO Agent v1.0: ${failed === 0 ? "✅ READY FOR PRODUCTION" : "❌ NOT READY — fix failures above"}`);
  lines.push("═".repeat(50));

  console.log(lines.join("\n"));
  return {
    suites,
    total, passed, failed,
    ready: failed === 0,
    report: lines.join("\n"),
  };
}

// Component metadata
export const productionReadiness = {
  name: "ProductionReadiness",
  version: "1.0.0",
  capabilities: ["integration-testing", "production-gating", "pipeline-verification"],
  dependencies: ["All Runtime Components"],
  health: () => {
    const r = runAll();
    return { status: r.ready ? ("healthy" as const) : ("degraded" as const), uptime: 0, dependencies: [], version: "1.0.0", custom: { passed: r.passed, failed: r.failed } };
  },
  test: runAll,
};
