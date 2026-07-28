import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { FounderWorkspace } from "./FounderWorkspace";
import { ConsensusEngine } from "../collaboration/ConsensusEngine";
import { eventBus } from "../../event-bus/EventBus";
import type { BaseEvent } from "../../event-bus/types";
import { createEmergencySession, createManualSession } from "../council";
import { getAllCapabilities } from "../capabilities";

export interface FounderGoal {
  id: string;
  goal: string;
  target: string;
  metrics: string[];
  priority: "low" | "normal" | "high" | "critical";
  timeline: string;
  status: "draft" | "active" | "completed" | "cancelled";
  createdAt: string;
  activatedAt?: string;
}

export interface ActivationPlan {
  goalId: string;
  ceo: { objective: string; kpis: string[] };
  cfo: { budgetEstimate: number; costAreas: string[] };
  coo: { capacityReview: string; operationalImpact: string };
  cmo: { strategy: string; channels: string[] };
  chro: { headcountNeeds: string[]; trainingNeeds: string[] };
  council: { sessionId: string };
  workspace: { tasks: string[]; milestones: string[] };
}

export class FounderAgent {
  private activeGoal: FounderGoal | null = null;
  private founderWorkspace = new FounderWorkspace();
  private consensus = new ConsensusEngine();
  private goals: FounderGoal[] = [];

  async submitGoal(goal: string, target: string, metrics: string[], priority: "low" | "normal" | "high" | "critical" = "high", timeline: string = "3 months"): Promise<ActivationPlan> {
    const goalEntry: FounderGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      goal, target, metrics, priority, timeline,
      status: "active",
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
    };
    this.goals.push(goalEntry);
    this.activeGoal = goalEntry;

    console.log(`[FounderAgent] New goal: "${goal}" (${target})`);

