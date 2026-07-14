import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { globSync } from "glob";
import { paths } from "../utils/paths.js";
import { scanDocuments } from "../scanner/scanner.js";
import type { CompiledAsset } from "../types/index.js";

export async function runExplain(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: dgps explain <asset-id>");
    console.error("Example: dgps explain ceo-directive");
    process.exit(1);
  }

  const assetId = args[0];
  const { aiGenerated, aiRegistry } = paths();

  // Find the generated asset
  const genFiles = globSync(`**/${assetId}.*.json`, { cwd: aiGenerated, nodir: true });
  if (genFiles.length === 0) {
    console.error(`Asset "${assetId}" not found in .ai/generated/`);
    console.error("Run `dgps publish` first.");
    process.exit(1);
  }

  const assetPath = resolve(aiGenerated, genFiles[0]);
  const asset = JSON.parse(readFileSync(assetPath, "utf-8")) as CompiledAsset;

  console.log(`\n── DGPS Explain: ${assetId} ──\n`);
  console.log(`  Asset Type:   ${asset.asset_type}`);
  console.log(`  Title:        ${asset.metadata.title}`);
  console.log(`  Version:      ${asset.metadata.version}`);
  console.log(`  Owner:        ${asset.metadata.owner}`);
  console.log(`  Consumers:    ${asset.metadata.consumer.join(", ")}`);
  console.log(`  Status:       ${asset.metadata.status}`);
  console.log(`  Checksum:     ${asset.metadata.checksum}`);
  console.log(`  Compiled At:  ${asset.metadata.compiled_at}`);
  console.log(`\n── Compile Chain ──\n`);

  // Source documents
  if (asset.metadata.source_paths.length > 0) {
    console.log("  Source Documents:");
    for (const sp of asset.metadata.source_paths) {
      const exists = existsSync(sp) ? "✓" : "✗";
      console.log(`    ${exists} ${sp}`);
    }
  }

  // Dependencies
  if (asset.metadata.dependencies.length > 0) {
    console.log(`\n  Dependencies: ${asset.metadata.dependencies.join(", ")}`);
  }

  // Inheritance
  if (asset.metadata.inherits.length > 0) {
    console.log(`\n  Inherits From: ${asset.metadata.inherits.join(", ")}`);
  }

  // Registry check
  const registryPath = resolve(aiRegistry, `${asset.asset_type}.json`);
  if (existsSync(registryPath)) {
    const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    const regEntry = registry.assets?.[assetId];
    if (regEntry) {
      console.log(`\n── Registry Entry ──\n`);
      console.log(`  Artifact:     ${regEntry.artifact}`);
      console.log(`  Version:      ${regEntry.version}`);
      console.log(`  Checksum:     ${regEntry.checksum}`);
      console.log(`  Consumer:     ${(regEntry.consumer as string[]).join(", ")}`);
      console.log(`  Owner:        ${regEntry.owner}`);
    }
  }

  // Show structure keys
  const structKeys = Object.keys(asset.structure || {});
  if (structKeys.length > 0) {
    console.log(`\n── Structure ──\n`);
    for (const key of structKeys) {
      const val = (asset.structure as Record<string, unknown>)[key];
      const type = Array.isArray(val) ? `Array[${val.length}]` : typeof val === "object" ? "Object" : typeof val;
      console.log(`  ${key}: ${type}`);
    }
  }

  // Traceability
  console.log(`\n── Traceability ──\n`);
  console.log(`  Compiled By:  ${asset.traceability.compiled_by}`);
  console.log(`  Version:      ${asset.traceability.compiler_version}`);
}
