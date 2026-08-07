// ConfigCenter — Milestone 6 Phase 3: Package Manifest.
// The package contract: identity, version, type, dependencies, capabilities,
// config extensions, compatibility, integrity. Versioned (manifestVersion) and
// deterministic — canonicalize() produces the same serialization regardless of
// key insertion order so checksums are stable.

import { canonicalize, fnv1a } from "../api/snapshot/checksum";
import { isSemver } from "../plugins/semver";

export const PACKAGE_MANIFEST_VERSION = "1.0.0";

export type PackageType = "config" | "plugin" | "impact" | "integrations";

export interface PackageDependency {
  name: string;
  range: string;
  /** Resolved version once installed (filled by resolution). */
  resolved?: string;
}

export interface PackageCompatibility {
  /** Semver range of the plugin SDK the package requires. */
  sdk?: string;
  /** Semver range of the Configuration Center API it requires. */
  api?: string;
  /** Semver range of the host configuration registry. */
  registry?: string;
}

export interface PackageConfigExtension {
  /** Dotted key that does NOT exist in the golden config catalog. */
  key: string;
  title: string;
  type: "string" | "number" | "boolean" | "secret" | "object";
  defaultValue: unknown;
}

export interface PackageManifest {
  name: string;
  version: string;
  type: PackageType;
  manifestVersion: string;
  description?: string;
  author?: { name: string; email?: string; url?: string };
  dependencies?: PackageDependency[];
  peerDependencies?: PackageDependency[];
  provides?: string[];
  requires?: string[];
  configExtensions?: PackageConfigExtension[];
  compatibility?: PackageCompatibility;
  /** Integrity metadata — set at registration time. */
  checksum?: string;
  checksumAlgorithm?: string;
}

export interface ManifestIssue {
  path: string;
  message: string;
}

export interface ManifestValidation {
  ok: boolean;
  issues: ManifestIssue[];
  manifest?: PackageManifest;
}

const VALID_TYPES: PackageType[] = ["config", "plugin", "impact", "integrations"];

