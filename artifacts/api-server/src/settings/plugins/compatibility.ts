// ConfigCenter — Milestone 6 Phase 1: Version Compatibility contract.
// Decides whether a plugin's manifest is compatible with the host at
// registration time:
//   1. plugin.apiVersion must be <= host.apiVersion (SDK API it was built for).
//   2. host.sdkVersion must satisfy plugin.requiresSdk (semver range).
// Deterministic, side-effect-free — the host never adapts to a plugin.

import type { PluginManifest } from "./types";
import { compareVersions, parseVersion, satisfiesVersion } from "./semver";

export interface CompatibilityResult {
  ok: boolean;
  reasons: string[];
}

export class VersionCompatibility {
  readonly hostApiVersion: string;
  readonly hostSdkVersion: string;

  constructor(hostApiVersion: string, hostSdkVersion: string) {
    this.hostApiVersion = hostApiVersion;
    this.hostSdkVersion = hostSdkVersion;
  }

  /** Plugin must target an API version the host supports (<= host, same major). */
  private apiCompatible(pluginApiVersion: string): string | null {
    const host = parseVersion(this.hostApiVersion);
    const plugin = parseVersion(pluginApiVersion);
    if (host == null || plugin == null) return `invalid apiVersion: "${pluginApiVersion}"`;
    if (plugin.major !== host.major) {
      return `plugin targets plugin-api v${plugin.major}, host is v${host.major}`;
    }
    if (compareVersions(plugin, host) > 0) {
      return `plugin requires plugin-api ${pluginApiVersion}, host provides ${this.hostApiVersion}`;
    }
    return null;
  }

  check(manifest: PluginManifest): CompatibilityResult {
    const reasons: string[] = [];
    const apiIssue = this.apiCompatible(manifest.apiVersion);
    if (apiIssue) reasons.push(apiIssue);
    if (manifest.requiresSdk != null && !satisfiesVersion(this.hostSdkVersion, manifest.requiresSdk)) {
      reasons.push(`plugin requires config-sdk ${manifest.requiresSdk}, host provides ${this.hostSdkVersion}`);
    }
    return { ok: reasons.length === 0, reasons };
  }
}
