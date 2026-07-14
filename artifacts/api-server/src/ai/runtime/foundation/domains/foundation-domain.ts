// ECP-023: Foundation Domain — Philosophy, Covenant, Constitution, North Star
// Frozen. Immutable root documents.

import type { IFoundationDomain } from "../types/provider-interfaces";
import { getAssetContent } from "../foundation-cache";

class FoundationDomain implements IFoundationDomain {
  getPhilosophy(): string {
    return getAssetContent("foundation-executive-constitution");
  }

  getCovenant(): string {
    return getAssetContent("foundation-executive-constitution");
  }

  getConstitution(): string {
    return getAssetContent("foundation-executive-constitution");
  }

  getNorthStar(): string {
    return getAssetContent("foundation-executive-constitution");
  }

  getManifesto(): string {
    return getAssetContent("foundation-executive-constitution");
  }
}

export const foundationDomain = new FoundationDomain();
