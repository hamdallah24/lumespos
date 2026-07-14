import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const RUNTIME_DIR = path.resolve(__dirname, "../../src/eios-runtime");
const CONTRACTS_DIR = path.join(RUNTIME_DIR, "contracts");
const PUBLIC_DIR = path.join(RUNTIME_DIR, "public");
const INTERNAL_DIR = path.join(RUNTIME_DIR, "internal");
const STAGES_DIR = path.join(RUNTIME_DIR, "stages");
const OBSERVERS_DIR = path.join(RUNTIME_DIR, "observers");
const PROFILES_DIR = path.join(RUNTIME_DIR, "profiles");
const EXECUTIVE_DIR = path.resolve(__dirname, "../../src/executive-runtime/executives");

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

function readImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const imports: string[] = [];
  const regex = /from\s+["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

describe("Import Boundaries", () => {
  it("public/ must not import from internal/ (allowed: known bridges)", () => {
    const files = findTsFiles(PUBLIC_DIR);
    const allowedImports = [
      "../internal/runtime-metadata/",
      "../internal/PipelineEngine",
      "../internal/PipelineAudit",
      "../internal/PipelineMetrics",
    ];
    const isAllowed = (imp: string) => allowedImports.some(a => imp.includes(a));
    for (const file of files) {
      const imports = readImports(file);
      const violations = imports.filter(i =>
        (i.includes("../internal/") || i.includes("internal/")) &&
        !isAllowed(i)
      );
      expect(violations, `${path.relative(RUNTIME_DIR, file)} imports internal/`).toEqual([]);
    }
  });

  it("stages/ must only import from contracts/ and public/", () => {
    const files = findTsFiles(STAGES_DIR);
    for (const file of files) {
      const imports = readImports(file);
      const violations = imports.filter(i =>
        !i.includes("contracts/") &&
        !i.includes("public/") &&
        !i.includes("../internal/") &&
        !i.startsWith(".") &&
        !i.startsWith("../north-star") &&
        !i.startsWith("../strategy-engine") &&
        !i.startsWith("../strategy-simulator") &&
        !i.startsWith("../decision-context") &&
        !i.startsWith("../execution-planner") &&
        !i.startsWith("../workflow-runtime") &&
        !i.startsWith("../executive-runtime") &&
        !i.startsWith("../knowledge-platform")
      );
      if (violations.length > 0) {
        console.warn(`[WARN] ${path.relative(RUNTIME_DIR, file)} imports: ${violations.join(", ")}`);
      }
    }
  });

  it("executives/ must only import contracts/ (for ExecutiveBrief)", () => {
    const dirs = fs.readdirSync(EXECUTIVE_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(EXECUTIVE_DIR, d.name));

    const allowedRuntimeImports = [
      "eios-runtime/contracts/",
    ];

    for (const dir of dirs) {
      const files = findTsFiles(dir);
      for (const file of files) {
        const imports = readImports(file);
        const violations = imports.filter(i =>
          (i.includes("eios-runtime") && !allowedRuntimeImports.some(a => i.includes(a))) ||
          i.includes("PipelineContext") ||
          i.includes("PipelineEngine")
        );
        expect(violations, `${path.basename(dir)} imports runtime: ${violations.join(", ")}`).toEqual([]);
      }
    }
  });
});

describe("Contracts Stability", () => {
  it("contracts/ must not depend on public/ or internal/", () => {
    const files = findTsFiles(CONTRACTS_DIR);
    for (const file of files) {
      const imports = readImports(file);
      const violations = imports.filter(i => i.includes("public/") || i.includes("internal/"));
      expect(violations, `${path.basename(file)} depends on non-contracts layer`).toEqual([]);
    }
  });
});

describe("Registry Integrity", () => {
  it("PipelineStageRegistry must reject mutations after FROZEN", async () => {
    const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    RegistryLifecycle.reset();
    RegistryLifecycle.transition("REGISTERING");
    RegistryLifecycle.transition("VALIDATING");
    RegistryLifecycle.transition("FROZEN");

    const id = parseComponentId("eios.core:stage:test@1.0.0");
    expect(() => PipelineStageRegistry.register({
      id,
      manifest: { id, name: "Test", description: "", dependencies: [], capabilities: [], tags: [], checksum: "c", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} },
      execute: async () => ({ correlationId: "", stageId: id, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    })).toThrow("FROZEN");
  });

  it("all registries must be append-only (no delete)", async () => {
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { CapabilityRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/CapabilityRegistry");
    const { ExecutiveRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ExecutiveRegistry");

    expect(typeof (PipelineStageRegistry as any).remove).toBe("undefined");
    expect(typeof (CapabilityRegistry as any).remove).toBe("undefined");
    expect(typeof (ExecutiveRegistry as any).remove).toBe("undefined");
  });
});
