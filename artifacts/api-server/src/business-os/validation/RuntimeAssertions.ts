import { getAllCapabilities, getCapabilitiesByExecutive } from "../capabilities";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { getExecutionEngine } from "../../executive-runtime/execution/ExecutionEngine";

export class RuntimeAssertions {
  async ricBuilt(): Promise<boolean> {
    try {
      const gateway = getRuntimeGateway();
      return gateway.isReady();
    } catch { return false; }
  }

  async executiveSelected(expected: string): Promise<boolean> {
    try {
      const gateway = getRuntimeGateway();
      const exec = gateway.getExecutive(expected);
      return exec !== null;
    } catch { return false; }
  }

  async capabilitySelected(expected: string[]): Promise<boolean> {
    try {
      const allCaps = getAllCapabilities();
      for (const expectedId of expected) {
        const found = allCaps.find(c => c.id === expectedId);
        if (!found) return false;
      }
      return allCaps.length >= expected.length;
    } catch { return false; }
  }

  async decisionGenerated(executive: string, expectedActions: string[]): Promise<boolean> {
    try {
      const ws = ExecutiveWorkspaceManager.getWorkspace(executive);
      if (!ws || !ws.decisions) return false;
      if (expectedActions.length === 0) return ws.decisions.length > 0;
      return ws.decisions.some(d => expectedActions.includes(d.action));
    } catch { return false; }
  }

  async executionSuccess(expectedActions: string[]): Promise<boolean> {
    try {
      const engine = getExecutionEngine();
      if (!engine) return false;
      for (const ws of ExecutiveWorkspaceManager.getAllWorkspaces()) {
        if (ws.executions && ws.executions.length > 0) {
          if (expectedActions.length === 0) return ws.executions.some(e => e.success);
          const hasMatch = ws.executions.some(e => expectedActions.includes(e.action) && e.success);
          if (hasMatch) return true;
        }
      }
      return false;
    } catch { return false; }
  }

  async eventPublished(expectedEvents: string[]): Promise<boolean> {
    try {
      if (expectedEvents.length === 0) return true;
      for (const ws of ExecutiveWorkspaceManager.getAllWorkspaces()) {
        if (ws.timeline) {
          const hasEvent = ws.timeline.some(t => t.type === "event" && expectedEvents.some(e => t.title.includes(e) || t.relatedId?.includes(e)));
          if (hasEvent) return true;
        }
      }
      return false;
    } catch { return false; }
  }

  async workspaceUpdated(executive: string, expectedActions: string[]): Promise<boolean> {
    try {
      const ws = ExecutiveWorkspaceManager.getWorkspace(executive);
      if (!ws) return false;
      if (expectedActions.length > 0) {
        const hasExecution = ws.executions && ws.executions.some(e => expectedActions.includes(e.action));
        if (hasExecution) return true;
      }
      return ws.updatedAt !== ws.createdAt || ws.decisions.length > 0 || ws.executions.length > 0 || ws.timeline.length > 0;
    } catch { return false; }
  }

  async memoryUpdated(executive: string): Promise<boolean> {
    try {
      const ws = ExecutiveWorkspaceManager.getWorkspace(executive);
      if (!ws) return false;
      return ws.decisions.length > 0 || ws.executions.length > 0;
    } catch { return false; }
  }

  async knowledgeUpdated(executive: string): Promise<boolean> {
    try {
      const ws = ExecutiveWorkspaceManager.getWorkspace(executive);
      if (!ws) return false;
      return ws.snapshots && ws.snapshots.length > 0;
    } catch { return false; }
  }
}