/** Validate a raw manifest object. Deterministic, non-throwing. */
export function validatePackageManifest(input: unknown): ManifestValidation {
  const issues: ManifestIssue[] = [];
  const record = (path: string, message: string): void => {
    issues.push({ path, message });
  };

  if (typeof input !== "object" || input == null || Array.isArray(input)) {
    return { ok: false, issues: [{ path: "$", message: "manifest must be an object" }] };
  }
  const m = input as Record<string, unknown>;

  if (typeof m["name"] !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(m["name"])) {
    record("name", "name is required and must be a valid package name");
  }
  if (typeof m["version"] !== "string" || !isSemver(m["version"])) {
    record("version", "version must be a valid semver string");
  }
  if (typeof m["type"] !== "string" || !VALID_TYPES.includes(m["type"] as PackageType)) {
    record("type", `type must be one of: ${VALID_TYPES.join(", ")}`);
  }
  if (typeof m["manifestVersion"] !== "string" || !isSemver(m["manifestVersion"])) {
    record("manifestVersion", "manifestVersion must be a valid semver string");
  }
  if (m["description"] != null && typeof m["description"] !== "string") record("description", "must be a string");
  if (m["author"] != null) {
    if (typeof m["author"] !== "object" || m["author"] == null) record("author", "must be an object");
    else if (typeof (m["author"] as Record<string, unknown>)["name"] !== "string") record("author.name", "author.name is required");
  }
  if (m["dependencies"] != null && !Array.isArray(m["dependencies"])) record("dependencies", "must be an array");
  if (m["peerDependencies"] != null && !Array.isArray(m["peerDependencies"])) record("peerDependencies", "must be an array");
  if (m["provides"] != null && !Array.isArray(m["provides"])) record("provides", "must be an array");
  if (m["requires"] != null && !Array.isArray(m["requires"])) record("requires", "must be an array");
  if (m["configExtensions"] != null && !Array.isArray(m["configExtensions"])) record("configExtensions", "must be an array");

  for (const listName of ["dependencies", "peerDependencies"] as const) {
    const list = m[listName];
    if (!Array.isArray(list)) continue;
    list.forEach((dep, i) => {
      const d = dep as Partial<PackageDependency>;
      if (typeof d !== "object" || d == null) {
        record(`${listName}[${i}]`, "dependency must be an object");
        return;
      }
      if (typeof d.name !== "string" || d.name.length === 0) record(`${listName}[${i}].name`, "dependency name is required");
      if (typeof d.range !== "string" || !isSemverRangeLike(d.range)) record(`${listName}[${i}].range`, "dependency range is invalid");
    });
  }

  if (m["compatibility"] != null) {
    if (typeof m["compatibility"] !== "object" || m["compatibility"] == null) record("compatibility", "must be an object");
  }

  if (issues.length > 0) return { ok: false, issues };

  const manifest: PackageManifest = {
    name: String(m["name"]).trim(),
    version: String(m["version"]).trim(),
    type: m["type"] as PackageType,
    manifestVersion: String(m["manifestVersion"]).trim(),
    description: typeof m["description"] === "string" ? m["description"] : undefined,
    author: typeof m["author"] === "object" && m["author"] != null
      ? { name: String((m["author"] as Record<string, unknown>)["name"]), email: (m["author"] as Record<string, unknown>)["email"] as string | undefined, url: (m["author"] as Record<string, unknown>)["url"] as string | undefined }
      : undefined,
    dependencies: Array.isArray(m["dependencies"]) ? (m["dependencies"] as PackageDependency[]).map((d) => ({ name: d.name, range: d.range, resolved: d.resolved })) : [],
    peerDependencies: Array.isArray(m["peerDependencies"]) ? (m["peerDependencies"] as PackageDependency[]).map((d) => ({ name: d.name, range: d.range, resolved: d.resolved })) : [],
    provides: Array.isArray(m["provides"]) ? (m["provides"] as string[]) : [],
    requires: Array.isArray(m["requires"]) ? (m["requires"] as string[]) : [],
    configExtensions: Array.isArray(m["configExtensions"]) ? (m["configExtensions"] as PackageConfigExtension[]) : [],
    compatibility: typeof m["compatibility"] === "object" && m["compatibility"] != null ? m["compatibility"] as PackageCompatibility : undefined,
  };
  return { ok: true, issues, manifest };
}

/** Loose range sanity check — reuse plugin semver range notion loosely. */
function isSemverRangeLike(input: string): boolean {
  if (typeof input !== "string" || input.trim().length === 0) return false;
  const parts = input.split("||").flatMap((alt) => alt.trim().split(/[\s,]+/).filter((p) => p.length > 0));
  if (parts.length === 0) return false;
  return parts.some((p) => {
    if (p === "*" || p === "x" || p === "X") return true;
    let body = p;
    if (p[0] === "^" || p[0] === "~") body = p.slice(1);
    else if (p.startsWith(">=") || p.startsWith("<=")) body = p.slice(2);
    else if (p[0] === ">" || p[0] === "<") body = p.slice(1);
    if (body.includes("x") || body.includes("X") || body.includes("*")) return true;
    return isSemver(body);
  });
}

/** Canonical serialization of a manifest (stable across key order). */
export function canonicalManifest(manifest: PackageManifest): string {
  const { checksum, checksumAlgorithm, ...rest } = manifest;
  void checksum;
  void checksumAlgorithm;
  return canonicalize(rest);
}

/** Deterministic integrity checksum of a manifest (FNV-1a, same as registry). */
export function manifestChecksum(manifest: PackageManifest): string {
  return fnv1a(canonicalManifest(manifest));
}

/** Deterministic integrity checksum of a package payload (config extensions). */
export function payloadChecksum(payload: Record<string, unknown>): string {
  return fnv1a(canonicalize(payload));
}

/** Combined artifact checksum: manifest canonical + payload identity. */
export function artifactChecksum(manifest: PackageManifest, payload: Record<string, unknown>): string {
  return fnv1a(`${manifestChecksum(manifest)}\n${payloadChecksum(payload)}`);
}
