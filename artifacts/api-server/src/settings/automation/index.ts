// ConfigCenter — Milestone 4: Automation barrel.
// The Background Maintenance Service (Phase 6) will compose jobs here. Phase 1
// ships only the generic scheduler — automation remains a pure consumer of the
// Configuration Center, never part of the core.

export {
  BackgroundScheduler,
  type JobDefinition,
  type JobExecuteFn,
  type JobExecutionContext,
  type JobExecutionRecord,
  type JobState,
  type SchedulerSnapshot,
  type JobId,
  type JobExecutionStatus,
  type JobStatus,
} from "./scheduler";

export {
  SnapshotMaintenanceService,
  type MaintenanceReport,
  type MaintenanceHealthStatus,
  type MaintenanceStatus,
  type RetentionOutcome,
  type IntegrityReport,
  type IntegrityFailure,
  type GcOutcome,
  type SnapshotMaintenanceDeps,
  type MaintenanceJobIntervals,
} from "./snapshot-maintenance";

export {
  DriftDetector,
  type DriftReport,
  type DriftEntry,
  type DriftSeverity,
  type DriftBaselineInfo,
  type DriftDetectorDeps,
} from "./drift";

export {
  BackgroundMaintenanceService,
  type BackgroundMaintenanceDeps,
  type MaintenanceCycle,
  type CycleStep,
  type CycleStepStatus,
  type HealthVerification,
  type OperationalMetrics,
  type MaintenanceStatusView,
} from "./maintenance-service";
