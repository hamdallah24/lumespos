import { sha256 } from "../utils/checksum.js";
import type { DocumentSource, CompiledAsset } from "../types/index.js";

export function compilePrompts(sources: DocumentSource[]): CompiledAsset[] {
  const promptSources = sources.filter(s => s.category === "prompt-framework" || s.category === "executive-prompt");

  const assets: CompiledAsset[] = [];

  // Global prompt
  const globalPrompt = promptSources.find(s => /global/i.test(s.title || s.path));
  if (globalPrompt) {
    assets.push({
      asset_type: "prompt",
      id: "global-prompt",
      canonical: true,
      metadata: {
        title: "Global System Prompt",
        version: globalPrompt.version,
        owner: "FOUNDER",
        consumer: ["*"],
        checksum: sha256(globalPrompt.content + globalPrompt.version),
        compiled_at: new Date().toISOString(),
        source_hash: globalPrompt.checksum,
        source_paths: [globalPrompt.path],
        dependencies: [],
        inherits: [],
        knowledge_level: "governing",
        status: globalPrompt.status,
      },
      structure: {
        ast: true,
        schema_version: "1.0",
        layers: extractPromptLayers(globalPrompt.content),
      },
      traceability: { compiled_by: "DGPS", compiler_version: "1.0.0" },
    });
  }

  // Executive prompts
  const execPrompts = promptSources.filter(s => s.category === "executive-prompt");
  for (const src of execPrompts) {
    const normPath = src.path.replace(/\\/g, "/");
    const execName = normPath.match(/executives\/(\w+)\//)?.[1]?.toLowerCase() || "unknown";
    const id = `${execName}-prompt`;

    assets.push({
      asset_type: "prompt",
      id,
      canonical: true,
      metadata: {
        title: `${execName.toUpperCase()} System Prompt`,
        version: src.version,
        owner: execName.toUpperCase(),
        consumer: [`${execName}-runtime`],
        checksum: sha256(src.content + src.version),
        compiled_at: new Date().toISOString(),
        source_hash: src.checksum,
        source_paths: [src.path],
        dependencies: ["global-prompt"],
        inherits: ["global-prompt"],
        knowledge_level: "runtime",
        status: src.status,
      },
      structure: {
        ast: true,
        schema_version: "1.0",
        layers: extractPromptLayers(src.content),
      },
      traceability: { compiled_by: "DGPS", compiler_version: "1.0.0" },
    });
  }

  return assets;
}

function extractPromptLayers(content: string): Record<string, { role: string; priority: number; content: string }> {
  const sections = content.split(/^## /m);
  const layers: Record<string, { role: string; priority: number; content: string }> = {};
  const priorityOrder: Record<string, number> = {
    constitution: 10,
    identity: 9,
    capabilities: 8,
    decision: 7,
    communication: 6,
    execution: 5,
    collaboration: 4,
    output: 3,
    failure: 2,
    safety: 1,
  };

  for (const section of sections) {
    const headerLine = section.split("\n")[0]?.trim() || "";
    const key = headerLine.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "").replace(/^_+|_+$/g, "");
    const body = section.split("\n").slice(1).join("\n").trim();
    if (key && body && key.length < 40) {
      layers[key] = {
        role: "system",
        priority: priorityOrder[key] ?? 5,
        content: body.substring(0, 3000),
      };
    }
  }

  return layers;
}
