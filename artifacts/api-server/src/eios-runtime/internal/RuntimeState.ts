export type RuntimeStateValue = "stopped" | "starting" | "running" | "paused" | "error";

let _state: RuntimeStateValue = "stopped";
let _errorMessage = "";
let _bootTime = Date.now();

export const RuntimeState = {
  get(): RuntimeStateValue { return _state; },
  isRunning(): boolean { return _state === "running"; },

  start(): void { _state = "running"; _errorMessage = ""; _bootTime = Date.now(); },
  stop(): void { _state = "stopped"; },
  pause(): void { _state = "paused"; },
  resume(): void { if (_state === "paused") _state = "running"; },

  error(msg: string): void { _state = "error"; _errorMessage = msg; },
  getError(): string { return _errorMessage; },

  getUptimeMs(): number { return _state === "running" ? Date.now() - _bootTime : 0; },

  reset(): void { _state = "stopped"; _errorMessage = ""; _bootTime = Date.now(); },
};
