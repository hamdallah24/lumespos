import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { CompiledAsset } from "../types/index.js";

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function writeGeneratedAssets(
  dir: string,
  assets: CompiledAsset[],
  ext: "directive" | "json",
): void {
  ensureDir(dir);
  for (const asset of assets) {
    const file = resolve(dir, ext === "directive" ? `${asset.id}.directive.json` : `${asset.id}.json`);
    writeFileSync(file, JSON.stringify(asset, null, 2), "utf-8");
  }
}
