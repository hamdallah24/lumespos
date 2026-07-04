// ECP-043 Sprint 1: Mission Analyzer
// Converts input signals into a MissionProfile.
// No execution. No decisions. Only profiling.

import type {
  MissionProfile, MissionCategory, ComplexityLevel,
  UrgencyLevel, ReasoningDepth, ExplorationLevel,
  ExecutionCost, ConfidenceRequirement,
} from "./mission-profile";
import { createMissionId } from "./mission-profile";

export interface MissionInput {
  message: string;
  role: string;
  intent?: string;
  domain?: string;
  entities?: string[];
  confidence?: number;
}

export class MissionAnalyzer {

  /** Analyze input and produce a MissionProfile */
  analyze(input: MissionInput): MissionProfile {
    const lower = input.message.toLowerCase();
    const intent = input.intent || "";
    const domain = input.domain || "";

    return {
      missionId: createMissionId(),
      category:       this.inferCategory(lower, intent, domain),
      complexity:     this.inferComplexity(lower, intent, input.entities || []),
      urgency:        this.inferUrgency(lower),
      reasoningDepth: this.inferReasoningDepth(lower, input.confidence || 80),
      explorationLevel: this.inferExplorationLevel(lower, input.entities || []),
      executionCost:  this.inferCost(lower, intent),
      confidenceRequirement: this.inferConfidenceReq(lower, intent),
    };
  }

  // ── Category Inference ──

  private inferCategory(lower: string, intent: string, domain: string): MissionCategory {
    if (/(deploy|production|release|live|staging)/i.test(lower)) return "DEPLOYMENT";
    if (/(bug|error|fix|broken|gagal|error|crash|exception)/i.test(lower)) return "DEBUG";
    if (/(buat|tambah|implement|generate|create|build|write|code)/i.test(lower)) return "IMPLEMENTATION";
    if (/(analisa|analisis|review|inspect|examine|periksa|audit)/i.test(lower)) return "ANALYSIS";
    if (/(laporan|report|sales|stok|inventory|bisnis|operasi|shift)/i.test(lower)) return "BUSINESS";
    if (/(ops|operational|monitor|status|cek|check|health)/i.test(lower)) return "OPERATIONS";
    return "QUESTION";
  }

  // ── Complexity Inference ──

  private inferComplexity(lower: string, intent: string, entities: string[]): ComplexityLevel {
    if (/(refactor|migrate|restruktur|rewrite|full\s+stack|semua|seluruh)/i.test(lower)) return "EXTREME";
    if (/(deploy|production|live|critical|urgent|sekarang|darurat)/i.test(lower)) return "HIGH";
    if (entities.length >= 3) return "HIGH";
    if (entities.length >= 1 || intent === "implement_change") return "MEDIUM";
    if (/(help|tanya|apa|bagaimana|gimana|cara)/i.test(lower)) return "LOW";
    return "MEDIUM";
  }

  // ── Urgency Inference ──

  private inferUrgency(lower: string): UrgencyLevel {
    if (/(urgent|sekarang|darurat|critical|production|down|crash)/i.test(lower)) return "CRITICAL";
    if (/(cepat|segera|asap|hari ini|today)/i.test(lower)) return "HIGH";
    if (/(minggu depan|next week|nanti|kapan-kapan)/i.test(lower)) return "LOW";
    return "NORMAL";
  }

  // ── Reasoning Depth ──

  private inferReasoningDepth(lower: string, confidence: number): ReasoningDepth {
    if (/(mendalam|deep|thorough|komprehensif|lengkap|detail)/i.test(lower)) return "DEEP";
    if (confidence < 60) return "DEEP";
    if (confidence < 85) return "NORMAL";
    if (/(singkat|pendek|quick|cepat|ringkas)/i.test(lower)) return "SHALLOW";
    return "NORMAL";
  }

  // ── Exploration Level ──

  private inferExplorationLevel(lower: string, entities: string[]): ExplorationLevel {
    if (/(semua|seluruh|full|complete|thorough|deep|explore|eksplor)/i.test(lower)) return "FULL";
    if (entities.length === 0) return "NONE";
    if (entities.length <= 2) return "LIMITED";
    return "FULL";
  }

  // ── Cost Inference ──

  private inferCost(lower: string, intent: string): ExecutionCost {
    if (/(deploy|production|refactor|migrate|full|semua)/i.test(lower)) return "EXPENSIVE";
    if (/(hello|halo|test|p|thanks|makasih)/i.test(lower)) return "CHEAP";
    if (intent === "greeting") return "CHEAP";
    return "NORMAL";
  }

  // ── Confidence Requirement ──

  private inferConfidenceReq(lower: string, intent: string): ConfidenceRequirement {
    if (/(deploy|production|critical|security|finance|uang|harga)/i.test(lower)) return "HIGH";
    if (/(analisa|analysis|review|audit)/i.test(lower)) return "HIGH";
    if (/(hello|halo|test|tanya|apa)/i.test(lower)) return "LOW";
    return "MEDIUM";
  }
}

export const missionAnalyzer = new MissionAnalyzer();
