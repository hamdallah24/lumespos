import { sha256 } from "../utils/checksum.js";
import type { DocumentSource, CompiledAsset } from "../types/index.js";

const EXECUTIVES = ["CEO", "CTO", "COO", "CFO", "CMO", "CAIO", "CKO", "CHRO"] as const;

export function compileDirectives(sources: DocumentSource[]): CompiledAsset[] {
  const assets: CompiledAsset[] = [];

  for (const exec of EXECUTIVES) {
    const normPath = (s: DocumentSource) => s.path.replace(/\\/g, "/");
    const spec = sources.find(s => s.category === "executive-spec" && normPath(s).includes(`/${exec}/`));
    const playbook = sources.find(s => s.category === "executive-playbook" && normPath(s).includes(`/${exec}/`));
    const prompt = sources.find(s => s.category === "executive-prompt" && normPath(s).includes(`/${exec}/`));

    if (!spec && !playbook && !prompt) {
      console.warn(`[DGPS] No source documents found for ${exec}, skipping directive`);
      continue;
    }

    const id = `${exec.toLowerCase()}-directive`;
    const sourcePaths = [spec?.path, playbook?.path, prompt?.path].filter(Boolean) as string[];
    const version = spec?.version || "1.0.0";
    const owner = exec;
    const consumer = [`${exec.toLowerCase()}-runtime`];

    const structure: Record<string, unknown> = {
      identity: extractIdentity(spec),
      capabilities: extractCapabilities(spec, playbook),
      decision_rules: extractDecisionRules(playbook),
      workflow: extractWorkflow(playbook),
      prompt: extractPromptAst(prompt),
    };

    const contentJson = JSON.stringify(structure);
    const checksum = sha256(contentJson + version);

    const asset: CompiledAsset = {
      asset_type: "directive",
      id,
      canonical: true,
      metadata: {
        title: `${exec} Runtime Directive`,
        version,
        owner,
        consumer,
        checksum,
        compiled_at: new Date().toISOString(),
        source_hash: sha256(sourcePaths.join("|")),
        source_paths: sourcePaths,
        dependencies: ["foundation", "constitution", "global-prompt"],
        inherits: ["global-prompt"],
        knowledge_level: "runtime",
        status: "active",
      },
      structure,
      traceability: {
        compiled_by: "DGPS",
        compiler_version: "1.0.0",
      },
    };

    assets.push(asset);
  }

  return assets;
}

function extractIdentity(spec?: DocumentSource): Record<string, unknown> {
  if (!spec) return {};
  const lines = spec.content.split("\n").slice(0, 20).join(" ").substring(0, 500);
  return { source: lines };
}

function extractCapabilities(spec?: DocumentSource, playbook?: DocumentSource): unknown[] {
  const caps: unknown[] = [];
  const text = [spec?.content || "", playbook?.content || ""].join("\n");
  const capMatch = text.match(/## (?:Capabilities|Responsibilities|Authority)[\s\S]*?(?=\n## |$)/);
  if (capMatch) caps.push({ source: capMatch[0].substring(0, 1000) });
  return caps;
}

function extractDecisionRules(playbook?: DocumentSource): Record<string, unknown> {
  if (!playbook) return {};
  const text = playbook.content;
  const rules: Record<string, unknown> = {};
  const treeMatch = text.match(/## Decision Tree[\s\S]*?(?=\n## |$)/);
  if (treeMatch) rules.decision_tree = treeMatch[0].substring(0, 1000);
  return rules;
}

function extractWorkflow(playbook?: DocumentSource): Record<string, unknown> {
  if (!playbook) return { nodes: [], edges: [] };
  const text = playbook.content;
  const wfMatch = text.match(/## (?:Workflow|Thinking Process)[\s\S]*?(?=\n## |$)/);
  return wfMatch
    ? { nodes: ["analyze", "decide", "execute", "review"], edges: [{ from: "analyze", to: "decide" }, { from: "decide", to: "execute" }], source: wfMatch[0].substring(0, 1000) }
    : { nodes: [], edges: [] };
}

function extractPromptAst(prompt?: DocumentSource): Record<string, unknown> {
  if (!prompt) return { ast: true, layers: {} };
  const text = prompt.content;
  const sections = text.split(/^## /m);
  const layers: Record<string, { role: string; content: string }> = {};

  for (const section of sections) {
    const header = section.split("\n")[0]?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "") || "";
    const body = section.split("\n").slice(1).join("\n").trim();
    if (header && body) {
      layers[header] = { role: "system", content: body.substring(0, 2000) };
    }
  }

  return { ast: true, schema_version: "1.0", ...layers };
}
