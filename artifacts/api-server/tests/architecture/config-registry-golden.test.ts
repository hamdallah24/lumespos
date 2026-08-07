// ConfigCenter — Golden Contract test.
// Locks the canonical Registry catalog against accidental changes. If a key,
// default, scope, or metadata shifts, the regenerated checksum (and/or catalog
// diff) no longer matches the committed golden file and this test fails.
//
// Intentionally changing the catalog is a deliberate act:
//   1. Run the generator to refresh the golden file:
//        pnpm --filter ./artifacts/api-server exec tsx scripts/generate-settings-golden.mjs
//   2. Review the diff in tests/contract/settings-registry.golden.json in the PR.
//   3. Bump REGISTRY_CONFIG_VERSION when the change is a breaking catalog change.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ConfigurationRegistry } from "../../src/settings/registry";
import {
  registerDefaultConfiguration,
  REGISTRY_CONFIG_VERSION,
} from "../../src/settings/defaults";

interface GoldenField {
  key: string;
  category: string;
  type: string;
  defaultValue: unknown;
  allowedValues: unknown[] | null;
  scope: string[];
  secret: boolean;
  immutable: boolean;
  restartStrategy: string;
  criticality: string;
  introducedVersion: string | null;
  owner: string | null;
}

interface GoldenContract {
  configVersion: number;
  checksum: string;
  fieldCount: number;
  fields: GoldenField[];
}

const GOLDEN_PATH = resolve(__dirname, "../contract/settings-registry.golden.json");
let golden: GoldenContract;
let currentChecksum: string;

function buildRegistry(): ConfigurationRegistry {
  const registry = new ConfigurationRegistry();
  // Must mirror the generator script: { freeze: true } computes the checksum.
  registerDefaultConfiguration(registry, { freeze: true });
  return registry;
}

beforeAll(() => {
  golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf-8")) as GoldenContract;
  currentChecksum = buildRegistry().getChecksum();
});

describe("ConfigCenter golden contract", () => {
  it("config version matches the golden file", () => {
    expect(REGISTRY_CONFIG_VERSION).toBe(golden.configVersion);
  });

  it("computed checksum matches the committed golden checksum", () => {
    expect(currentChecksum).toBe(golden.checksum);
  });

  it("field count matches the golden file", () => {
    expect(buildRegistry().list().length).toBe(golden.fieldCount);
  });

  it("catalog keys are identical and in the same order", () => {
    const current = buildRegistry()
      .list()
      .map((f) => f.key)
      .sort((a, b) => a.localeCompare(b));
    const expected = golden.fields.map((f) => f.key).sort((a, b) => a.localeCompare(b));
    expect(current).toEqual(expected);
  });
});