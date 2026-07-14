import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { globSync } from "glob";
import { paths } from "../utils/paths.js";
import type { CompiledAsset } from "../types/index.js";

export async function runDiff(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: dgps diff <asset-id>");
    console.error("Example: dgps diff ceo-directive");
    process.exit(1);
  }

  const assetId = args[0];
  const { aiGenerated, aiRegistry } = paths();

  // Get current asset
  const genFiles = globSync(`**/${assetId}.*.json`, { cwd: aiGenerated, nodir: true });
  if (genFiles.length === 0) {
    console.error(`Asset "${assetId}" not found in .ai/generated/`);
    console.error("Run `dgps publish` first.");
    process.exit(1);
  }

  const currentPath = resolve(aiGenerated, genFiles[0]);
  const current = JSON.parse(readFileSync(currentPath, "utf-8")) as CompiledAsset;

  console.log(`\n── DGPS Diff: ${assetId} ──\n`);
  console.log(`  Current Version: ${current.metadata.version}`);
  console.log(`  Current Checksum: ${current.metadata.checksum}`);
  console.log(`  Compiled At: ${current.metadata.compiled_at}\n`);

  // No previous version for comparison in current implementation
  // In future: load from .ai/history/ or git diff
  console.log("  (No previous version stored for comparison)");
  console.log("  Future: history will be stored in .ai/history/\n");

  // Source files
  console.log(`  Source Documents (${current.metadata.source_paths.length}):`);
  for (const sp of current.metadata.source_paths) {
    const exists = existsSync(sp) ? "✓" : "✗";
    console.log(`    ${exists} ${sp}`);
  }

  // Structure summary
  const structKeys = Object.keys(current.structure || {});
  console.log(`\n  Structure Sections: ${structKeys.join(", ")}`);

  // Prompt AST layers
  const prompt = current.structure?.prompt as Record<string, unknown> | undefined;
  if (prompt?.ast) {
    const layers = Object.keys(prompt).filter(k => k !== "ast" && k !== "schema_version");
    console.log(`  Prompt AST Layers: ${layers.length}`);
  }

  // Workflow nodes
  const workflow = current.structure?.workflow as Record<string, unknown> | undefined;
  if (workflow?.nodes) {
    const nodes = workflow.nodes as string[];
    console.log(`  Workflow Nodes: ${nodes.length} (${nodes.join(" → ")})`);
  }

  // Capabilities
  const caps = current.structure?.capabilities as unknown[] | undefined;
  if (caps) console.log(`  Capabilities: ${caps.length}`);

  // Registry info
  const registryPath = resolve(aiRegistry, "manifest.json");
  if (existsSync(registryPath)) {
    try {
      const manifest = JSON.parse(readFileSync(registryPath, "utf-8"));
      console.log(`\n  Registry Build: ${manifest.build_id}`);
      console.log(`  Registry Hash: ${manifest.registry_hash}`);
    } catch { /* skip */ }
  }
}
