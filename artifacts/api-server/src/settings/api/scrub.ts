// ConfigCenter — transport scrubbing (Milestone 2).
// Secret values must never leak over the wire. This is the SOLE place a value
// is masked for API responses — resolution/inheritance stay entirely in Resolver.

import type { ConfigurationRegistry } from "../registry";
import type { ConfigValue } from "../types";

const MASK = "••••••••";

export function scrubForTransport(
  config: Record<string, ConfigValue>,
  registry: ConfigurationRegistry,
): Record<string, ConfigValue> {
  const out: Record<string, ConfigValue> = {};
  for (const [key, value] of Object.entries(config)) {
    out[key] = registry.isSecret(key) && value != null && value !== "" ? MASK : value;
  }
  return out;
}