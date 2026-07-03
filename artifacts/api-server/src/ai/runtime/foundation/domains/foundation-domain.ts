// ECP-023: Foundation Domain — Philosophy, Covenant, Constitution, North Star
// Frozen. Immutable root documents.

import type { IFoundationDomain } from "../types/provider-interfaces";
import { getAssetContent } from "../foundation-cache";

class FoundationDomain implements IFoundationDomain {
  getPhilosophy(): string {
    return getAssetContent("founder-philosophy-v1");
  }

  getCovenant(): string {
    return getAssetContent("founder-covenant-v1");
  }

  getConstitution(): string {
    return getAssetContent("constitution-v1");
  }

  getNorthStar(): string {
    return getAssetContent("north-star-v1");
  }

  getManifesto(): string {
    return getAssetContent("engineering-os-manifesto-v1");
  }
}

export const foundationDomain = new FoundationDomain();
