// ConfigCenter — Golden Contract generator.
// Dumps the canonical Registry catalog + checksum to a golden file so any
// accidental metadata change is caught by the contract test. Run with tsx:
//   pnpm --filter ./artifacts/api-server exec tsx scripts/generate-settings-golden.mjs
// And commit the emitted tests/contract/settings-registry.golden.json.

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ConfigurationRegistry } from "../src/settings/registry";
import { registerDefaultConfiguration, REGISTRY_CONFIG_VERSION } from "../src/settings/defaults";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildContract() {
  const registry = new ConfigurationRegistry();
  registerDefaultConfiguration(registry, { freeze: true });
  const fields = registry
    .list()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((f) => ({
      key: f.key,
      category: f.category,
      type: f.type,
      defaultValue: f.defaultValue,
      allowedValues: f.allowedValues ?? null,
      scope: f.scope,
      secret: f.secret ?? false,
      immutable: f.immutable ?? false,
      restartStrategy: f.restartStrategy ?? "hot",
      criticality: f.criticality ?? "low",
      introducedVersion: f.introducedVersion ?? null,
      owner: f.owner ?? null,
    }));
  return {
    configVersion: REGISTRY_CONFIG_VERSION,
    checksum: registry.getChecksum(),
    fieldCount: fields.length,
    fields,
  };
}

const contract = buildContract();
const out = resolve(__dirname, "../tests/contract/settings-registry.golden.json");
writeFileSync(out, JSON.stringify(contract, null, 2) + "\n");
console.log(`Golden contract written: ${out}`);
console.log(`fields=${contract.fieldCount} checksum=${contract.checksum}`);