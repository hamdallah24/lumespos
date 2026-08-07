// ConfigCenter — Milestone 6 Phase 1: Plugin Manifest contract.
// A manifest is the declarative contract of a plugin: identity, version, the
// Plugin SDK API it was built against, the config-sdk range it needs, the hooks
// it implements, the capabilities it provides/requires and its plugin deps.
// Validation is deterministic and returns structured errors (no throwing).

import type { PluginDependency, PluginHook, PluginManifest } from "./types";
import { isSemver, parseVersion } from "./semver";

export const KNOWN_HOOKS: PluginHook[] = [
  "on-init",
  "on-start",
  "on-stop",
  "on-config-changed",
];

/** Loose validation that a string is a plausible semver range. */
export function isSemverRange(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  // split on || into alternatives; each alternative is a space-separated AND list.
  for (const alt of trimmed.split("||")) {
    const parts = alt.trim().split(/[\s,]+/).filter((p) => p.length > 0);
    if (parts.length === 0) return false;
    let validAlt = false;
    for (const part of parts) {
      if (part === "*" || part === "x" || part === "X") { validAlt = true; continue; }
      let body = part;
      if (part[0] === "^" || part[0] === "~") body = part.slice(1);
      else if (part.startsWith(">=") || part.startsWith("<=")) body = part.slice(2);
      else if (part[0] === ">" || part[0] === "<") body = part.slice(1);
      if (body.includes("x") || body.includes("X") || body.includes("*")) { validAlt = true; continue; }
      if (parseVersion(body) != null) validAlt = true;
    }
    if (!validAlt) return false;
  }
  return true;
}

export interface ManifestIssue {
  path: string;
  message: string;
}

export interface ManifestValidation {
  ok: boolean;
  issues: ManifestIssue[];
  /** Sanitized manifest (defaults applied). Only valid when ok. */
  manifest?: PluginManifest;
}

export function validatePluginManifest(input: unknown): ManifestValidation {
  const issues: ManifestIssue[] = [];
  const record = (path: string, message: string): void => {
    issues.push({ path, message });
  };

  if (typeof input !== "object" || input == null || Array.isArray(input)) {
    return { ok: false, issues: [{ path: "$", message: "manifest must be an object" }] };
  }
  const m = input as Record<string, unknown>;

  // identity
  if (typeof m["id"] !== "string" || m["id"].trim().length === 0) {
    record("id", "id is required and must be a non-empty string");
  } else if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(m["id"])) {
    record("id", `invalid id "${m["id"]}" — only letters, digits, '.', '_', '-' allowed`);
  }
  if (typeof m["name"] !== "string" || m["name"].trim().length === 0) {
    record("name", "name is required and must be a non-empty string");
  }
  if (typeof m["version"] !== "string" || !isSemver(m["version"])) {
    record("version", "version must be a valid semver string (e.g. 1.2.3)");
  }
  if (typeof m["apiVersion"] !== "string" || !isSemver(m["apiVersion"])) {
    record("apiVersion", "apiVersion must be a valid semver string (e.g. 1.0.0)");
  }
  if (m["requiresSdk"] != null) {
    if (typeof m["requiresSdk"] !== "string" || !isSemverRange(m["requiresSdk"])) {
      record("requiresSdk", "requiresSdk must be a semver range (e.g. ^1.0.0)");
    }
  }

  // hooks
  const hooks = m["hooks"];
  if (!Array.isArray(hooks) || hooks.length === 0) {
    record("hooks", "hooks must be a non-empty array of known hooks");
  } else {
    const unknownHooks = hooks.filter((h) => typeof h === "string" && !KNOWN_HOOKS.includes(h as PluginHook));
    const invalidHooks = hooks.filter((h) => typeof h !== "string");
    if (invalidHooks.length > 0) record("hooks", "every hook must be a string");
    if (unknownHooks.length > 0) record("hooks", `unknown hooks: ${unknownHooks.join(", ")}`);
  }

  // capabilities
  if (m["capabilities"] != null) {
    if (!Array.isArray(m["capabilities"]) || m["capabilities"].some((c) => typeof c !== "string" || c.trim().length === 0)) {
      record("capabilities", "capabilities must be an array of non-empty strings");
    }
  }
  if (m["requiresCapabilities"] != null) {
    if (!Array.isArray(m["requiresCapabilities"]) || m["requiresCapabilities"].some((c) => typeof c !== "string" || c.trim().length === 0)) {
      record("requiresCapabilities", "requiresCapabilities must be an array of non-empty strings");
    }
  }

  // dependencies
  if (m["dependencies"] != null) {
    if (!Array.isArray(m["dependencies"])) {
      record("dependencies", "dependencies must be an array");
    } else {
      m["dependencies"].forEach((dep, i) => {
        const d = dep as Partial<PluginDependency>;
        const path = `dependencies[${i}]`;
        if (typeof d !== "object" || d == null) {
          record(path, "dependency must be an object");
          return;
        }
        if (typeof d.id !== "string" || d.id.trim().length === 0) record(`${path}.id`, "dependency id is required");
        if (typeof d.range !== "string" || !isSemver(d.range)) record(`${path}.range`, "dependency range must be a semver range");
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const manifest: PluginManifest = {
    id: String(m["id"]).trim(),
    name: String(m["name"]).trim(),
    version: String(m["version"]).trim(),
    description: typeof m["description"] === "string" ? m["description"] : undefined,
    author: typeof m["author"] === "string" ? m["author"] : undefined,
    apiVersion: String(m["apiVersion"]).trim(),
    requiresSdk: typeof m["requiresSdk"] === "string" ? m["requiresSdk"] : undefined,
    hooks: (hooks as PluginHook[]).slice(),
    capabilities: Array.isArray(m["capabilities"]) ? (m["capabilities"] as string[]).slice() : [],
    requiresCapabilities: Array.isArray(m["requiresCapabilities"]) ? (m["requiresCapabilities"] as string[]).slice() : [],
    dependencies: Array.isArray(m["dependencies"])
      ? (m["dependencies"] as PluginDependency[]).map((d) => ({ id: d.id, range: d.range, optional: Boolean(d.optional) }))
      : [],
  };
  return { ok: true, issues, manifest };
}
