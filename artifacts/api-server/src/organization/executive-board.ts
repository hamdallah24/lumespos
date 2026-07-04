// ECP-042: Executive Board — Single Source of Truth untuk registry executive
// Semua pencarian executive dilakukan melalui board.
// Tidak boleh ada array/map executive lokal di komponen lain.

import { organizationEngine } from "../ai/runtime/organization-engine";
import type { OrganizationNode, DelegationResult } from "../ai/runtime/organization-engine";
import type { ExecutiveRole } from "./executive-task";

export interface BoardExecutive {
  role: ExecutiveRole;
  runtimeId: string;
  health: string;
  maturity: string;
  capabilities: string[];
  isRegistered: boolean;
}

export class ExecutiveBoard {

  /** Register executive in the collaboration board */
  register(role: ExecutiveRole): boolean {
    // Organization Engine is the SSOT — verify existence
    const result = organizationEngine.delegate(role.toLowerCase());
    return result !== null;
  }

  /** Check if an executive is available */
  get(role: ExecutiveRole): BoardExecutive | null {
    // Find via Organization Engine dispatch
    const result = organizationEngine.delegate(role.toLowerCase());
    if (!result) return null;

    return {
      role,
      runtimeId: result.runtimeId,
      health: "Healthy",  // delegate() already filters unhealthy
      maturity: "L1",
      capabilities: [],
      isRegistered: true,
    };
  }

  /** List all registered executives */
  list(): BoardExecutive[] {
    const roles: ExecutiveRole[] = ["CTO", "COO", "CFO", "CMO", "CHRO", "CIO"];
    const results: BoardExecutive[] = [];

    for (const role of roles) {
      const exec = this.get(role);
      if (exec) results.push(exec);
    }

    return results;
  }

  /** Find executives matching capability */
  find(capability: string): BoardExecutive[] {
    const results: BoardExecutive[] = [];
    // Organization Engine handles domain→capability mapping
    const delegateResult = organizationEngine.delegate(capability.toLowerCase());
    if (delegateResult) {
      const exec = this.get(delegateResult.runtime as ExecutiveRole);
      if (exec) results.push(exec);
    }
    return results;
  }

  /** Dispatch task to appropriate executive via Organization Engine */
  dispatch(task: string, fromRole?: ExecutiveRole): DelegationResult | null {
    return organizationEngine.delegate(task);
  }

  /** Get all healthy executives for collaboration session */
  getActive(): BoardExecutive[] {
    return this.list().filter(e => e.health === "Healthy" || e.health === "Busy");
  }
}

export const executiveBoard = new ExecutiveBoard();
