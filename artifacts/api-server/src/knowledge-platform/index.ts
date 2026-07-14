export * from "./core";
export * from "./semantic";
export * from "./episode";
export * from "./procedural";
export * from "./learning";
export * from "./providers";
import { learningEngine } from "./learning";

let initialized = false;

export function initializeKnowledgePlatform(): void {
  if (initialized) return;

  learningEngine.onEvent((event) => {
    console.log(`[KP] Learning Event: ${event.type} — ${event.blockId}`);
  });

  initialized = true;
  console.log(`[KP] Knowledge Platform initialized — Semantic + Episode + Procedural + Learning Engine ready`);
}
