import type { ComponentId } from "../../contracts/ComponentId";
import { formatComponentId } from "../../contracts/ComponentId";
import { RuntimeIdentity } from "./RuntimeIdentity";
import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";

export interface PermissionToken {
  pluginId: ComponentId;
  capabilities: string[];
  issuedAt: string;
  expiresAt: string;
  signature: string;
  issuer: string;
}

function sign(payload: string): string {
  return `sig-${Buffer.from(payload).toString("base64").slice(0, 32)}`;
}

export const PermissionTokenManager = {
  issue(pluginId: ComponentId, capabilities: string[], ttlMs = 3600000): PermissionToken {
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const payload = `${formatComponentId(pluginId)}:${capabilities.join(",")}:${issuedAt}:${expiresAt}`;
    return {
      pluginId,
      capabilities,
      issuedAt,
      expiresAt,
      signature: sign(payload),
      issuer: RuntimeIdentity.getRuntimeId(),
    };
  },

  verify(token: PermissionToken): boolean {
    if (new Date(token.expiresAt).getTime() < Date.now()) {
      RuntimeLogger.warn("PermissionToken", "Token expired", { metadata: { pluginId: formatComponentId(token.pluginId) } });
      return false;
    }
    const payload = `${formatComponentId(token.pluginId)}:${token.capabilities.join(",")}:${token.issuedAt}:${token.expiresAt}`;
    const expectedSig = sign(payload);
    if (token.signature !== expectedSig) {
      RuntimeLogger.warn("PermissionToken", "Token signature mismatch", { metadata: { pluginId: formatComponentId(token.pluginId) } });
      return false;
    }
    return true;
  },

  hasCapability(token: PermissionToken, capability: string): boolean {
    return token.capabilities.includes(capability);
  },
};
