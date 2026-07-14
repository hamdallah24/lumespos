import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { sha256, objectChecksum } from "../utils/checksum.js";
import { paths } from "../utils/paths.js";
import type { CompiledAsset, Registry, Manifest, DgpsLock, RegistryEntry } from "../types/index.js";
import type { DependencyGraph } from "../types/index.js";

export function generateRegistries(
  assets: CompiledAsset[],
  depGraph: DependencyGraph,
): { registries: Record<string, Registry>; manifest: Manifest; lock: DgpsLock } {
  const registries: Record<string, Registry> = {
    foundation: { assets: {} },
    knowledge: { assets: {} },
    executive: { assets: {} },
    prompt: { assets: {} },
    adr: { assets: {} },
  };

  for (const asset of assets) {
    const entry: RegistryEntry = {
      artifact: asset.asset_type === "directive" ? "runtime" : asset.asset_type,
      version: asset.metadata.version,
      checksum: asset.metadata.checksum,
      consumer: asset.metadata.consumer,
      owner: asset.metadata.owner,
    };

    if (asset.asset_type === "directive") {
      registries.executive.assets[asset.id] = entry;
    } else if (asset.asset_type === "foundation") {
      registries.foundation.assets[asset.id] = entry;
    } else if (asset.asset_type === "knowledge") {
      registries.knowledge.assets[asset.id] = entry;
    } else if (asset.asset_type === "prompt") {
      registries.prompt.assets[asset.id] = entry;
    } else if (asset.asset_type === "adr") {
      registries.adr.assets[asset.id] = entry;
    }
  }

  const registryChecksums: Record<string, string> = {};
  for (const [name, reg] of Object.entries(registries)) {
    registryChecksums[name] = objectChecksum(reg);
  }
  const registryHash = sha256(Object.values(registryChecksums).join("|"));

  const buildNumber = getBuildNumber();
  const generatedAt = new Date().toISOString();
  const buildId = `DGPS-${generatedAt.slice(0, 10).replace(/-/g, "")}-${String(buildNumber).padStart(3, "0")}`;

  const totalAssets = assets.length;
  const assetChecksums: Record<string, string> = {};
  for (const a of assets) assetChecksums[a.id] = a.metadata.checksum;

  const manifest: Manifest = {
    build_id: buildId,
    eios_version: "4.1",
    compiler_version: "DGPS 1.0.0",
    schema_version: "1.0.0",
    git_commit: getGitCommit(),
    generated_at: generatedAt,
    build_number: buildNumber,
    registry_hash: registryHash,
    runtime_hash: sha256(assets.map(a => a.id + a.metadata.checksum).join("|")),
    total_assets: totalAssets,
    checksums: assetChecksums,
    registry_version: "1",
  };

  const manifestChecksum = objectChecksum(manifest);

  const lock: DgpsLock = {
    compiler_version: "1.0.0",
    schema_version: "1.0.0",
    asset_count: totalAssets,
    manifest_checksum: manifestChecksum,
    generated_at: generatedAt,
  };

  return { registries, manifest, lock };
}

export function writeRegistries(
  registries: Record<string, Registry>,
  manifest: Manifest,
  lock: DgpsLock,
  depGraph: DependencyGraph,
): void {
  const { aiRegistry } = paths();

  if (!existsSync(aiRegistry)) {
    mkdirSync(aiRegistry, { recursive: true });
  }

  for (const [name, reg] of Object.entries(registries)) {
    writeFileSync(resolve(aiRegistry, `${name}.json`), JSON.stringify(reg, null, 2), "utf-8");
  }

  // Write dependency graph with edge types
  writeFileSync(resolve(aiRegistry, "dependency-graph.json"), JSON.stringify(depGraph, null, 2), "utf-8");

  // Write manifest
  writeFileSync(resolve(aiRegistry, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  // Write lock
  writeFileSync(resolve(aiRegistry, "dgps.lock"), JSON.stringify(lock, null, 2), "utf-8");

  console.log(`[DGPS] Registry written to ${aiRegistry}/`);
  console.log(`[DGPS] Total assets: ${manifest.total_assets}`);
  console.log(`[DGPS] Build ID: ${manifest.build_id}`);
}

function getBuildNumber(): number {
  try {
    const { aiRegistry } = paths();
    const manifestPath = resolve(aiRegistry, "manifest.json");
    const prev = JSON.parse(readFileSync(manifestPath, "utf-8")) as Manifest;
    return (prev.build_number || 0) + 1;
  } catch {
    return 1;
  }
}

function getGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}
