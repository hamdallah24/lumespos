// ConfigCenter — Environment seed bridge.
// Seeds committed, scope-"default" override rows from the runtime environment so
// the Settings UI reflects real runtime values that were historically read via
// process.env (llm-adapter keys etc.). This is an OVERRIDE seed, NOT a registry
// change: the Registry catalog + golden checksum stay untouched.
//
// Guards:
//  - Only keys that ARE declared in the Registry are seeded (no hardcoded keys).
//  - An existing override for the same key at the SAME scope wins over env, so a
//    user's committed value is never overwritten by bootstrap.
//  - Skips empty/placeholder values (e.g. "your_gemini_api_key_here").
//
// This module must never mutate the Registry. Commits go through the store so
// audit/revision semantics are preserved.

import type { ConfigCenter } from "./index";
import type { ConfigScope } from "./types";

const ENV_MAP: { env: string; key: string; scope: ConfigScope }[] = [
  { env: "DEEPSEEK_API_KEY", key: "providers.deepseek.apiKey", scope: { type: "default" } },
  { env: "DEEPSEEK_BASE_URL", key: "providers.deepseek.baseUrl", scope: { type: "default" } },
  { env: "DEEPSEEK_MODEL", key: "providers.deepseek.model", scope: { type: "default" } },
  { env: "GOOGLE_GEMINI_API_KEY", key: "providers.gemini.apiKey", scope: { type: "default" } },
  { env: "GEMINI_MODEL", key: "providers.gemini.model", scope: { type: "default" } },
];

const PLACEHOLDER_PATTERN =
  /^(your_|your-|changeme|please_|replace|xxx|example|[a-z0-9_-]+_key_here)/i;

function isUsable(value: unknown): boolean {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  return !PLACEHOLDER_PATTERN.test(value.trim());
}

/**
 * Seed environment-provided config values into the default-scope override set.
 * Idempotent and conservative: never overwrites an existing committed override.
 * Returns the number of keys actually committed.
 */
export async function seedEnvOverrides(center: ConfigCenter): Promise<number> {
  const changes: Record<string, unknown> = {};
  let candidate = 0;

  for (const map of ENV_MAP) {
    const value = process.env[map.env];
    if (!isUsable(value)) continue;
    if (!center.registry.has(map.key)) continue; // only declared keys
    changes[map.key] = value;
    candidate += 1;
  }

  if (candidate === 0) return 0;

  // Never overwrite an existing override for these keys at their scope.
  const existing = (await center.store.loadOverrides()).filter((s) =>
    s.scope.type === "default",
  );
  const hasDeviation = (key: string) =>
    existing.some((s) => Object.prototype.hasOwnProperty.call(s.values, key));

  const toCommit: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!hasDeviation(key)) toCommit[key] = value;
  }
  if (Object.keys(toCommit).length === 0) return 0;

  center.store.commit(
    { type: "default" },
    toCommit,
    "system:env-bootstrap",
    `env-seed-${Date.now()}`,
  );
  // Invalidate resolver cache so the fresh overrides are visible immediately.
  center.resolver.invalidate();
  return Object.keys(toCommit).length;
}