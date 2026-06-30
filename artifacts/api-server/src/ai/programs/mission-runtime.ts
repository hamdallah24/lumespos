// Phase 2: Mission Runtime — missions are first-class citizens
// Organization works on missions, not on chat messages.
// CEO manages mission portfolios. Agents execute work packages.

import { getNode, subordinates, canDelegate, organizationGraph } from "./organization-graph";

export interface WorkPackage {
  id: string;
  title: string;
  domain: string;         // "frontend" | "backend" | "testing" | "deploy" | "research"
  assignedTo?: string;    // Node ID that took this package
  status: "pending" | "assigned" | "in_progress" | "completed" | "blocked";
  result?: string;
  evidence?: string;      // Proof of completion
  dependsOn: string[];    // Package IDs that must complete first
}

export interface Mission {
  id: string;
  title: string;
  owner: string;          // Node ID responsible (e.g., "cto")
  sponsor: string;        // Who requested (e.g., "ceo")
  objective: string;
  workPackages: WorkPackage[];
  status: "draft" | "active" | "completed" | "failed" | "cancelled";
  evidence: string[];     // Evidence collected
  report: string;         // Final report
  startedAt: string;
  completedAt?: string;
  delegatedTo: string[];  // Node IDs assigned
}

const _missions = new Map<string, Mission>();
let _missionCounter = 0;

/** Create a mission from a Founder goal */
export function createMission(
  sponsor: string,
  title: string,
  objective: string,
  domains: string[],
): Mission {
  _missionCounter++;
  const mission: Mission = {
    id: `M-${_missionCounter}`,
    title,
    owner: resolveOwner(domains),
    sponsor,
    objective,
    workPackages: domains.map((d, i) => ({
      id: `WP-${_missionCounter}-${i + 1}`,
      title: `${capitalize(d)} Analysis & Implementation`,
      domain: d,
      status: "pending" as const,
      dependsOn: i > 0 ? [`WP-${_missionCounter}-${i}`] : [],
    })),
    status: "draft",
    evidence: [],
    report: "",
    startedAt: new Date().toISOString(),
    delegatedTo: [],
  };

  _missions.set(mission.id, mission);
  console.log(`[Mission] Created ${mission.id}: ${title} — ${domains.length} work packages`);
  return mission;
}

/** Activate a mission — assign work packages to team members */
export function activateMission(missionId: string): Mission | null {
  const mission = _missions.get(missionId);
  if (!mission) return null;

  const owner = getNode(mission.owner);
  if (!owner) return null;

  // Auto-assign work packages to available team members
  const team = subordinates(owner.id);
  for (const pkg of mission.workPackages) {
    if (pkg.status === "pending") {
      // Find best match by domain
      const match = team.find(t => t.role.toLowerCase().includes(pkg.domain.toLowerCase()))
        || team.find(t => t.kernelServices.some(s => s.toLowerCase().includes(pkg.domain.toLowerCase())))
        || team[0];

      if (match) {
        pkg.assignedTo = match.id;
        pkg.status = "assigned";
        if (!mission.delegatedTo.includes(match.id)) mission.delegatedTo.push(match.id);
      }
    }
  }

  mission.status = "active";
  return mission;
}

/** Complete a work package */
export function completePackage(missionId: string, packageId: string, result: string, evidence: string): boolean {
  const mission = _missions.get(missionId);
  if (!mission) return false;

  const pkg = mission.workPackages.find(wp => wp.id === packageId);
  if (!pkg) return false;

  pkg.status = "completed";
  pkg.result = result;
  pkg.evidence = evidence;
  mission.evidence.push(`[${pkg.domain}] ${evidence}`);

  // Check if all packages done
  const allDone = mission.workPackages.every(wp => wp.status === "completed");
  if (allDone) {
    completeMission(missionId, mission.workPackages.map(wp => wp.result).join("\n"));
  }

  return true;
}

/** Complete a mission */
export function completeMission(missionId: string, report: string): Mission | null {
  const mission = _missions.get(missionId);
  if (!mission) return null;
  mission.status = "completed";
  mission.completedAt = new Date().toISOString();
  mission.report = report;
  console.log(`[Mission] ${missionId} completed: ${mission.title}`);
  return mission;
}

/** Get all missions by status */
export function missionsByStatus(status: Mission["status"]): Mission[] {
  return [..._missions.values()].filter(m => m.status === status);
}

/** Get missions owned by a node */
export function missionsForNode(nodeId: string): Mission[] {
  return [..._missions.values()].filter(m => m.owner === nodeId || m.delegatedTo.includes(nodeId));
}

/** Get mission health report */
export function missionReport(): string {
  const total = _missions.size;
  const active = missionsByStatus("active").length;
  const completed = missionsByStatus("completed").length;
  const failed = missionsByStatus("failed").length;

  return [
    `Missions: ${total} total`,
    `  Active: ${active}`,
    `  Completed: ${completed}`,
    `  Failed: ${failed}`,
    `  Rate: ${total > 0 ? Math.round((completed / total) * 100) : 100}%`,
  ].join("\n");
}

function resolveOwner(domains: string[]): string {
  const tech = ["frontend", "backend", "database", "testing", "deploy", "architecture"];
  const ops = ["inventory", "sales", "warehouse", "accounting", "budget"];
  if (domains.some(d => tech.includes(d))) return "cto";
  if (domains.some(d => ops.includes(d))) return "coo";
  return "cto"; // Default to CTO
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const missionRuntime = {
  name: "MissionRuntime",
  version: "1.0.0",
  capabilities: ["mission-management", "work-package-decomposition", "dynamic-team-formation", "progress-tracking"],
  dependencies: ["OrganizationGraph"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),

  create: createMission,
  activate: activateMission,
  completePackage,
  completeMission,
  byStatus: missionsByStatus,
  forNode: missionsForNode,
  report: missionReport,
};
