// ECP-023: Foundation Provider — single access layer for Foundation
// Frozen. Coordinator only. No business logic.
// All Runtimes, Engines, and Governor MUST access Foundation through this provider.

import type {
  IFoundationProvider, IFoundationDomain, IGovernanceDomain,
  IRuntimeDomain, ICapabilityDomain, IDelegationDomain,
  IExecutionDomain, ITrustDomain,
} from "./types/provider-interfaces";
import type { ConfidenceGates } from "./types/foundation-types";
import { getCache } from "./foundation-cache";
import { foundationDomain } from "./domains/foundation-domain";
import { governanceDomain } from "./domains/governance-domain";
import { runtimeDomain } from "./domains/runtime-domain";
import { capabilityDomain } from "./domains/capability-domain";
import { delegationDomain } from "./domains/delegation-domain";
import { executionDomain } from "./domains/execution-domain";
import { trustDomain } from "./domains/trust-domain";
import { getAssetContent } from "./foundation-cache";

class FoundationProvider implements IFoundationProvider {
  private _fingerprint: string = "";
  private _loadedAt: number = 0;

  constructor() {
    this.refresh();
  }

  get fingerprint(): string { this.refresh(); return this._fingerprint; }
  get documentCount(): number { this.refresh(); return getCache().documentCount; }
  get loadedAt(): number { return this._loadedAt; }

  private refresh(): void {
    const cache = getCache();
    if (cache.fingerprint !== this._fingerprint) {
      this._fingerprint = cache.fingerprint;
      this._loadedAt = cache.loadedAt;
    }
  }

  foundation(): IFoundationDomain { return foundationDomain; }
  governance(): IGovernanceDomain { return governanceDomain; }
  runtime(_role?: string): IRuntimeDomain { return runtimeDomain; }
  capability(): ICapabilityDomain { return capabilityDomain; }
  delegation(): IDelegationDomain { return delegationDomain; }
  execution(): IExecutionDomain { return executionDomain; }
  trust(): ITrustDomain { return trustDomain; }

  // Legacy API — backward compat for ECP-024 migration
  getDirective(role: string): string | null {
    const content = runtimeDomain.directive(role);
    return content?.directive || null;
  }

  getFoundationContext(): string {
    return [
      foundationDomain.getPhilosophy().slice(0, 500),
      foundationDomain.getConstitution().slice(0, 500),
      foundationDomain.getNorthStar().slice(0, 500),
    ].join("\n\n");
  }

  getConfidenceGates(): ConfidenceGates {
    return governanceDomain.getConfidenceGates();
  }
}

let _instance: FoundationProvider | null = null;

export function getFoundationProvider(): FoundationProvider {
  if (!_instance) _instance = new FoundationProvider();
  return _instance;
}

export { FoundationProvider };
export type { IFoundationProvider };
