// Architecture enforcement — ConfigCenter SDK boundary.
// Ensures subsystems only read configuration through the ConfigReader/SDK, not
// by importing env/config tables directly. This is the CI dependency rule that
// backs the "Configuration SDK single gateway" contract.

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SETTINGS_DIR = path.resolve(__dirname, "../../../src/settings");
const SRC_ROOT = path.resolve(__dirname, "../../../src");

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) results.push(full);
    }
  }
  walk(dir);
  return results;
}

// All subsystems that are expected to consume config via SDK. Files NOT in
// this list that import @workspace/db settings tables OR read process.env for
// config keys violate the boundary. For Milestone 1 we only assert that the
// settings core is the sole importer of the settings tables.
const SETTINGS_SOURCE_FILES = new Set([
  path.join(SETTINGS_DIR, "store.ts"),
  path.join(SETTINGS_DIR, "resolver.ts"),
  path.join(SETTINGS_DIR, "pipeline.ts"),
  path.join(SETTINGS_DIR, "index.ts"),
]);

describe("ConfigCenter boundaries", () => {
  it("settings tables are only imported by the settings core (SDK gateway)", () => {
    const allFiles = findTsFiles(SRC_ROOT).filter((f) => !f.includes("settings"));
    const violating: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("@workspace/db") && content.includes("settingsTable")) {
        violating.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(violating, "subsystems must not import settings tables directly — use ConfigReader").toEqual([]);
  });

  it("config keys are declared in the registry catalog, not hardcoded in subsystems", () => {
    // Scans for the known config key pattern "providers.<...>" outside settings/.
    const allFiles = findTsFiles(SRC_ROOT).filter((f) => !f.includes("settings"));
    const violations: string[] = [];
    const keyRegex = /["']providers\.(deepseek|gemini)\.(model|apiKey|baseUrl)["']/;
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const match = content.match(keyRegex);
      if (match) violations.push(`${path.relative(SRC_ROOT, file)}: ${match[0]}`);
    }
    expect(violations, "move provider config keys into the Registry catalog").toEqual([]);
  });

  it("settings core registers the default catalog with the agreed fields", async () => {
    const { ConfigurationRegistry } = await import("../../../src/settings/registry");
    const { registerDefaultConfiguration } = await import("../../../src/settings/defaults");
    const registry = new ConfigurationRegistry();
    registerDefaultConfiguration(registry);
    const keys = registry.list().map((f) => f.key);
    for (const expected of [
      "providers.deepseek.model",
      "providers.deepseek.apiKey",
      "providers.temperature",
      "runtime.ric.enabled",
      "runtime.executive.enabled",
      "executives.CEO.model",
      "executives.CTO.temperature",
    ]) {
      expect(keys).toContain(expected);
    }
  });
});
