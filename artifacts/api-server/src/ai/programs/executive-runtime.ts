// ECP-041: Executive Runtime — Generic Foundation v2.0 executive template
// Semua executive baru (CFO, CMO, CHRO, CIO) menggunakan skeleton ini.
// Hanya perlu mengisi: Identity, Directive, Decision.
// Seluruh lifecycle dan policy dimiliki oleh Governor melalui ExecutionPipeline.

import { getIdentity } from "../runtime/identity";
import { understand } from "../runtime/semantic-engine";
import { buildSpecV1 } from "../runtime/execution-spec";
import { verify } from "../runtime/verification-engine";
import { getFoundationProvider } from "../runtime/foundation";
import { assemble } from "../runtime/prompt-assembler";
import { JSON_OUTPUT_SCHEMA } from "../../routes/ai-prompts";
import { ExecutionPipeline } from "../runtime/execution/execution-pipeline";
import type { ExecutionContract } from "../runtime/execution/execution-manifest";
import { consultantRuntime } from "../../programs/consultant";

export interface ExecutiveTask {
  message: string;
  userId: number;
  onProgress?: (msg: string) => void;
}

export interface ExecutiveResult {
  success: boolean;
  text: string;
  pipeline: string[];
}

export interface ExecutiveConfig {
  role: string;
  outputDescription: string;  // Natural language description of expected output format
}

/** Create an executive runtime from config. Identity + Directive + Output Schema only. */
export function createExecutiveRuntime(config: ExecutiveConfig) {
  const execIdentity = getIdentity(config.role)!;
  if (!execIdentity) throw new Error(`Executive identity not found: ${config.role}`);

  function getDirective(): string {
    const provider = getFoundationProvider();
    const content = provider.getDirective(config.role);
    return content || "";
  }

  async function execute(task: ExecutiveTask, execContract?: ExecutionContract): Promise<ExecutiveResult> {
    const pipeline: string[] = [];

    pipeline.push("Identity");
    const directiveContent = getDirective();
    pipeline.push("Directive");

    pipeline.push("SemanticEngine");
    const contract = await understand(task.message, task.userId);

    pipeline.push("ExecutionSpec");
    const spec = buildSpecV1(contract);

    pipeline.push("Verification");
    const verification = verify(spec);
    if (!verification.passed) {
      return { success: false, text: `❌ ${verification.stopReason}`, pipeline };
    }

    // CKO Consultation — project structure spesifik per executive
    let ckoText = "";
    const ckoMode = config.role === "CFO" ? "cfo_advisory" as const : "founder_advisory" as const;
    try {
      const ckoResult = await consultantRuntime.analyze(ckoMode, task.message);
      if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
    } catch { /* CKO unavailable */ }
    pipeline.push("CKO");

    // Decision: structured report from LLM via ExecutionPipeline (Governor-owned)
    pipeline.push("PipelineLLM");
    let systemPrompt = assemble({
      identity: execIdentity,
      directive: directiveContent,
      outputSchema: JSON_OUTPUT_SCHEMA,
      maxTokens: 800,
      mode: config.role.toLowerCase(),
    });
    if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n`;
    const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: task.message }];
    const execResult = await ExecutionPipeline.execute(
      { role: "COO" },
      messages, [], 800, task.userId, config.role.toLowerCase(), task.message, true,
      { onProgress: task.onProgress },
      { complexity: "simple", domain: spec.domain, objective: spec.objective },
    );

    pipeline.push("Result");
    return {
      success: !execResult.text.startsWith("Error"),
      text: execResult.text || "✅ Laporan selesai.",
      pipeline,
    };
  }

  function health() {
    return {
      status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
      custom: { role: config.role, maturity: "L1" },
    };
  }

  return {
    name: `${config.role}Runtime`,
    version: "1.0.0",
    capabilities: execIdentity.capabilities,
    dependencies: ["FoundationLoader", "SemanticEngine", "ExecutionPipeline"],
    health,
    execute,
  };
}

/** Pre-built executive runtimes */
export const cfoRuntime = createExecutiveRuntime({ role: "CFO", outputDescription: "Financial report with budget analysis" });
export const cmoRuntime = createExecutiveRuntime({ role: "CMO", outputDescription: "Marketing analytics and customer insights" });
export const chroRuntime = createExecutiveRuntime({ role: "CHRO", outputDescription: "Personnel and scheduling report" });
export const cioRuntime = createExecutiveRuntime({ role: "CIO", outputDescription: "Infrastructure and security status report" });
