// ECP-018: Prompt Assembler — single source of prompt assembly
// Pure block assembly. NO if-else per role.
// Identity from AgentIdentity, directive from Foundation, schema from fragments.
// All Runtimes use this one assembler.

import type { AgentIdentity } from "./identity";
import type { KnowledgeAsset } from "./foundation-loader";
import { foundationLoader } from "./foundation-loader";
import { buildFoundationContext } from "./context-builder";
import type { ContextPackageV1 } from "./context-builder";
import { TOOL_RULES, STREAM_POLICY, ERROR_POLICY, EXECUTIVE_OUTPUT_SCHEMA, CTO_OUTPUT_SCHEMA, JSON_OUTPUT_SCHEMA } from "../../routes/ai-prompts";

export interface PromptAssemblyInput {
  identity: AgentIdentity;
  directive: string;
  decision?: unknown;
  mission?: string;
  context?: string;
  outputSchema?: string;
  toolRules?: string;
  maxTokens?: number;
  mode?: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Assemble system prompt from structured input — NO if-else per role */
export function assemble(input: PromptAssemblyInput): string {
  const sections: string[] = [];
  let totalTokens = 0;
  const budget = input.maxTokens || 4000;

  // BLOCK 1: Identity
  const id = input.identity;
  const identityBlock = [
    `Kamu adalah ${id.role} Engineering OS — Lume's Everywhere.`,
    `Authority: ${id.authority}. Memory scope: ${id.memoryScope}.`,
    id.approvalRequired ? "Semua tindakan destructive memerlukan persetujuan Founder." : "",
  ].filter(Boolean).join("\n");

  if (input.directive) {
    const directiveSnippet = input.directive.slice(0, 1500);
    sections.push(`${identityBlock}\n\n## Executive Directive\n${directiveSnippet}`);
  } else {
    sections.push(identityBlock);
  }
  totalTokens += estimateTokens(sections[sections.length - 1]);

  // BLOCK 2: Foundation Knowledge (context-builder)
  if (budget - totalTokens > 500) {
    const assets = foundationLoader.load();
    const pkg = buildFoundationContext(assets, input.mode || "cto", budget - totalTokens);
    if (pkg.assets.length > 0) {
      const knowledgeBlock = pkg.assets
        .map(a => `[${a.id}] ${a.title}\n${a.content.slice(0, 300)}`)
        .join("\n\n");
      sections.push(`\n## Foundation Context\n${knowledgeBlock}`);
      totalTokens += estimateTokens(knowledgeBlock);
    }
  }

  // BLOCK 3: Mission
  if (input.mission && budget - totalTokens > 200) {
    const missionBlock = `\n## Active Mission\n${input.mission}`;
    sections.push(missionBlock);
    totalTokens += estimateTokens(missionBlock);
  }

  // BLOCK 4: Decision Context
  if (input.decision && budget - totalTokens > 200) {
    const decisionStr = typeof input.decision === "string" ? input.decision : JSON.stringify(input.decision, null, 2);
    const decisionBlock = `\n## Decision Context\n${decisionStr}`;
    sections.push(decisionBlock);
    totalTokens += estimateTokens(decisionBlock);
  }

  // BLOCK 5: Output Schema
  if (input.outputSchema && budget - totalTokens > 200) {
    const schemaBlock = `\n${input.outputSchema}`;
    sections.push(schemaBlock);
    totalTokens += estimateTokens(schemaBlock);
  }

  // BLOCK 6: Tool Rules
  if (input.toolRules && budget - totalTokens > 200) {
    const toolBlock = `\n${input.toolRules}`;
    sections.push(toolBlock);
    totalTokens += estimateTokens(toolBlock);
  }

  // BLOCK 7: Footer (always)
  const footer = [
    STREAM_POLICY,
    ERROR_POLICY,
    `\n[Context Budget: ${totalTokens}/${budget} tokens]`,
  ].join("\n\n");
  sections.push(footer);

  return sections.join("\n\n");
}

/** Quick assembly — Foundation context + identity + directive (no decision/mission) */
export function assembleQuick(identity: AgentIdentity, directive: string, outputSchema?: string, maxTokens?: number): string {
  return assemble({ identity, directive, outputSchema, maxTokens, mode: identity.role.toLowerCase() });
}

// Legacy compat — kept for existing code paths
function legacyAssembleSystemPrompt(pkg: ContextPackageV1, mode?: string): string {
  const sections: string[] = [];
  const idLine = mode ? `[Role: ${mode}]` : "";
  if (idLine) sections.push(idLine);

  const assets = pkg.assets
    .map(a => `[ASSET:${a.id}] ${a.title}\n${a.content}`)
    .join("\n\n---\n\n");
  sections.push(assets);

  if (pkg.instructions.length > 0) {
    sections.push(`\n## Instructions\n${pkg.instructions.join("\n")}`);
  }

  sections.push(`\n[Context Budget: ${pkg.budget.used}/${pkg.budget.total} tokens]`);
  return sections.join("\n\n");
}

// Legacy compat — kept for existing code paths (ai-helpers.ts, production-readiness.ts)
export { legacyAssembleSystemPrompt as assembleSystemPrompt };

export const promptAssembler = {
  name: "PromptAssembler",
  version: "2.0.0",
  capabilities: ["prompt-assembly", "block-assembly", "role-neutral"],
  dependencies: ["FoundationLoader", "ContextBuilder"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "2.0.0" }),

  assemble,
  assembleQuick,
  assembleSystemPrompt: legacyAssembleSystemPrompt,
};
