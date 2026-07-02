// ECP-018: COO Runtime — Chief Operations Officer
// Foundation v2.0 compliant. BusinessPlanner first, LLM fallback.
// COO NEVER makes engineering decisions.

import { getIdentity } from "../ai/runtime/identity";
import { understand } from "../ai/runtime/semantic-engine";
import { buildSpecV1 } from "../ai/runtime/execution-spec";
import { verify } from "../ai/runtime/verification-engine";
import { foundationLoader } from "../ai/runtime/foundation-loader";
import { assemble } from "../ai/runtime/prompt-assembler";
import { JSON_OUTPUT_SCHEMA } from "../routes/ai-prompts";
import { callDeepSeek } from "../routes/ai-helpers";
import { executeOperation } from "../routes/ai-business";

const COO_IDENTITY = getIdentity("COO")!;

let _cachedDirective: string | null = null;
function getDirective(): string {
  if (_cachedDirective) return _cachedDirective;
  const assets = foundationLoader.load();
  const directive = assets.find(a => a.id === "coo-directive-v1");
  _cachedDirective = directive?.content || "";
  return _cachedDirective;
}

interface COOTask {
  message: string;
  userId: number;
  branchId?: number;
  onProgress?: (msg: string) => void;
}

interface BusinessPlan {
  action: string;
  params: Record<string, any>;
  priority: "normal" | "high" | "critical";
  confidence: number;
  reason: string;
}

interface COOResult {
  success: boolean;
  text: string;
  pipeline: string[];
}

