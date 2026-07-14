import { sha256 } from "../utils/checksum.js";
import type { DocumentSource, CompiledAsset } from "../types/index.js";

export function compileKnowledge(sources: DocumentSource[]): CompiledAsset[] {
  const knowledge = sources.filter(s => s.category === "knowledge");
  const cognition = sources.filter(s => s.category === "cognition");

  // Build mental model index
  const models = knowledge.filter(s => /mental.?model/i.test(s.title || s.path));
  const frameworks = knowledge.filter(s => /framework/i.test(s.title || s.path));
  const taxonomy = knowledge.find(s => /taxonom/i.test(s.title || s.path));

  const assets: CompiledAsset[] = [];

  // Individual knowledge assets
  for (const src of knowledge) {
    const id = `knowledge-${src.id}`;
    assets.push({
      asset_type: "knowledge",
      id,
      canonical: true,
      metadata: {
        title: `Knowledge: ${src.title}`,
        version: src.version,
        owner: src.owner,
        consumer: src.consumer,
        checksum: sha256(src.content + src.version),
        compiled_at: new Date().toISOString(),
        source_hash: src.checksum,
        source_paths: [src.path],
        dependencies: [],
        inherits: [],
        knowledge_level: "canonical",
        status: src.status,
      },
      structure: {
        source_id: src.id,
        content_type: "knowledge",
        body: src.content.substring(0, 4000),
        knowledge_fingerprint: {
          mental_models: models.map(m => m.id),
          frameworks: frameworks.map(f => f.id),
          taxonomy: taxonomy?.id || null,
          confidence: 0.9,
          source_hash: src.checksum,
        },
      },
      traceability: { compiled_by: "DGPS", compiler_version: "1.0.0" },
    });
  }

  // Cognition docs
  for (const src of cognition) {
    const id = `cognition-${src.id}`;
    assets.push({
      asset_type: "knowledge",
      id,
      canonical: false,
      metadata: {
        title: `Cognition: ${src.title}`,
        version: src.version,
        owner: src.owner,
        consumer: src.consumer,
        checksum: sha256(src.content + src.version),
        compiled_at: new Date().toISOString(),
        source_hash: src.checksum,
        source_paths: [src.path],
        dependencies: [],
        inherits: [],
        knowledge_level: "reference",
        status: src.status,
      },
      structure: {
        source_id: src.id,
        content_type: "cognition",
        body: src.content.substring(0, 4000),
      },
      traceability: { compiled_by: "DGPS", compiler_version: "1.0.0" },
    });
  }

  return assets;
}
