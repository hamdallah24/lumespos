import type { ValidationResult } from "./StartupValidator";
import { RuntimeManifest } from "../runtime-metadata/RuntimeManifest";

export const CompatibilityValidator = {
  validate(): ValidationResult {
    const manifest = RuntimeManifest.get();
    const issues: string[] = [];

    if (!manifest.runtimeVersion) issues.push("Runtime version not set");
    if (!manifest.pipelineVersion) issues.push("Pipeline version not set");
    if (!manifest.engineVersion) issues.push("Engine version not set");

    const runtimeParts = manifest.runtimeVersion.split(".").map(Number);
    if (runtimeParts.length < 2 || isNaN(runtimeParts[0])) {
      issues.push(`Invalid runtime version format: ${manifest.runtimeVersion}`);
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? issues.join("; ") : "Compatibility validation passed",
    };
  },
};
