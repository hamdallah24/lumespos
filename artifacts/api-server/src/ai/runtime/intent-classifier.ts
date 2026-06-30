// SPRINT 9: Intent Classifier — what does the Founder actually want?
// Replaces needsDevOps keyword matching with structured intent detection.

export type IntentCategory =
  | "analyze_code"       // Read/analyze files, find bugs, explain code
  | "implement_change"   // Write/edit code, generate features
  | "devops_operation"   // SSH, deploy, restart, check VPS
  | "knowledge_query"    // Ask about architecture, standards, docs
  | "business_action"    // COO: inventory, orders, migrate
  | "greeting"           // "halo", "test", "ok"
  | "approval"           // "SETUJU", "approve", "merge"
  ;

export interface IntentResult {
  category: IntentCategory;
  confidence: number;         // 0-100
  complexity: "simple" | "medium" | "complex";
  requiresTools: boolean;
  suggestedToolSet: "READ_TOOLS" | "DEVOPS_TOOLS" | "NONE" | "BUSINESS";
  needsApproval: boolean;
  mode: "cto" | "bisnis" | "chat";
  extracted: {
    filePaths: string[];      // File paths mentioned in request
    keywords: string[];       // Key technical terms
    actions: string[];        // Requested actions: "analyze", "fix", "deploy", etc.
  };
  reason: string;             // Human-readable explanation
}

/** Classify user intent from message */
export function classifyIntent(message: string): IntentResult {
  const lower = message.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const extracted = extractEntities(lower);

  // Layer 1: Greetings (fastest — no tools)
  if (/^(halo|hai|hi|hey|test|ok|ya|tidak|thanks|makasih|p)$/.test(lower)) {
    return buildResult("greeting", 99, "simple", "NONE", false, "chat", extracted, "Direct greeting detected");
  }

  // Layer 2: Approval patterns
  if (/^(setuju|approve|merge|lanjut|ok generate)/.test(lower)) {
    return buildResult("approval", 95, "simple", "NONE", false, "cto", extracted, "Approval pattern detected");
  }

  // Layer 3: DevOps operations (explicit server/VPS commands)
  const devopsSignals = [
    /\b(vps|server|ssh|deploy|pm2|nginx|restart|reboot)\b/,
    /\b(git pull|git merge|git push|git stash)\b/,
    /\b(cek server|cek vps|status server|uptime|free -m|df -h)\b/,
    /\b(build|pnpm.*build|npm.*build)\b/,
  ];
  const devopsHits = devopsSignals.filter(r => r.test(lower)).length;

  if (devopsHits >= 1) {
    return buildResult("devops_operation", 80 + devopsHits * 5, "medium", "DEVOPS_TOOLS", false, "cto", extracted,
      `DevOps signals detected: ${devopsHits} matches`);
  }

  // Layer 4: Business actions (COO domain)
  const businessSignals = [
    /\b(tambah|buat|input|catat).*(produk|stok|bahan|varian)\b/,
    /\b(migrasi|migrate).*(data|cabang|branch)\b/,
    /\b(laporan|penjualan|omset|revenue|profit)\b/,
    /\b(harga|price|diskon|discount)\b/,
    /\b(invent(ory|aris)|stok|stock)\b/,
    /\b(order|pesan|transaksi)\b/,
  ];
  if (businessSignals.some(r => r.test(lower))) {
    return buildResult("business_action", 85, "medium", "BUSINESS", false, "bisnis", extracted,
      "Business operation detected");
  }

  // Layer 5: Code analysis (read-only)
  const analysisSignals = [
    /\b(anal(i|y)sa?|analisis|review|audit|cek|periksa|lihat|baca|read|show|find).*(kode|code|file|bug|error|fungsi)\b/,
    /\b(bagaimana|how).*(kerja|bekerja|flow|logika)\b/,
    /\b(temukan|find|search|cari).*(bug|error|masalah|issue|pattern)\b/,
    /\b(jelaskan|explain|terangkan|apa|what).*(code|kode|fungsi|function)\b/,
    extracted.filePaths.length > 0 && !/\b(fix|perbaiki|ubah|ganti|tambah|buat|generate)\b/.test(lower),
  ];
  if (analysisSignals.some(r => typeof r === "boolean" ? r : r.test(lower))) {
    return buildResult("analyze_code", 82, "medium", "READ_TOOLS", false, "cto", extracted,
      "Code analysis requested — read-only tools sufficient");
  }

  // Layer 6: Implementation (write/edit code)
  const implementationSignals = [
    /\b(fix|perbaiki|ubah|ganti|update|tambah|buat|generate|implement|refactor)\b.*\b(code|kode|file|fungsi|function|bug)\b/,
    /\b(add|create|remove|delete|rename).*(file|folder|component|route|endpoint)\b/,
  ];
  if (implementationSignals.some(r => r.test(lower))) {
    const needsApproval = /\b(foundation|constitution|governance|security|database|schema)\b/.test(lower);
    return buildResult("implement_change", 80, "complex", "READ_TOOLS", needsApproval, "cto", extracted,
      "Implementation requested" + (needsApproval ? " — touches Foundation/security" : ""));
  }

  // Layer 7: Knowledge query (about architecture, docs, standards)
  const knowledgeSignals = [
    /\b(apa|what|jelaskan|explain).*(itu|is|arsitektur|architecture|standar|standard|pola|pattern|desain|design)\b/,
    /\b(constitution|north.star|operating.model|governance|adr)\b/,
    /\b(best.practice|best.practice|rekomendasi|recommendation)\b/,
  ];
  if (knowledgeSignals.some(r => r.test(lower))) {
    return buildResult("knowledge_query", 85, "simple", "NONE", false, "cto", extracted,
      "Knowledge query — answerable from Foundation docs");
  }

  // Default: analyze (conservative — read-only, assume intent is to understand)
  return buildResult("analyze_code", 60, "medium", "READ_TOOLS", false, "cto", extracted,
    "Default: assume code analysis with read-only tools");
}

function extractEntities(text: string) {
  const filePaths = (text.match(/(?:artifacts\/|lib\/|src\/|\.ai\/)?[\w\-\/]+\.\w{2,4}/g) || [])
    .filter(p => !p.startsWith("http") && p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".md") || p.endsWith(".json"))
    .slice(0, 5);

  const keywords = text.match(/\b(?:constitution|governance|security|runtime|foundation|planner|knowledge|context|prompt|memory|identity|registry|circuit|breaker|validator|loader|builder|assembler)\b/g) || [];

  const actions = text.match(/\b(?:analisis|analisa|review|audit|fix|perbaiki|ubah|tambah|buat|generate|deploy|restart|build|migrate|check|cek|debug)\b/g) || [];

  return { filePaths, keywords: [...new Set(keywords)], actions: [...new Set(actions)] };
}

function buildResult(
  category: IntentCategory, confidence: number, complexity: "simple" | "medium" | "complex",
  toolSet: "READ_TOOLS" | "DEVOPS_TOOLS" | "NONE" | "BUSINESS", needsApproval: boolean,
  mode: "cto" | "bisnis" | "chat", extracted: any, reason: string,
): IntentResult {
  return { category, confidence: Math.min(confidence, 100), complexity, requiresTools: toolSet !== "NONE",
    suggestedToolSet: toolSet, needsApproval, mode, extracted, reason };
}

// Component metadata
export const intentClassifier = {
  name: "IntentClassifier",
  version: "1.0.0",
  capabilities: ["intent-detection", "complexity-assessment", "tool-set-selection", "entity-extraction"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  classify: classifyIntent,
};
