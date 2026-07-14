import { scanDocuments } from "../scanner/scanner.js";
import { validateDocuments } from "../validator/validator.js";
import { buildDependencyGraph } from "../compiler/graph.js";
import { compileDirectives } from "../compiler/directive-compiler.js";
import { compileFoundation } from "../compiler/foundation-compiler.js";
import { compileKnowledge } from "../compiler/knowledge-compiler.js";
import { compilePrompts } from "../compiler/prompt-compiler.js";
import { compileAdrs } from "../compiler/adr-compiler.js";
import { generateRegistries, writeRegistries } from "../registry/generator.js";
import { runDoctor } from "./doctor.js";
import { logReport } from "../utils/display.js";
import { ensureDir, writeGeneratedAssets } from "../utils/assets.js";
import { paths } from "../utils/paths.js";

export async function runPublish(_args: string[]): Promise<void> {
  const start = Date.now();
  console.log("[DGPS] === Publish Pipeline ===");

  // 1. SCAN
  console.log("\n[1/8] Scanning docs/...");
  const sources = scanDocuments();

  // 2. VALIDATE
  console.log("\n[2/8] Validating...");
  const report = validateDocuments(sources);
  logReport(report.issues);
  if (!report.passed) {
    console.log("\n❌ Validation failed. Aborting publish.");
    process.exit(1);
  }

  // 3. DEPENDENCY GRAPH
  console.log("\n[3/8] Building dependency graph...");
  const depGraph = buildDependencyGraph(sources);
  console.log(`  ${Object.keys(depGraph.nodes).length} nodes, ${depGraph.edges.length} edges`);

  // 4. COMPILE
  console.log("\n[4/8] Compiling...");
  const directives = compileDirectives(sources);
  const foundations = compileFoundation(sources);
  const knowledges = compileKnowledge(sources);
  const prompts = compilePrompts(sources);
  const adrs = compileAdrs(sources);
  const allAssets = [...directives, ...foundations, ...knowledges, ...prompts, ...adrs];
  console.log(`  ${allAssets.length} assets compiled`);

  // Write generated
  const p = paths();
  ensureDir(p.aiGeneratedExecutive);
  ensureDir(p.aiGeneratedFoundation);
  ensureDir(p.aiGeneratedKnowledge);
  ensureDir(p.aiGeneratedPrompt);
  ensureDir(p.aiGeneratedAdr);
  ensureDir(p.aiGeneratedGraphs);

  writeGeneratedAssets(p.aiGeneratedExecutive, directives, "directive");
  writeGeneratedAssets(p.aiGeneratedFoundation, foundations, "json");
  writeGeneratedAssets(p.aiGeneratedKnowledge, knowledges, "json");
  writeGeneratedAssets(p.aiGeneratedPrompt, prompts, "json");
  writeGeneratedAssets(p.aiGeneratedAdr, adrs, "json");

  // 5. REGISTRY
  console.log("\n[5/8] Generating registries...");
  const { registries, manifest, lock } = generateRegistries(allAssets, depGraph);
  writeRegistries(registries, manifest, lock, depGraph);

  // 6. VERIFY
  console.log("\n[6/8] Verifying...");
  const verifyErrors = verifyAssets(allAssets, registries, manifest);
  if (verifyErrors > 0) {
    console.log(`  ${verifyErrors} verification errors`);
    process.exit(1);
  }
  console.log("  All assets verified ✓");

  // 7. DOCTOR
  console.log("\n[7/8] Doctor...");
  await runDoctor([]);

  // 8. SUMMARY
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n[DGPS] === Publish Complete in ${elapsed}s ===`);
  console.log(`  Build ID: ${manifest.build_id}`);
  console.log(`  Total Assets: ${manifest.total_assets}`);
  console.log(`  Registry Hash: ${manifest.registry_hash}`);
}

function verifyAssets(
  assets: ReturnType<typeof compileDirectives>,
  registries: Record<string, { assets: Record<string, unknown> }>,
  _manifest: unknown,
): number {
  let errors = 0;
  const allRegistryEntries = { ...registries.executive.assets, ...registries.foundation.assets, ...registries.knowledge.assets, ...registries.prompt.assets, ...registries.adr.assets };

  for (const asset of assets) {
    const regEntry = allRegistryEntries[asset.id];
    if (!regEntry) {
      console.warn(`  Asset ${asset.id} not in registry`);
      errors++;
      continue;
    }
    if (asset.metadata.checksum !== (regEntry as { checksum: string }).checksum) {
      console.warn(`  Checksum mismatch for ${asset.id}`);
      errors++;
    }
  }

  return errors;
}
