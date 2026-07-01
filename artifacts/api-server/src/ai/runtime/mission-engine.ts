// Phase II Wave 2: Mission Runtime
// 13-state lifecycle. Mission contract. Work packages. Evidence tracking.

import { organizationEngine } from "../runtime/organization-engine";

type MissionState =
  "CREATED" | "UNDERSTANDING" | "PLANNING" | "DELEGATED" |
  "RUNNING" | "WAITING" | "BLOCKED" | "REVIEW" | "APPROVED" |
  "COMPLETED" | "FAILED" | "CANCELLED" | "ARCHIVED";

type MissionPriority = "normal" | "high" | "critical";

interface WorkPackage {
  id: string;
  title: string;
  domain: string;
  assignedTo?: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "blocked";
  result?: string;
  evidence?: string;
  dependsOn: string[];
}

interface EvidenceItem {
  type: "metric" | "finding" | "gap" | "pattern" | "error";
  source: string;
  timestamp: string;
  data: Record<string, any>;
}

interface MissionContract {
  id: string;
  title: string;
  owner: string;
  sponsor: string;
  priority: MissionPriority;
  status: MissionState;
  workPackages: WorkPackage[];
  evidence: EvidenceItem[];
  reflection?: string;
  createdAt: string;
  completedAt?: string;
  delegatedTo: string[];
}

interface MissionReport {
  mission: MissionContract;
  orgDelegation: string;  // Where it was routed
  health: ReturnType<typeof organizationEngine.healthReport>;
}

class MissionRuntime {
  private missions = new Map<string, MissionContract>();
  private counter = 0;

  /** Create a mission from a Founder goal */
  create(
    title: string,
    objective: string,
    domains: string[],
    priority: MissionPriority = "normal",
    sponsor = "RUNTIME-001",
  ): MissionContract {
    this.counter++;
    const mission: MissionContract = {
      id: `M-${this.counter}`,
      title,
      owner: this.resolveOwner(domains),
      sponsor,
      priority,
      status: "CREATED",
      workPackages: domains.map((d, i) => ({
        id: `WP-${this.counter}-${i + 1}`,
        title: `${this.capitalize(d)} Task`,
        domain: d,
        status: "pending" as const,
        dependsOn: i > 0 ? [`WP-${this.counter}-${i}`] : [],
        assignedTo: undefined,
        result: undefined,
        evidence: undefined,
      })),
      evidence: [],
      createdAt: new Date().toISOString(),
      delegatedTo: [],
    };

    this.missions.set(mission.id, mission);
    console.log(`[Mission] ${mission.id} created: ${title} — ${domains.length} work packages`);
    return mission;
  }

  /** Transition a mission to a new state with evidence */
  transition(missionId: string, newState: MissionState, evidence?: string): MissionContract | null {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    // Validate transition
    if (!this.isValidTransition(mission.status, newState)) {
      console.warn(`[Mission] Invalid transition: ${mission.status} → ${newState}`);
      return null;
    }

    mission.status = newState;
    if (evidence) {
      mission.evidence.push({
        type: "metric",
        source: "MissionRuntime",
        timestamp: new Date().toISOString(),
        data: { fromState: mission.status, toState: newState, detail: evidence },
      });
    }

    if (newState === "COMPLETED" || newState === "FAILED" || newState === "CANCELLED") {
      mission.completedAt = new Date().toISOString();
    }

    console.log(`[Mission] ${missionId}: ${mission.status} → ${newState}`);
    return mission;
  }

  /** Delegate work packages to the organization */
  delegateToOrg(missionId: string): MissionReport | null {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    // Route to Organization Runtime
    const delegation = organizationEngine.delegate(mission.title);

    if (delegation) {
      mission.delegatedTo.push(delegation.runtimeId);
      // Assign work packages to the delegated runtime
      for (const pkg of mission.workPackages) {
        if (pkg.status === "pending") {
          pkg.assignedTo = delegation.runtimeId;
          pkg.status = "assigned";
        }
      }
    }

    // Transition: CREATED → PLANNING → DELEGATED
    this.transition(missionId, "PLANNING");
    this.transition(missionId, "DELEGATED");

    const health = organizationEngine.healthReport();
    return {
      mission,
      orgDelegation: delegation ? `${delegation.runtime} (${delegation.runtimeId})` : "No capable Runtime found",
      health,
    };
  }

  /** Complete a work package */
  completePackage(missionId: string, packageId: string, result: string, evidence: string): WorkPackage | null {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    const pkg = mission.workPackages.find(wp => wp.id === packageId);
    if (!pkg) return null;

    pkg.status = "completed";
    pkg.result = result;
    pkg.evidence = evidence;

    // Check if all packages done
    if (mission.workPackages.every(wp => wp.status === "completed")) {
      this.transition(missionId, "RUNNING");
      this.transition(missionId, "REVIEW");
    }

    return pkg;
  }

  /** Approve a mission after review */
  approve(missionId: string): MissionContract | null {
    const mission = this.missions.get(missionId);
    if (!mission || mission.status !== "REVIEW") return null;
    this.transition(missionId, "APPROVED");
    this.transition(missionId, "COMPLETED");
    mission.reflection = "Mission approved after review. All objectives met.";
    return mission;
  }

