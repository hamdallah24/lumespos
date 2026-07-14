export interface RuntimeManifestSchema {
  runtimeVersion: string;
  pipelineVersion: string;
  engineVersion: string;
  enhancementVersion: string;
  executiveVersion: string;
  pluginVersion: string;
  schemaVersion: string;
  policyVersion: string;
  compatibility: {
    minimumKernelVersion: string;
    minimumFoundationVersion: string;
  };
}

const DEFAULT_MANIFEST: RuntimeManifestSchema = {
  runtimeVersion: "4.1.0",
  pipelineVersion: "2.0.0",
  engineVersion: "2.0.0",
  enhancementVersion: "1.0.0",
  executiveVersion: "1.0.0",
  pluginVersion: "1.0.0",
  schemaVersion: "1.0.0",
  policyVersion: "1.0.0",
  compatibility: {
    minimumKernelVersion: "1.0.0",
    minimumFoundationVersion: "2.0.0",
  },
};

let manifest: RuntimeManifestSchema = { ...DEFAULT_MANIFEST };

export const RuntimeManifest = {
  get(): RuntimeManifestSchema {
    return { ...manifest };
  },

  set(m: Partial<RuntimeManifestSchema>): void {
    manifest = { ...manifest, ...m };
  },

  checkCompatibility(kernelVersion: string, foundationVersion: string): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    if (compareVersion(kernelVersion, manifest.compatibility.minimumKernelVersion) < 0) {
      issues.push(`Kernel version ${kernelVersion} below minimum ${manifest.compatibility.minimumKernelVersion}`);
    }
    if (compareVersion(foundationVersion, manifest.compatibility.minimumFoundationVersion) < 0) {
      issues.push(`Foundation version ${foundationVersion} below minimum ${manifest.compatibility.minimumFoundationVersion}`);
    }
    return { compatible: issues.length === 0, issues };
  },

  reset(): void {
    manifest = { ...DEFAULT_MANIFEST };
  },
};

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
