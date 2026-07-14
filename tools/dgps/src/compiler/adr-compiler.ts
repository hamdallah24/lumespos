import { sha256 } from "../utils/checksum.js";
import type { DocumentSource, CompiledAsset } from "../types/index.js";

const PREFIX_MAP: Record<string, { prefix: string; domain: string }> = {
  "docs/architecture": { prefix: "ARCH", domain: "architecture" },
  "artifacts/api-server/docs/architecture": { prefix: "SERVER", domain: "server" },
  ".ai/adr": { prefix: "RUNTIME", domain: "runtime" },
};

export function compileAdrs(sources: DocumentSource[]): CompiledAsset[] {
  const adrs = sources.filter(s => s.category === "adr");

  return adrs.map(src => {
    let prefix = "ADR";
    let domain = "unknown";
    for (const [pathPart, mapping] of Object.entries(PREFIX_MAP)) {
      if (src.path.replace(/\\/g, "/").includes(pathPart)) {
        prefix = mapping.prefix;
        domain = mapping.domain;
        break;
      }
    }

    // Extract number from ID, fallback to unique hash
    const numMatch = src.id.match(/(\d+)/);
    const num = numMatch ? numMatch[1].padStart(3, "0") : src.id.slice(-8);
    const newId = `${prefix}-${num}`;

    const structure: Record<string, unknown> = {
      original_id: src.id,
      prefixed_id: newId,
      domain,
      title: src.title,
      status: src.status,
      body: src.content.substring(0, 4000),
    };

    return {
      asset_type: "adr",
      id: newId,
      canonical: true,
      metadata: {
        title: src.title,
        version: src.version,
        owner: src.owner,
        consumer: src.consumer,
        checksum: sha256(JSON.stringify(structure) + src.version),
        compiled_at: new Date().toISOString(),
        source_hash: src.checksum,
        source_paths: [src.path],
        dependencies: src.dependencies,
        inherits: [],
        knowledge_level: "governing",
        status: src.status,
      },
      structure,
      traceability: { compiled_by: "DGPS", compiler_version: "1.0.0" },
    };
  });
}