  /** Reject a mission — send back to RUNNING */
  reject(missionId: string, reason: string): MissionContract | null {
    const mission = this.missions.get(missionId);
    if (!mission || mission.status !== "REVIEW") return null;
    this.transition(missionId, "RUNNING");
    mission.evidence.push({
      type: "finding", source: "MissionRuntime",
      timestamp: new Date().toISOString(), data: { reason },
    });
    return mission;
  }

  /** Fail a mission */
  fail(missionId: string, reason: string): MissionContract | null {
    return this.transition(missionId, "FAILED", reason);
  }

  /** Cancel a mission (Founder only) */
  cancel(missionId: string, reason: string): MissionContract | null {
    return this.transition(missionId, "CANCELLED", reason);
  }

  /** Get mission by ID */
  get(id: string): MissionContract | null {
    return this.missions.get(id) || null;
  }

  /** Get missions by status */
  byStatus(status: MissionState): MissionContract[] {
    return [...this.missions.values()].filter(m => m.status === status);
  }

  /** Get missions for a runtime */
  forRuntime(runtimeId: string): MissionContract[] {
    return [...this.missions.values()].filter(m => m.owner === runtimeId || m.delegatedTo.includes(runtimeId));
  }

  /** Get active missions (not completed/failed/cancelled/archived) */
  active(): MissionContract[] {
    return [...this.missions.values()].filter(m => !["COMPLETED", "FAILED", "CANCELLED", "ARCHIVED"].includes(m.status));
  }

  /** Get mission report */
  report(): string {
    const all = [...this.missions.values()];
    const active = this.active().length;
    const completed = this.byStatus("COMPLETED").length;
    const failed = this.byStatus("FAILED").length;
    const total = all.length;

    return [
      `Missions: ${total} total`,
      `  Active: ${active}`,
      `  Completed: ${completed}`,
      `  Failed: ${failed}`,
      `  Success Rate: ${total > 0 ? Math.round((completed / total) * 100) : 100}%`,
    ].join("\n");
  }

  private isValidTransition(from: MissionState, to: MissionState): boolean {
    const valid: Record<MissionState, MissionState[]> = {
      CREATED: ["UNDERSTANDING", "CANCELLED"],
      UNDERSTANDING: ["PLANNING", "WAITING", "CANCELLED"],
      PLANNING: ["DELEGATED", "BLOCKED"],
      DELEGATED: ["RUNNING", "WAITING"],
      RUNNING: ["WAITING", "REVIEW", "FAILED"],
      WAITING: ["RUNNING", "DELEGATED", "CANCELLED"],
      BLOCKED: ["PLANNING", "CANCELLED"],
      REVIEW: ["APPROVED", "RUNNING"],
      APPROVED: ["COMPLETED"],
      COMPLETED: ["ARCHIVED"],
      FAILED: ["ARCHIVED"],
      CANCELLED: ["ARCHIVED"],
      ARCHIVED: [],
    };
    return valid[from]?.includes(to) ?? false;
  }

  private resolveOwner(domains: string[]): string {
    const tech = ["frontend", "backend", "database", "testing", "deploy", "architecture"];
    const ops = ["inventory", "sales", "warehouse", "accounting", "budget"];
    if (domains.some(d => tech.includes(d))) return "RUNTIME-002";  // CTO
    if (domains.some(d => ops.includes(d))) return "RUNTIME-003";    // COO
    return "RUNTIME-002";  // Default CTO
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

const missionEngine = new MissionRuntime();

export { missionEngine as missionRuntime };
export type { MissionContract, MissionState, MissionPriority, WorkPackage, EvidenceItem, MissionReport };

export const missionEngineComponent = {
  name: "MissionRuntime",
  version: "1.0.0",
  capabilities: ["mission-lifecycle", "work-package-decomposition", "state-machine", "evidence-tracking", "org-routing"],
  dependencies: ["OrganizationRuntime"],

  health: () => {
    const report = missionEngine.report();
    const active = missionEngine.active().length;
    return {
      status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0",
      custom: { activeMissions: active, report },
    };
  },

  create: (title: string, objective: string, domains: string[], priority?: MissionPriority) =>
    missionEngine.create(title, objective, domains, priority),

  delegate: (id: string) => missionEngine.delegateToOrg(id),
  completePackage: (missionId: string, pkgId: string, result: string, evidence: string) =>
    missionEngine.completePackage(missionId, pkgId, result, evidence),

  approve: (id: string) => missionEngine.approve(id),
  reject: (id: string, reason: string) => missionEngine.reject(id, reason),
  fail: (id: string, reason: string) => missionEngine.fail(id, reason),
  cancel: (id: string, reason: string) => missionEngine.cancel(id, reason),

  get: (id: string) => missionEngine.get(id),
  active: () => missionEngine.active(),
  byStatus: (status: MissionState) => missionEngine.byStatus(status),
  forRuntime: (runtimeId: string) => missionEngine.forRuntime(runtimeId),
  report: () => missionEngine.report(),
};
