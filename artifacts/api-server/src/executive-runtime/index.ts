export * from "./core";
export * from "./executives/CEO";
export * from "./executives/CTO";
export * from "./executives/COO";
export * from "./executives/CFO";
export * from "./executives/CMO";
export * from "./executives/CAIO";
export * from "./executives/CKO";
export * from "./executives/CHRO";
export { CognitiveEngine, runPipeline, recordTrace, getRecentTraces, getTracesByRole, getTraceSummary } from "./cognition";
export type { ThinkOptions, ThinkResult, PipelineResult } from "./cognition";
export {
  verifyExecutive, verifyAll, formatReport, formatAllReports,
  traceStart, traceStep, traceFoundation, traceDirective,
  traceKnowledge, traceMentalModels, traceFrameworks,
  tracePrompt, traceLLM, traceDecision, traceEnd, formatAssetTrace,
  scoreExecutive, scoreAll, formatScoreCard, formatAllScoreCards,
  runCEOE2E, formatE2EResult,
  certifyExecutive, certifyAll, formatCertificationReport,
} from "./verification";
export type {
  VerificationStep, VerificationReport,
  AssetTraceStep, AssetTraceReport,
  IntegrationCategory, ExecutiveScore,
  E2EStep, E2EResult,
  CertificationEntry, CertificationReport,
} from "./verification";

let initialized = false;

export function initializeExecutiveRuntime(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[ER] Executive Runtime initialized — CEO, CTO, COO, CFO, CMO, CAIO, CKO, CHRO ready`);
}
