import { RuntimeState } from "../../eios-runtime/RuntimeState";

export interface RICRuntimeState {
  status: string;
  isRunning: boolean;
  uptimeMs: number;
  error: string;
}

export function getRuntimeState(): RICRuntimeState {
  return {
    status: RuntimeState.get(),
    isRunning: RuntimeState.isRunning(),
    uptimeMs: RuntimeState.getUptimeMs(),
    error: RuntimeState.getError(),
  };
}
