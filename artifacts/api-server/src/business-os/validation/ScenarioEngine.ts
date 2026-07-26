import { eventBus } from "../../event-bus/EventBus";
import type { BaseEvent } from "../../event-bus/types";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { WorkspaceIntegration } from "../workspace/WorkspaceIntegration";
import { getAllCapabilities } from "../capabilities";
import type { BusinessScenario, ScenarioResult, ScenarioStageResult, ScenarioTrigger } from "./types";
import { RuntimeProfiler } from "./RuntimeProfiler";
import { RuntimeAssertions } from "./RuntimeAssertions";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { getExecutionEngine } from "../../executive-runtime/execution/ExecutionEngine";

export class ScenarioEngine {
  private profiler = new RuntimeProfiler();
  private assertions: RuntimeAssertions;
  private results: ScenarioResult[] = [];

  constructor() {
    this.assertions = new RuntimeAssertions();
  }

  async runScenario(scenario: BusinessScenario): Promise<ScenarioResult> {
    this.profiler.reset();
    const stages: ScenarioStageResult[] = [];
    const startTime = Date.now();

    try {
      this.profiler.start("trigger");
      const triggerOk = await this.executeTrigger(scenario.trigger);
      stages.push({ stage: "trigger", passed: triggerOk, durationMs: this.profiler.end("trigger"), detail: `Triggered scenario: ${scenario.name}`, error: triggerOk ? undefined : "Trigger failed" });
      if (!triggerOk) return this.fail(scenario, stages, startTime, "Trigger failed");

      this.profiler.start("ric_built");
      const ricOk = await this.assertions.ricBuilt();
      stages.push({ stage: "ric_built", passed: ricOk, durationMs: this.profiler.end("ric_built"), detail: ricOk ? "RIC built and ready" : "RIC not built", error: ricOk ? undefined : "RIC chain broken" });

      this.profiler.start("executive_selected");
      const execOk = await this.assertions.executiveSelected(scenario.expectedExecutive);
      stages.push({ stage: "executive_selected", passed: execOk, durationMs: this.profiler.end("executive_selected"), detail: execOk ? `Executive ${scenario.expectedExecutive} selected` : `Expected ${scenario.expectedExecutive}`, error: execOk ? undefined : "Executive not found" });

      this.profiler.start("capability_selected");
      const capOk = await this.assertions.capabilitySelected(scenario.expectedCapabilities);
      stages.push({ stage: "capability_selected", passed: capOk, durationMs: this.profiler.end("capability_selected"), detail: capOk ? `${scenario.expectedCapabilities.length} capabilities available` : "Capabilities missing", error: capOk ? undefined : "Capability chain broken" });

      this.profiler.start("decision_generated");
      const decisionOk = await this.assertions.decisionGenerated(scenario.expectedExecutive, scenario.expectedActions);
      stages.push({ stage: "decision_generated", passed: decisionOk, durationMs: this.profiler.end("decision_generated"), detail: decisionOk ? `Decision generated for ${scenario.expectedExecutive}` : "No decision found", error: decisionOk ? undefined : "Decision not generated" });

      this.profiler.start("execution_success");
      const execOk2 = await this.assertions.executionSuccess(scenario.expectedActions);
      stages.push({ stage: "execution_success", passed: execOk2, durationMs: this.profiler.end("execution_success"), detail: execOk2 ? `${scenario.expectedActions.length} actions executed` : "Execution failed", error: execOk2 ? undefined : "Execution chain broken" });

      this.profiler.start("event_published");
      const eventOk = await this.assertions.eventPublished(scenario.expectedEvents);
      stages.push({ stage: "event_published", passed: eventOk, durationMs: this.profiler.end("event_published"), detail: eventOk ? `${scenario.expectedEvents.length} events published` : "Events missing", error: eventOk ? undefined : "Event chain broken" });

      this.profiler.start("workspace_updated");
      const wsOk = await this.assertions.workspaceUpdated(scenario.expectedExecutive, scenario.expectedActions);
      stages.push({ stage: "workspace_updated", passed: wsOk, durationMs: this.profiler.end("workspace_updated"), detail: wsOk ? "Workspace updated" : "Workspace not updated", error: wsOk ? undefined : "Workspace chain broken" });

      this.profiler.start("memory_updated");
      const memOk = await this.assertions.memoryUpdated(scenario.expectedExecutive);
      stages.push({ stage: "memory_updated", passed: memOk, durationMs: this.profiler.end("memory_updated"), detail: memOk ? "Memory updated" : "Memory not updated", error: memOk ? undefined : "Memory chain broken" });

      this.profiler.start("knowledge_updated");
      const knowOk = await this.assertions.knowledgeUpdated(scenario.expectedExecutive);
      stages.push({ stage: "knowledge_updated", passed: knowOk, durationMs: this.profiler.end("knowledge_updated"), detail: knowOk ? "Knowledge updated" : "Knowledge not updated", error: knowOk ? undefined : "Knowledge chain broken" });

      const allPassed = stages.every(s => s.passed);
      const result: ScenarioResult = { scenarioId: scenario.id, scenarioName: scenario.name, passed: allPassed, stages, durationMs: Date.now() - startTime };
      this.results.push(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.fail(scenario, stages, startTime, msg);
    }
  }

  async runScenarios(scenarios: BusinessScenario[]): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = [];
    for (const s of scenarios) {
      results.push(await this.runScenario(s));
    }
    this.results = results;
    return results;
  }

  getResults(): ScenarioResult[] { return this.results; }
  getProfiler(): RuntimeProfiler { return this.profiler; }
  getAssertions(): RuntimeAssertions { return this.assertions; }

  getSummary(): { passed: number; failed: number; total: number; passRate: number; avgDurationMs: number } {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const avg = total > 0 ? this.results.reduce((s, r) => s + r.durationMs, 0) / total : 0;
    return { passed, failed: total - passed, total, passRate: total > 0 ? passed / total : 0, avgDurationMs: Math.round(avg) };
  }

  private async executeTrigger(trigger: ScenarioTrigger): Promise<boolean> {
    try {
      const branchId = trigger.branchId ?? 1;
      const userId = trigger.userId ?? 1;
      const event: BaseEvent = {
        id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: trigger.eventType ?? "scenario.trigger",
        version: 1,
        timestamp: new Date(),
        aggregateId: `scenario-${trigger.eventType ?? "manual"}`,
        aggregateType: "scenario",
        data: trigger.data ?? {},
        metadata: { scenario: true, branchId, userId },
      };
      await eventBus.publish(event);
      return true;
    } catch {
      return false;
    }
  }

  private fail(scenario: BusinessScenario, stages: ScenarioStageResult[], startTime: number, error: string): ScenarioResult {
    const result: ScenarioResult = { scenarioId: scenario.id, scenarioName: scenario.name, passed: false, stages, durationMs: Date.now() - startTime, error };
    this.results.push(result);
    return result;
  }
}
