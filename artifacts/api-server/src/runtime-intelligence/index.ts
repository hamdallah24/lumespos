// RIE → RIC Migration: Deprecated module.
// All re-exports now point to RIC types.
// RuntimeIntelligence delegates to RIC.

export type { RuntimeContext } from "../runtime-intelligence-core/types";
export { RuntimeIntelligence } from "./RuntimeIntelligenceCompat";
