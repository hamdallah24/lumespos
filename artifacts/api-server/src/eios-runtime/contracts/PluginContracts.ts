import type { ComponentId } from "./ComponentId";
import type { RuntimeFacade } from "./RuntimeContracts";

export interface PermissionToken {
  pluginId: ComponentId;
  capabilities: string[];
  expiresAt: string;
  signature: string;
}

export interface PluginAPI {
  readonly runtime: RuntimeFacade;
  readonly token: PermissionToken;
}
