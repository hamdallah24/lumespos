export * from "./core";
export * from "./channels";
export * from "./templates";
export * from "./providers";

let initialized = false;

export function initializeCommunicationRuntime(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[CR] Communication Runtime initialized — Queue + Channels + Templates ready`);
}
