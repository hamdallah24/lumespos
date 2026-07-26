import { BackgroundWorker } from "./BackgroundWorker";
import { EventDrivenReasoner } from "./EventDrivenReasoner";
import { ScheduledReasoner } from "./ScheduledReasoner";
import { ObjectiveMonitor } from "./ObjectiveMonitor";

export class AutonomousEngine {
  public worker: BackgroundWorker;
  public eventReasoner: EventDrivenReasoner;
  public scheduledReasoner: ScheduledReasoner;
  public objectiveMonitor: ObjectiveMonitor;
  private active = false;

  constructor() {
    this.worker = new BackgroundWorker();
    this.eventReasoner = new EventDrivenReasoner();
    this.scheduledReasoner = new ScheduledReasoner();
    this.objectiveMonitor = new ObjectiveMonitor();
  }

  start(): void {
    if (this.active) return;
    this.worker.start();
    this.eventReasoner.start();
    this.scheduledReasoner.start();
    this.objectiveMonitor.start();
    this.active = true;
    console.log("[AutonomousEngine] All autonomous systems started");
    console.log(`  BackgroundWorker: ${this.worker.getActiveCount()} executives`);
    console.log(`  EventDrivenReasoner: ${this.eventReasoner.getRoutes().length} event routes`);
    console.log(`  ScheduledReasoner: ${this.scheduledReasoner.getSchedule().filter(s => s.enabled).length} schedule slots`);
    console.log(`  ObjectiveMonitor: active`);
  }

  stop(): void {
    this.worker.stop();
    this.eventReasoner.stop();
    this.scheduledReasoner.stop();
    this.objectiveMonitor.stop();
    this.active = false;
    console.log("[AutonomousEngine] All autonomous systems stopped");
  }

  isActive(): boolean { return this.active; }
}

export { BackgroundWorker } from "./BackgroundWorker";
export { EventDrivenReasoner } from "./EventDrivenReasoner";
export { ScheduledReasoner } from "./ScheduledReasoner";
export { ObjectiveMonitor } from "./ObjectiveMonitor";
