// ECP-034: Mission API — public interface for Mission Authority
// Frozen. All mission operations go through this API.

import type { MissionProposal, MissionEntry, MissionBoard } from "./mission-types";
import { proposalRegistry } from "./proposal-registry";
import { conflictDetector } from "./conflict-detector";
import { alignmentEngine } from "./alignment-engine";
import { priorityEngine } from "./priority-engine";
import { approvalPolicy } from "./approval-policy";
import { missionBoard } from "./mission-board";
import { aiMissionService } from "../../../services/ai-mission-service";
import { missionEngineComponent } from "../mission-engine";

interface MissionAPIResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

class MissionAPI {
  /** Submit a proposal */
  submitProposal(proposal: {
    title: string; description: string; type: MissionProposal["type"];
    proposedBy: string; strategicObjective: string; dependencies: string[];
    estimatedTokens: number; estimatedDuration: string; requiredCapabilities: string[];
  }): MissionAPIResult {
    // 1. Detect conflicts
    const conflictResult = conflictDetector.detect(proposal as any);
    if (conflictResult.hasConflict) {
      return { success: false, error: `Conflict detected: ${conflictResult.conflicts.map(c => c.reason).join("; ")}` };
    }

    // 2. Validate alignment
    const alignment = alignmentEngine.validate(proposal as any);
    if (!alignment.passed) {
      return { success: false, error: `Alignment failed: ${alignment.failures.join("; ")}` };
    }

    // 3. Score priority
    const priority = priorityEngine.score(proposal as any);

    // 4. Register the proposal
    const registered = proposalRegistry.register({ ...proposal, priority: priority.score } as any);
    registered.alignmentScore = alignment.score;

    // 5. Check approval
    const approval = approvalPolicy.decide(registered);

    return {
      success: true,
      data: { proposal: registered, priority: priority.score, approval, alignment: alignment.score },
    };
  }

  /** Activate a proposal as a mission */
  async activateMission(proposalId: string, assignedTo: string, extended?: { missionType?: "analysis" | "implementation" | "legacy"; userId?: number; userMessage?: string }): Promise<MissionAPIResult> {
    const proposal = proposalRegistry.getProposal(proposalId);
    if (!proposal) return { success: false, error: "Proposal not found" };

    const approval = approvalPolicy.decide(proposal);
    if (!approval.approved && !approval.autoApproved) {
      return { success: false, error: `Requires ${approval.requiredApprover} approval` };
    }

    const mission = proposalRegistry.promote(proposalId, assignedTo);
    if (!mission) return { success: false, error: "Failed to promote proposal" };

    // Create DB mission record so result can be persisted + notified to frontend
    let dbMissionId: number | undefined;
    try {
      console.log(`[QA-DB] aiMissionService loaded, creating record for userId=${extended?.userId}`);
      dbMissionId = await aiMissionService.create(
        extended?.userId || 1,
        mission.title,
        proposal.description,
        "cto",
        "medium",
        "DELEGATED",
      );
      console.log(`[QA-DB] dbMissionId=${dbMissionId}`);
    } catch (e: any) {
      console.error(`[MissionAPI] Failed to create DB mission record:`, e?.message || e);
    }

    // ECP-036: Create actual mission via Mission Engine
    try {
      const created = missionEngineComponent.create(mission.title, proposal.description, [proposal.title], proposal.priority > 80 ? "high" : "normal", "RUNTIME-001", { ...extended, dbMissionId });
      missionEngineComponent.delegate(created.id);
    } catch (e: any) {
      console.error(`[MissionAPI] Failed to create mission from proposal ${proposalId}:`, e?.message || e);
    }

    return { success: true, data: { mission, dbMissionId } };
  }

  /** Get the mission board */
  getBoard(): MissionBoard { return missionBoard.build(); }

  /** Get all proposals */
  getProposals(): MissionProposal[] { return proposalRegistry.getAllProposals(); }

  /** Get all active missions */
  getActiveMissions(): MissionEntry[] {
    return proposalRegistry.getAllMissions().filter(m => m.status === "ACTIVE");
  }

  /** Cancel a proposal */
  cancelProposal(proposalId: string): MissionAPIResult {
    const proposal = proposalRegistry.getProposal(proposalId);
    if (!proposal) return { success: false, error: "Proposal not found" };
    proposal.status = "ARCHIVED";
    return { success: true };
  }
}

export const missionAPI = new MissionAPI();