const businessRules: { pattern: RegExp; action: string; extractParams: (match: RegExpMatchArray, msg: string) => Record<string, any> }[] = [
  { pattern: /\b(tambah|add|isi).*(stok|stock)\b.*\b(\d+)/i, action: "add_stock", extractParams: (m, msg) => ({ itemName: msg.replace(m[0], "").trim() || "item", qty: Number(m[3]), itemType: "ingredient" }) },
  { pattern: /\b(kurang|kurangi|reduce).*(stok|stock)\b/i, action: "reduce_stock", extractParams: (m, msg) => ({ itemName: msg.replace(m[0], "").trim() || "item" }) },
  { pattern: /\b(koreksi|correct).*(stok|stock)\b/i, action: "correct_stock", extractParams: (_m, msg) => ({ itemName: msg }) },
  { pattern: /\b(tambah|buat|add|create).*(produk|product)\b/i, action: "add_product", extractParams: (_m, msg) => {
    const priceMatch = msg.match(/\b(\d{3,})\b/);
    const name = msg.replace(/\b(tambah|buat|add|create).*(produk|product)\b/i, "").replace(/\b\d{3,}\b/, "").trim();
    return { name: name || "Produk Baru", price: priceMatch ? Number(priceMatch[1]) : 0 };
  }},
  { pattern: /\b(nonaktif|deactivate).*(produk|product)\b/i, action: "deactivate_product", extractParams: (_m, msg) => ({ productName: msg }) },
  { pattern: /\b(status|cek).*(stok|inventory|inventaris)\b/i, action: "get_inventory_status", extractParams: () => ({}) },
  { pattern: /\b(laporan|report|summary).*(penjualan|sales|omset)\b/i, action: "get_sales_summary", extractParams: (m) => ({ period: m[0].includes("minggu") || m[0].includes("week") ? "week" : m[0].includes("bulan") || m[0].includes("month") ? "month" : "today" }) },
  { pattern: /\b(top|populer).*(produk|product)\b/i, action: "get_top_products", extractParams: () => ({ limit: 5, period: "today" }) },
  { pattern: /\b(shift|audit)\b/i, action: "get_shift_audit", extractParams: () => ({}) },
  { pattern: /\b(migrasi|migrate).*(data|cabang|branch)\b/i, action: "migrate_branch", extractParams: (_m, msg) => {
    const branches = msg.match(/(?:dari|from)\s+["']?(\w+)/i);
    const target = msg.match(/(?:ke|to)\s+["']?(\w+)/i);
    return { sourceBranchName: branches?.[1] || "", targetBranchName: target?.[1] || "", overwrite: true };
  }},
  { pattern: /\b(tambah|add|catat).*(pengeluaran|expense|biaya)\b/i, action: "add_expense", extractParams: (_m, msg) => {
    const amountMatch = msg.match(/\b(\d{3,})\b/);
    return { amount: amountMatch ? Number(amountMatch[1]) : 0, description: msg };
  }},
  { pattern: /\b(tambah|add).*(bahan|ingredient)\b/i, action: "add_ingredient", extractParams: (_m, msg) => ({ name: msg, unit: "gram" }) },
  { pattern: /\b(tambah|add).*(setengah jadi|semi)\b/i, action: "add_semi_finished", extractParams: (_m, msg) => ({ name: msg, unit: "gram" }) },
  { pattern: /\b(ubah|update|ganti).*(harga|price)\b/i, action: "update_price", extractParams: (_m, msg) => {
    const priceMatch = msg.match(/\b(\d{3,})\b/);
    return { productName: msg, price: priceMatch ? Number(priceMatch[1]) : 0 };
  }},
];

function plan(message: string): BusinessPlan | null {
  const lower = message.toLowerCase();
  for (const rule of businessRules) {
    if (rule.pattern.test(lower)) {
      const match = lower.match(rule.pattern)!;
      return {
        action: rule.action,
        params: rule.extractParams(match, message),
        priority: "normal",
        confidence: 90,
        reason: `Matched business rule: ${rule.action}`,
      };
    }
  }
  return null;
}

async function execute(task: COOTask): Promise<COOResult> {
  const pipeline: string[] = [];
  const branchId = task.branchId || 1;

  // Stage 1: Identity
  pipeline.push("Identity");

  // Stage 2: Directive (cached)
  pipeline.push("Directive");
  const directiveContent = getDirective();

  // Stage 3: Semantic Understanding
  pipeline.push("SemanticEngine");
  const contract = await understand(task.message);

  // Stage 4: Execution Specification
  pipeline.push("ExecutionSpec");
  const spec = buildSpecV1(contract);

  // Stage 5: Verification
  pipeline.push("Verification");
  const verification = verify(spec);
  if (!verification.passed) {
    return { success: false, text: `❌ ${verification.stopReason}`, pipeline };
  }

  // Stage 6: Business Planner (deterministic first)
  pipeline.push("BusinessPlanner");
  const businessPlan = plan(task.message);

  let result = "";
  if (businessPlan && businessPlan.confidence >= 80) {
    // High confidence — execute directly
    pipeline.push("ExecuteOperation");
    result = await executeOperation(businessPlan.action, businessPlan.params, branchId);
  } else if (businessPlan) {
    // Low confidence — LLM fallback
    pipeline.push("LLMEngine");
    const systemPrompt = assemble({
      identity: COO_IDENTITY,
      directive: directiveContent,
      decision: businessPlan,
      outputSchema: JSON_OUTPUT_SCHEMA,
      maxTokens: 800,
      mode: "bisnis",
    });
    const raw = await callDeepSeek(systemPrompt, task.message, task.userId, "bisnis", 800, true);
    pipeline.push("ExecuteOperation");
    try {
      const parsed = JSON.parse(raw);
      result = await executeOperation(parsed.action, parsed.params, branchId);
    } catch { result = raw; }
  } else {
    // No rule match — LLM full generation
    pipeline.push("LLMEngine");
    const systemPrompt = assemble({
      identity: COO_IDENTITY,
      directive: directiveContent,
      outputSchema: JSON_OUTPUT_SCHEMA,
      maxTokens: 800,
      mode: "bisnis",
    });
    const raw = await callDeepSeek(systemPrompt, task.message, task.userId, "bisnis", 800, true);
    try {
      const parsed = JSON.parse(raw);
      pipeline.push("ExecuteOperation");
      result = await executeOperation(parsed.action, parsed.params, branchId);
    } catch { result = raw; }
  }

  pipeline.push("BusinessResult");
  return {
    success: !result.startsWith("Error") && !result.startsWith("❌"),
    text: result === "ok" ? "✅ Operasi berhasil." : result,
    pipeline,
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { directive: "coo-directive-v1", maturity: "L1" },
  };
}

export const cooRuntime = {
  name: "COORuntime",
  version: "1.0.0",
  capabilities: ["inventory-management", "sales-tracking", "product-management", "branch-operations"],
  dependencies: ["FoundationLoader", "SemanticEngine", "BusinessPlanner", "LLM"],
  health,
  execute,
};

export default cooRuntime;
