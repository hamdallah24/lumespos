// ECP-044 Sprint 3: Reflection Engine
// Evaluates experience → produces structured Reflection.
// Mandatory after every mission. Generates new knowledge.

import type { Experience, Reflection } from "./learning-types";
import { createReflectionId } from "./learning-types";

const REFLECTION_QUESTIONS = [
  "Apa tujuan misi?",
  "Apa yang berhasil?",
  "Apa yang gagal?",
  "Apa penyebab kegagalan?",
  "Apa solusi terbaik?",
  "Apa pola baru yang ditemukan?",
  "Apa yang harus diingat?",
];

export class ReflectionEngine {

  /** Produce reflection from experience */
  reflect(experience: Experience, objective: string): Reflection {
    const strengths = this.extractStrengths(experience);
    const weaknesses = this.extractWeaknesses(experience);
    const improvements = this.extractImprovements(experience);
    const newPatterns = this.extractPatterns(experience);

    return {
      id: createReflectionId(),
      experienceId: experience.id,
      missionObjective: objective,
      summary: this.buildSummary(experience, strengths, weaknesses),
      strengths,
      weaknesses,
      improvements,
      newPatterns,
      createdAt: new Date().toISOString(),
    };
  }

  private extractStrengths(exp: Experience): string[] {
    const s: string[] = [];
    if (exp.outcome === "SUCCESS") s.push("Mission completed successfully");
    if (exp.confidence > 80) s.push("High confidence execution");
    if (exp.duration < 30000 && exp.outcome !== "FAILURE") s.push("Efficient execution time");
    if (exp.lessons.length > 0) s.push("Actionable lessons captured");
    if (exp.tokenUsage < 8000) s.push("Efficient token usage");
    return s;
  }

  private extractWeaknesses(exp: Experience): string[] {
    const w: string[] = [];
    if (exp.outcome === "FAILURE") w.push("Mission failed");
    if (exp.outcome === "PARTIAL") w.push("Mission partially completed");
    if (exp.confidence < 50) w.push("Low confidence execution");
    if (exp.duration > 120000) w.push("Long execution time — consider optimization");
    if (exp.toolUsage > 20) w.push("High tool usage — may indicate inefficiency");
    return w;
  }

  private extractImprovements(exp: Experience): string[] {
    const i: string[] = [];
    if (exp.outcome !== "SUCCESS") i.push("Review execution strategy");
    if (exp.confidence < 70) i.push("Strengthen verification before execution");
    if (exp.duration > 60000) i.push("Consider breaking mission into smaller tasks");
    if (exp.lessons.some(l => l.includes("tool"))) i.push("Improve tool selection logic");
    return i;
  }

  private extractPatterns(exp: Experience): string[] {
    return exp.lessons
      .filter(l => l.includes("pattern") || l.includes("Pattern") || l.includes("pola"))
      .slice(0, 3);
  }

  private buildSummary(exp: Experience, strengths: string[], weaknesses: string[]): string {
    const outcome = exp.outcome === "SUCCESS" ? "berhasil" : exp.outcome === "PARTIAL" ? "sebagian berhasil" : "gagal";
    return `Misi ${outcome} dengan confidence ${exp.confidence}%. ` +
      `${strengths.length} kekuatan, ${weaknesses.length} kelemahan teridentifikasi.`;
  }

  /** Get reflection questions for manual/LLM reflection */
  getQuestions(): string[] {
    return REFLECTION_QUESTIONS;
  }
}

export const reflectionEngine = new ReflectionEngine();
