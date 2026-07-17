import type { BusinessFact } from "../../business-intelligence/core/types";
import type { OperationalSituation } from "../core";
import { buildSituation } from "../core";
import { buildContext } from "./ContextBuilder";
import { selectRelevantFacts } from "./FactSelector";
import { buildSituationPrompt } from "./prompts";

interface AIAnalysisResult {
  title: string;
  description: string;
  severity: OperationalSituation["severity"];
  financialImpact?: OperationalSituation["financialImpact"];
  operationalImpact?: OperationalSituation["operationalImpact"];
  candidateDecisions: Array<{
    title: string;
    actionType: string;
    confidence: number;
  }>;
}

export class AIReasoningEngine {
  private enabled = true;

  setEnabled(val: boolean): void {
    this.enabled = val;
  }

  async analyze(facts: BusinessFact[], branchId?: number): Promise<OperationalSituation | null> {
    if (!this.enabled) return null;

    const selected = selectRelevantFacts(facts, branchId);
    if (selected.length === 0) return null;

    const contextSummary = buildContext({ facts: selected, branchId });
    const prompt = buildSituationPrompt({
      domain: selected[0]?.domain ?? "general",
      facts: selected.map(f => ({
        name: f.name,
        value: f.value,
        description: f.description,
        severity: f.severity,
      })),
      contextSummary,
    });

    let result: AIAnalysisResult | null = null;

    try {
      const { executiveReason } = await import("../../ai/runtime/execution/ExecutiveReasoner");
      const llmResult = await executiveReason({ persona: prompt, context: prompt, userId: 0 });
      result = this.parseResponse(llmResult.content);
    } catch (err) {
      console.error("[AIReasoningEngine] LLM call failed:", err);
      return null;
    }

    if (!result) return null;

    const primaryFact = selected[0];

    return buildSituation(primaryFact, {
      title: result.title,
      description: result.description,
      severity: result.severity,
      financialImpact: result.financialImpact,
      operationalImpact: result.operationalImpact,
      candidateDecisions: result.candidateDecisions.map((cd, i) => ({
        id: `ai-cd-${primaryFact.id}-${i}`,
        title: cd.title,
        description: cd.title,
        actionType: cd.actionType,
        params: {},
        confidence: cd.confidence,
      })),
      source: "ai",
    });
  }

  private parseResponse(raw: string): AIAnalysisResult | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]) as AIAnalysisResult;
    } catch {
      console.error("[AIReasoningEngine] Failed to parse LLM response");
      return null;
    }
  }
}

export const aiReasoningEngine = new AIReasoningEngine();
