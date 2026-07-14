import { TriggerEngine } from "../public/TriggerEngine";
import { RuntimeState } from "./RuntimeState";

interface ScheduledTask {
  id: string;
  intervalMs: number;
  branchId?: number;
  lastRun: number;
  timer: ReturnType<typeof setInterval> | null;
}

const tasks: ScheduledTask[] = [];
let taskCounter = 0;

function nextTaskId(): string {
  taskCounter++;
  return `sched-${taskCounter}`;
}

export function schedulePipeline(intervalMs: number, branchId?: number): string {
  const id = nextTaskId();
  const task: ScheduledTask = { id, intervalMs, branchId, lastRun: 0, timer: null };

  task.timer = setInterval(async () => {
    if (!RuntimeState.isRunning()) return;
    task.lastRun = Date.now();
    await TriggerEngine.fire("scheduler", branchId);
  }, intervalMs);

  tasks.push(task);
  return id;
}

export function unschedulePipeline(id: string): boolean {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return false;
  const task = tasks[idx];
  if (task.timer) clearInterval(task.timer);
  tasks.splice(idx, 1);
  return true;
}

export function getScheduledTasks(): Array<{ id: string; intervalMs: number; lastRun: number }> {
  return tasks.map(t => ({ id: t.id, intervalMs: t.intervalMs, lastRun: t.lastRun }));
}

export function clearAllSchedules(): void {
  for (const task of tasks) {
    if (task.timer) clearInterval(task.timer);
  }
  tasks.length = 0;
}
