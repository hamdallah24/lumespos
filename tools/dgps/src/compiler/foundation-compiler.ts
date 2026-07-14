import { sha256 } from "../utils/checksum.js";
import type { DocumentSource, CompiledAsset } from "../types/index.js";

export function compileFoundation(sources: DocumentSource[]): CompiledAsset[] {
  const foundation = sources.filter(s =>
    s.category === "constitution" || s.category === "knowledge"
  );

  return foundation.map(src => {
    const id = `foundation-${src.id}`;
    const structure: Record<string, unknown> = {
      source_id: src.id,
      content_type: src.category,
      body: src.content.substring(0, 4000),
    };

    return {
      asset_type: "foundation",
      id,
      canonical: true,
      metadata: {
        title: `Foundation: ${src.title}`,
        version: src.version,
        owner: src.owner,
        consumer: src.consumer,
        checksum: sha256(JSON.stringify(structure) + src.version),
        compiled_at: new Date().toISOString(),
        source_hash: src.checksum,
        source_paths: [src.path],
        dependencies: [],
        inherits: [],
        knowledge_level: "foundational",
        status: src.status,
      },
      structure,
      traceability: { compiled_by: "DGPS", compiler_version: "1.0.0" },
    };
  });
}
