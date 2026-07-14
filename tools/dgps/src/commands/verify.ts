import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { globSync } from "glob";
import { paths } from "../utils/paths.js";
import type { CompiledAsset } from "../types/index.js";

export async function runVerify(_args: string[]): Promise<void> {
  const { aiRegistry, aiGenerated } = paths();
  let errors = 0;
  let total = 0;

  // Verify manifest exists
  const manifestPath = resolve(aiRegistry, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("❌ manifest.json not found. Run `dgps publish` first.");
    process.exit(1);
  }

  // Verify registry files
  const registryFiles = ["foundation.json", "knowledge.json", "executive.json", "prompt.json", "adr.json", "dependency-graph.json"];
  for (const file of registryFiles) {
    const fp = resolve(aiRegistry, file);
    if (!existsSync(fp)) {
      console.error(`❌ Registry file missing: ${file}`);
      errors++;
    } else {
      console.log(`✅ Registry present: ${file}`);
    }
  }

  // Verify generated directory structure
  const genDirs = ["executive", "foundation", "knowledge", "prompt", "adr", "graphs"];
  for (const dir of genDirs) {
    const dp = resolve(aiGenerated, dir);
    if (!existsSync(dp)) {
      console.warn(`⚠ Generated dir missing: ${dir} (empty — may be fine)`);
    }
  }

  // Load manifest and verify assets exist
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const assetChecksums = manifest.checksums as Record<string, string>;
    total = Object.keys(assetChecksums).length;

    // Find all generated JSON files
    const generatedFiles = globSync("**/*.json", { cwd: aiGenerated, nodir: true });
    const generatedIds = new Set(generatedFiles.map(f => f.replace(/\.(directive\.)?json$/, "").split("/").pop()));

    for (const [assetId, expectedChecksum] of Object.entries(assetChecksums)) {
      if (!generatedIds.has(assetId)) {
        console.warn(`⚠ Generated file missing for asset: ${assetId}`);
        errors++;
        continue;
      }

      // Verify checksum
      const pattern = `${assetId}.*.json`;
      const match = globSync(pattern, { cwd: aiGenerated, nodir: true });
      if (match.length === 0) {
        console.warn(`⚠ Cannot find file for asset: ${assetId}`);
        errors++;
        continue;
      }

      const content = readFileSync(resolve(aiGenerated, match[0]), "utf-8");
      const asset = JSON.parse(content) as CompiledAsset;
      if (asset.metadata.checksum !== expectedChecksum) {
        console.warn(`⚠ Checksum mismatch for asset: ${assetId}`);
        errors++;
      }
    }
  } catch (err) {
    console.error(`❌ Failed to verify: ${err}`);
    errors++;
  }

  if (errors === 0) {
    console.log(`\n✅ All ${total} assets verified`);
  } else {
    console.log(`\n❌ ${errors} verification error(s) found`);
    process.exit(1);
  }
}
