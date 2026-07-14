import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { globSync } from "glob";
import { paths } from "../utils/paths.js";
import type { CompiledAsset } from "../types/index.js";

export async function runInspect(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: dgps inspect <asset-id>");
    console.error("Example: dgps inspect ceo-directive");
    process.exit(1);
  }

  const assetId = args[0];
  const { aiGenerated, aiRegistry } = paths();

  // Find generated asset
  const genFiles = globSync(`**/${assetId}.*.json`, { cwd: aiGenerated, nodir: true });
  if (genFiles.length === 0) {
    console.error(`Asset "${assetId}" not found in .ai/generated/`);
    process.exit(1);
  }

  const assetPath = resolve(aiGenerated, genFiles[0]);
  const asset = JSON.parse(readFileSync(assetPath, "utf-8")) as CompiledAsset;

  console.log(`\n══ DGPS Inspect: ${assetId} ══\n`);

  // Header info
  console.log(`  Asset Type:       ${asset.asset_type}`);
  console.log(`  Title:            ${asset.metadata.title}`);
  console.log(`  Version:          ${asset.metadata.version}`);
  console.log(`  Owner:            ${asset.metadata.owner}`);
  console.log(`  Knowledge Level:  ${asset.metadata.knowledge_level}`);
  console.log(`  Status:           ${asset.metadata.status}`);
  console.log(`  Canonical:        ${asset.canonical}`);

  // Runtime focus
  console.log(`\n── Runtime Info ──\n`);
  console.log(`  Consumers:`);
  for (const cons of asset.metadata.consumer) {
    console.log(`    → ${cons}`);
  }

  // Registry check
  const registryPath = resolve(aiRegistry, `${asset.asset_type}.json`);
  if (existsSync(registryPath)) {
    const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    const entry = registry.assets?.[assetId];
    if (entry) {
      console.log(`\n── Registry ──\n`);
      console.log(`  Artifact:     ${entry.artifact}`);
      console.log(`  Version:      ${entry.version}`);
      console.log(`  Checksum:     ${entry.checksum}`);
    }
  }

  // Dependencies
  if (asset.metadata.dependencies.length > 0) {
    console.log(`\n── Dependencies ──\n`);
    for (const dep of asset.metadata.dependencies) {
      const depPath = resolve(aiGenerated, "foundation", `${dep}.json`);
      const exists = existsSync(depPath) ? "✓" : "✗";
      console.log(`  ${exists} ${dep}`);
    }
  }

  // Knowledge Fingerprint
  const kf = (asset.structure as Record<string, unknown>)?.knowledge_fingerprint as Record<string, unknown> | undefined;
  if (kf) {
    console.log(`\n── Knowledge Fingerprint ──\n`);
    for (const [key, val] of Object.entries(kf)) {
      const valStr = Array.isArray(val) ? val.join(", ") : String(val);
      console.log(`  ${key}: ${valStr}`);
    }
  }

  // Prompt AST summary
  const prompt = asset.structure?.prompt as Record<string, unknown> | undefined;
  if (prompt && prompt.ast) {
    const layers = Object.keys(prompt).filter(k => k !== "ast" && k !== "schema_version");
    console.log(`\n── Prompt AST ──\n`);
    console.log(`  Layers: ${layers.length}`);
    for (const layer of layers) {
      const layerObj = prompt[layer] as { role?: string; priority?: number; content?: string } | undefined;
      const len = layerObj?.content?.length || 0;
      console.log(`  ${layer.padEnd(20)} role=${layerObj?.role || "system"}, ${len} chars`);
    }
  }

  // Workflow graph
  const workflow = asset.structure?.workflow as Record<string, unknown> | undefined;
  if (workflow?.nodes) {
    const nodes = workflow.nodes as string[];
    const edges = workflow.edges as Array<{ from: string; to: string }> | undefined;
    console.log(`\n── Workflow Graph ──\n`);
    console.log(`  Nodes: ${nodes.join(" → ")}`);
    if (edges) {
      for (const e of edges) {
        console.log(`  Edge: ${e.from} → ${e.to}`);
      }
    }
  }

  // Integrity
  console.log(`\n── Integrity ──\n`);
  console.log(`  Checksum:         ${asset.metadata.checksum}`);
  console.log(`  Source Hash:      ${asset.metadata.source_hash}`);
  console.log(`  Compiled At:      ${asset.metadata.compiled_at}`);
  console.log(`  Compiler:         ${asset.traceability.compiled_by} v${asset.traceability.compiler_version}`);

  // Source files
  console.log(`\n── Sources ──\n`);
  for (const sp of asset.metadata.source_paths) {
    const size = existsSync(sp) ? `${(readFileSync(sp).length / 1024).toFixed(1)} KB` : "FILE NOT FOUND";
    console.log(`  ${sp}`);
    console.log(`    (${size})`);
  }
}
