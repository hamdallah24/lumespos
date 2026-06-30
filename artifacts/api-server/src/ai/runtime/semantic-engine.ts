// SPRINT 9.3: Semantic Understanding Engine
// Law #008: LLM understands the human. OS decides the action.
// Replaces regex keyword matching with structured semantic parsing.

import { callDeepSeek } from "../../routes/ai-helpers";

export interface SemanticContract {
  intent: "analyze_code" | "implement_change" | "devops_operation" | "knowledge_query" | "business_action" | "greeting";
  problem: string;             // What the Founder wants (distilled)
  domain: string;              // "inventory" | "products" | "architecture" | "general"
  entities: string[];          // Key terms: ["inventory", "saveButton"]
  confidence: number;          // 0-100
  risk: "low" | "medium" | "high";
  requiredCapabilities: string[]; // ["readFiles", "searchCode", "ssh"]
  missingContext: string[];    // What we don't know yet
}

const SEMANTIC_PROMPT = `You are a semantic understanding engine. Parse the Founder's natural language into a structured JSON contract.

Output ONLY valid JSON. No markdown, no explanation.

{
  "intent": "analyze_code" | "implement_change" | "devops_operation" | "knowledge_query" | "business_action" | "greeting",
  "problem": "what the Founder actually wants — distilled to 1 sentence",
  "domain": "inventory" | "products" | "architecture" | "general" | "devops" | "business" | "knowledge",
  "entities": ["key", "terms", "from", "message"],
  "confidence": 0-100 (how sure are you about the intent?),
  "risk": "low" | "medium" | "high",
  "requiredCapabilities": ["readFiles", "searchCode", "ssh", "editCode", "none"],
  "missingContext": ["things", "we", "need", "to", "know"]
}

Rules:
- Greetings = greeting, confidence 99, risk low, capabilities ["none"]
- Simple questions = knowledge_query
- Code analysis = analyze_code
- Code changes = implement_change
- Server/VPS/SSH = devops_operation
- Business/migration = business_action
- If confidence < 70, mark as knowledge_query and flag missingContext`;

/** Understand Founder's natural language → structured contract */
export async function understand(message: string): Promise<SemanticContract> {
  // Fast path: greetings don't need LLM
  if (/^(halo|hai|hi|hey|test|ok|ya|p)$/i.test(message.trim())) {
    return {
      intent: "greeting", problem: "greeting", domain: "general", entities: [],
      confidence: 99, risk: "low", requiredCapabilities: ["none"], missingContext: [],
    };
  }

  try {
    const raw = await callDeepSeek(SEMANTIC_PROMPT, message, 0, "cto", 300);
    const parsed = JSON.parse(raw.trim());
    return {
      intent: parsed.intent || "analyze_code",
      problem: parsed.problem || message.slice(0, 100),
      domain: parsed.domain || "general",
      entities: parsed.entities || [],
      confidence: Math.min(parsed.confidence || 80, 100),
      risk: parsed.risk || "low",
      requiredCapabilities: parsed.requiredCapabilities || ["readFiles"],
      missingContext: parsed.missingContext || [],
    };
  } catch {
    // Fallback: conservative — assume analysis, read-only
    return {
      intent: "analyze_code", problem: message.slice(0, 100), domain: "general", entities: [],
      confidence: 60, risk: "low", requiredCapabilities: ["readFiles"], missingContext: ["LLM parsing failed"],
    };
  }
}

export const semanticEngine = {
  name: "SemanticEngine",
  version: "1.0.0",
  capabilities: ["natural-language-understanding", "intent-extraction", "entity-recognition"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  understand,
};
