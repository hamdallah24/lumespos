// ADR-010 Phase 3: Mission Budget Tracker (Observer)
// Rebuilt — pure observer. Reads Governor's budget, produces hierarchy.
// No allocation. No control. Just visibility.
// Previous BudgetManager was broken (negative allocations). This is a clean rebuild.

export interface CycleRecord {
  cycle: number;
  llmTokens: number;
  toolTokens: number;
  totalTokens: number;
  cumulativeTokens: number;
  strategy: string;
  evidence: number;
  confidence: number;
}

export interface BudgetSnapshot {
  missionTotal: number;
  missionUsed: number;
  missionRemaining: number;
  cycles: CycleRecord[];
}

export class MissionBudgetTracker {
  private cycles: CycleRecord[] = [];
  private previousTotal: number = 0;

  /** Record a cycle — called after governor.afterCycle() */
  recordCycle(
    cycleNum: number,
    llmTokens: number,
    toolChars: number,
    currentTotalUsed: number,
    strategy: string,
    evidence: number,
    confidence: number,
  ): CycleRecord {
    const toolTokens = Math.ceil(toolChars / 4);
    const totalTokens = llmTokens + toolTokens;

    const record: CycleRecord = {
      cycle: cycleNum,
      llmTokens,
      toolTokens,
      totalTokens,
      cumulativeTokens: currentTotalUsed,
      strategy,
      evidence: Math.round(evidence * 100),
      confidence,
    };
    this.cycles.push(record);
    this.previousTotal = currentTotalUsed;
    return record;
  }

  /** Generate budget snapshot for logging */
  snapshot(allocation: { maxTokens: number }): BudgetSnapshot {
    const total = allocation.maxTokens;
    const used = this.cycles.length > 0
      ? this.cycles[this.cycles.length - 1].cumulativeTokens
      : 0;

    return {
      missionTotal: total,
      missionUsed: used,
      missionRemaining: Math.max(0, total - used),
      cycles: [...this.cycles],
    };
  }

  /** Hierarchical summary for log output */
  summary(allocation: { maxTokens: number }): string {
    const s = this.snapshot(allocation);
    const lines = [
      `\nMission Budget: ${s.missionUsed}/${s.missionTotal} tokens (${s.cycles.length} cycles, ${s.missionRemaining} remaining)`,
      ...s.cycles.map(c =>
        `  Cycle ${c.cycle}: ${c.totalTokens} tok (LLM: ${c.llmTokens}, Tool: ${c.toolTokens}) | ${c.strategy} | E:${c.evidence}% C:${c.confidence}%`
      ),
    ];
    return lines.join("\n");
  }
}
