// ADR-009 Phase 2: Artifact Builder
// Transforms ToolResult → Artifact. Decouples Evidence from Tool implementation.

import type { Artifact } from "./MetricTypes";
import { createArtifactId } from "./MetricTypes";

export interface ToolResultLike {
  name: string;
  output?: string;
  status: "ok" | "error";
  durationMs: number;
}

export function buildArtifact(result: ToolResultLike): Artifact {
  const type = inferArtifactType(result.name);
  const payload = (result.output || `${result.name} executed (${result.status})`).slice(0, 2000);

  return {
    id: createArtifactId(),
    type,
    source: result.name,
    producer: "ToolAdapter",
    payload,
    verified: result.status === "ok",
    checksum: simpleChecksum(payload),
    createdAt: new Date().toISOString(),
    metadata: {
      durationMs: result.durationMs,
      lines: payload.split("\n").length,
      files: result.name === "readFile" || result.name === "fetchGitHubFile" ? 1 : 0,
    },
  };
}

function inferArtifactType(toolName: string): Artifact["type"] {
  switch (toolName) {
    case "readFile":
    case "fetchGitHubFile":
    case "fetchGitHubDir":       return "file";
    case "searchContent":        return "search_result";
    case "execCommand":
    case "sshExec":              return "command_output";
    case "getDependencies":      return "search_result";
    default:                     return "tool_output";
  }
}

function simpleChecksum(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function buildArtifacts(results: ToolResultLike[]): Artifact[] {
  return results.map(buildArtifact);
}
