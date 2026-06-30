// SPRINT 7.3: Prompt Assembler — ContextPackageV1 → system prompt
// Consumer of Context Builder. One of many possible consumers.

import type { ContextPackageV1, ContextAssetV1 } from "./context-builder";

/** Format a single asset for prompt injection */
function formatAsset(asset: ContextAssetV1): string {
  const truncationNote = asset.truncated ? ` (truncated — original ${asset.originalLength} chars)` : "";
  return `[ASSET:${asset.id}] ${asset.title} (${asset.knowledge_level})${truncationNote}\n${asset.content}`;
}

/** Format all assets in order */
function formatAssets(assets: ContextAssetV1[]): string {
  return assets.map(formatAsset).join("\n\n---\n\n");
}

/** Assemble a complete system prompt from a ContextPackage */
export function assembleSystemPrompt(pkg: ContextPackageV1, mode?: string): string {
  const sections: string[] = [];

  // Mode-specific prefix
  if (mode === "cto") {
    sections.push(
      "You are BANG — Senior CTO of Lume's Everywhere. Platform POS kuliner multi-cabang.",
      "Read the context below before answering. Cite file paths and line numbers.",
      "Follow all rules from the CONSTITUTION.",
    );
  }

  // Foundation assets (always loaded)
  sections.push(formatAssets(pkg.assets));

  // Instructions from the package
  if (pkg.instructions.length > 0) {
    sections.push(`\n## Instructions\n${pkg.instructions.join("\n")}`);
  }

  // Token budget footer
  sections.push(
    `\n[Context Budget: ${pkg.budget.used}/${pkg.budget.total} tokens from ${pkg.meta.totalAssets} assets${pkg.meta.truncatedAssets > 0 ? `, ${pkg.meta.truncatedAssets} truncated` : ""}]`,
  );

  return sections.join("\n\n");
}

/** Build prompt from Foundation Loader + Context Builder (one-shot) */
export function buildSystemPrompt(
  mode: string,
  options?: { maxTokens?: number; domains?: string[] },
): string {
  // Lazy import to avoid circular deps
  const { foundationLoader } = require("./foundation-loader");
  const { buildContext } = require("./context-builder");

  const assets = foundationLoader.load();
  const pkg = buildContext(assets, mode, {
    strategy: "always",
    maxTokens: options?.maxTokens || 4000,
    domains: options?.domains,
    prioritySort: true,
  });

  return assembleSystemPrompt(pkg, mode);
}

// Component metadata
export const promptAssembler = {
  name: "PromptAssembler",
  version: "1.0.0",
  capabilities: ["prompt-assembly", "context-to-string", "mode-specific-formatting"],
  dependencies: ["FoundationLoader", "ContextBuilder"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),

  build: buildSystemPrompt,
  assembleFromPackage: assembleSystemPrompt,
};
