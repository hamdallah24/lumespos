// ECP-019: Execution Metrics — evidence quality, stability, diversity
// Frozen. Tracks execution quality metrics without parsing LLM text.

import type { DecisionStability } from "./execution-manifest";

class ExecutionMetrics {
  evidenceQuality: number = 0;
  confidence: number = 0;
  sourceDiversity: number = 0;
  informationFreshness: number = 0;
  toolDiversityScore: number = 0;
  explorationDepth: number = 0;
  cyclesExecuted: number = 0;

  stability: DecisionStability = {
    flipCount: 0, toolPatternStable: true,
    fileFocusChanged: false, direction: "COLLECTING",
    directionChanges: 0, stable: true,
  };

  private _allToolNames: string[] = [];
  private _allPaths: string[] = [];

  recordCycle(cycleNum: number, toolCalls: { name: string; status?: "ok" | "error" }[], responseText?: string): void {
    this.cyclesExecuted = cycleNum;

    // Tool diversity
    this._allToolNames.push(...toolCalls.map(t => t.name));
    const uniqueTools = new Set(this._allToolNames);
    this.toolDiversityScore = this._allToolNames.length > 0
      ? uniqueTools.size / this._allToolNames.length : 0;

    // Track tool pattern for stability
    if (cycleNum > 1) {
      const currentTools = toolCalls.map(t => t.name).sort().join(",");
      const prevCycle = cycleNum > 1 ? this._allToolNames.slice(-toolCalls.length).join(",") : "";
      if (currentTools !== prevCycle) {
        this.stability.flipCount++;
        this.stability.toolPatternStable = false;
      }
    }

    // Direction inference
    if (toolCalls.length > 0) {
      const prevDir = this.stability.direction;
      const names = toolCalls.map(t => t.name);
      if (names.some(n => ["searchContent", "listDirectory"].includes(n))) {
        this.stability.direction = "COLLECTING";
      } else if (names.some(n => ["readFile", "fetchGitHubFile"].includes(n))) {
        this.stability.direction = "ANALYZING";
      }
      if (prevDir !== this.stability.direction && prevDir !== "CONCLUDING") {
        this.stability.directionChanges++;
      }
    }

    this.stability.stable = this.stability.flipCount === 0;

    // ADR-009 Phase 1: Evidence quality — real data, not cycle counter
    // Comment intent: "heuristic: files read + unique tools"
    // Bug fix: formula now uses collected data instead of placeholder cycleNum*0.15
    const uniqueFiles = new Set(this._allPaths).size;
    const totalTools = this._allToolNames.length;
    const failedTools = toolCalls.filter(tc => tc.status === "error").length;
    const successRate = totalTools > 0 ? (totalTools - failedTools) / totalTools : 0.5;

    this.evidenceQuality = Math.max(0.05, Math.min(1,
      (uniqueFiles * 0.12) +
      (this.toolDiversityScore * 0.35) +
      (this.explorationDepth * 0.05) +
      (successRate * 0.15)
    ));

    // ADR-009 Phase 1: Confidence — composite of evidence + tool success + diversity
    this.confidence = Math.min(100, Math.round(
      (this.evidenceQuality * 50) +
      (successRate * 30) +
      (this.toolDiversityScore * 20)
    ));
    this.sourceDiversity = this.toolDiversityScore;
  }

  recordExploration(path: string): void {
    this._allPaths.push(path);
    this.explorationDepth = Math.max(
      this.explorationDepth,
      path.split("/").filter(Boolean).length
    );
  }

  get uniqueFiles(): number { return new Set(this._allPaths).size; }

  snapshot() {
    return {
      evidenceQuality: this.evidenceQuality,
      confidence: this.confidence,
      decisionStability: this.stability.stable ? 1 : 0.5,
      cyclesExecuted: this.cyclesExecuted,
      toolDiversity: this.toolDiversityScore,
      explorationDepth: this.explorationDepth,
    };
  }

  reset(): void {
    this.evidenceQuality = 0; this.confidence = 0;
    this.sourceDiversity = 0; this.informationFreshness = 0;
    this.toolDiversityScore = 0; this.explorationDepth = 0;
    this.cyclesExecuted = 0;
    this.stability = {
      flipCount: 0, toolPatternStable: true,
      fileFocusChanged: false, direction: "COLLECTING",
      directionChanges: 0, stable: true,
    };
    this._allToolNames = []; this._allPaths = [];
  }
}

export { ExecutionMetrics };