    const plan = await this.activateGoal(goalEntry);
    return plan;
  }

  private async activateGoal(goal: FounderGoal): Promise<ActivationPlan> {
    const goalId = goal.id;

    // 1. CEO creates objective
    ExecutiveWorkspaceManager.addObjective("CEO", `Strategic Goal: ${goal.goal}`, goal.target, "critical", 100, "%");
    ExecutiveWorkspaceManager.addTask("CEO", `Achieve: ${goal.goal}`, `Target: ${goal.target}. Timeline: ${goal.timeline}. Metrics: ${goal.metrics.join(", ")}`, "critical", undefined, undefined, true);

    // 2. CFO calculates budget
    ExecutiveWorkspaceManager.addObjective("CFO", `Budget Planning for ${goal.goal}`, `Allocate funds for ${goal.target}`, "high", 100, "%");
    ExecutiveWorkspaceManager.addTask("CFO", `Calculate budget for ${goal.goal}`, `Estimate required investment and ROI for: ${goal.target}`, "high", undefined, undefined, true);

    // 3. COO calculates capacity
    ExecutiveWorkspaceManager.addObjective("COO", `Operational Capacity for ${goal.goal}`, `Ensure operations can support ${goal.target}`, "high", 100, "%");
    ExecutiveWorkspaceManager.addTask("COO", `Review operational capacity`, `Assess if current operations can handle increased demand from: ${goal.goal}`, "critical", undefined, undefined, true);

    // 4. CMO creates strategy
    ExecutiveWorkspaceManager.addObjective("CMO", `Marketing Strategy for ${goal.goal}`, `Drive ${goal.target} through marketing`, "high", 100, "%");
    ExecutiveWorkspaceManager.addTask("CMO", `Develop marketing strategy`, `Create comprehensive plan to achieve: ${goal.target}`, "high", undefined, undefined, true);

    // 5. CHRO evaluates HR needs
    ExecutiveWorkspaceManager.addObjective("CHRO", `HR Readiness for ${goal.goal}`, `Ensure workforce readiness for ${goal.target}`, "normal", 100, "%");
    ExecutiveWorkspaceManager.addTask("CHRO", `Assess HR capacity`, `Evaluate if current headcount and skills can support: ${goal.goal}`, "normal", undefined, undefined, true);

    // 6. Council session
    let sessionId = "manual";
    try {
      const session = createManualSession(
        `Council: ${goal.goal}`,
        `Founder goal: ${goal.goal} (${goal.target})`,
        "FounderAI",
        ["revenue_decline", "marketing_strategy"],
      );
      sessionId = session.sessionId;
    } catch { /* council may not be fully integrated */ }

    // 7. Create milestones as objectives for each executive
    const milestones = [
      `Week 1-2: CEO finalizes strategic plan for ${goal.goal}`,
      `Week 2-3: CFO approves budget for ${goal.target}`,
      `Week 2-4: COO operational readiness assessment`,
      `Week 3-6: CMO launches campaigns to drive ${goal.target}`,
      `Week 4-8: CHRO completes hiring/training needed`,
      `Month 3: Review progress against ${goal.target}`,
    ];

    // 8. Record decision for each executive
    const allExecs = ExecutiveWorkspaceManager.getExecutives();
    for (const exec of allExecs) {
      ExecutiveWorkspaceManager.recordDecision(
        exec,
        `founder-goal-${goalId}`,
        `Activate: ${goal.goal}`,
        `Founder initiated goal: ${goal.goal}. Target: ${goal.target}. My role: ${this.getExecutiveRole(exec)}`,
        0.9,
        { goalId, goal: goal.goal, target: goal.target, metrics: goal.metrics, timeline: goal.timeline },
        "system",
      );
    }

    // 9. Publish to event bus
    eventBus.publish({
      id: `founder-goal-${goalId}-activated`,
      type: "founder.goal_activated",
      version: 1, timestamp: new Date(), aggregateId: goalId, aggregateType: "founder_goal",
      data: { goalId, goal: goal.goal, target: goal.target, metrics: goal.metrics, timeline: goal.timeline, milestones } as any,
    } as BaseEvent);

    const plan: ActivationPlan = {
      goalId,
      ceo: { objective: goal.goal, kpis: goal.metrics },
      cfo: { budgetEstimate: 0, costAreas: ["operations", "marketing", "hr", "technology"] },
      coo: { capacityReview: "Full operational capacity review initiated", operationalImpact: goal.target },
      cmo: { strategy: `Multi-channel campaign to drive ${goal.target}`, channels: ["digital", "direct_sales", "retail"] },
      chro: { headcountNeeds: ["To be assessed"], trainingNeeds: ["To be assessed"] },
      council: { sessionId },
      workspace: { tasks: [`Activate: ${goal.goal}`], milestones },
    };

    return plan;
  }

  getActiveGoal(): FounderGoal | null { return this.activeGoal; }
  getGoals(): FounderGoal[] { return [...this.goals]; }

  getGoalStatus(): string {
    if (!this.activeGoal) return "No active goal";
    const dashboard = this.founderWorkspace.getDashboard();
    const lines: string[] = [];
    lines.push(`Active Goal: ${this.activeGoal.goal}`);
    lines.push(`Target: ${this.activeGoal.target}`);
    lines.push(`Timeline: ${this.activeGoal.timeline}`);
    lines.push("─".repeat(50));
    lines.push("Executive Status:");
    for (const exec of dashboard.executives) {
      lines.push(`  ${exec.executive}: ${exec.activeObjectives} objectives, ${exec.pendingTasks} pending tasks`);
    }
    lines.push(`\nOverall: ${dashboard.activeObjectives} active objectives across all executives`);
    return lines.join("\n");
  }

  private getExecutiveRole(exec: string): string {
    const roles: Record<string, string> = {
      CEO: "Strategic leadership and overall goal ownership",
      COO: "Operational capacity and supply chain readiness",
      CFO: "Budget allocation and financial feasibility",
      CMO: "Marketing strategy and sales execution",
      CHRO: "Workforce planning and talent readiness",
      CTO: "Technology infrastructure and systems support",
      CAIO: "AI and automation leverage for efficiency",
      CKO: "Knowledge management and learning programs",
    };
    return roles[exec] ?? "Support and alignment";
  }
}
