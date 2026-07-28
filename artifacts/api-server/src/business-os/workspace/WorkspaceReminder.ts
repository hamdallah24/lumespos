import type { Reminder } from "./WorkspaceTypes";

let counter = 0;

function nextId(): string {
  counter++;
  return `rem-${Date.now()}-${counter}`;
}

export function createReminder(
  executive: string,
  title: string,
  dueAt: string,
  description?: string,
  repeat: Reminder["repeat"] = "none",
  relatedObjectiveId?: string,
  relatedTaskId?: string,
): Reminder {
  return {
    id: nextId(),
    executive,
    title,
    description,
    dueAt,
    status: "pending",
    repeat,
    relatedObjectiveId,
    relatedTaskId,
    createdAt: new Date().toISOString(),
  };
}

export function dismissReminder(reminder: Reminder): Reminder {
  return { ...reminder, status: "dismissed" };
}

export function markTriggered(reminder: Reminder): Reminder {
  return { ...reminder, status: "triggered", lastTriggeredAt: new Date().toISOString() };
}

export function getDueReminders(reminders: Reminder[]): Reminder[] {
  const now = new Date().getTime();
  return reminders.filter(r => r.status === "pending" && new Date(r.dueAt).getTime() <= now);
}

export function getUpcomingReminders(reminders: Reminder[], withinMs: number = 86400000): Reminder[] {
  const now = new Date().getTime();
  const deadline = now + withinMs;
  return reminders.filter(r => r.status === "pending" && new Date(r.dueAt).getTime() <= deadline);
}

export const DEFAULT_REMINDERS: Record<string, Reminder[]> = {
  COO: [
    createReminder("COO", "Review stock report", getNextWeekdayAt(1, "09:00"), "Cek item yang mendekati reorder point", "weekly"),
    createReminder("COO", "Check supplier performance", getNextWeekdayAt(5, "14:00"), "Review overdue PO dan supplier rating", "weekly"),
    createReminder("COO", "Monthly inventory audit", getFirstDayOfNextMonth("08:00"), "Audit stok fisik vs sistem", "monthly"),
  ],
  CFO: [
    createReminder("CFO", "Review daily cash position", getNextDateAt(1, "08:00"), "Cek kas semua cabang", "daily"),
    createReminder("CFO", "Prepare weekly finance report", getNextWeekdayAt(5, "16:00"), "Revenue, expense, profit summary", "weekly"),
  ],
  CEO: [
    createReminder("CEO", "Weekly strategy review", getNextWeekdayAt(1, "10:00"), "Review objective progress dan KPI", "weekly"),
    createReminder("CEO", "Monthly board report", getFirstDayOfNextMonth("09:00"), "Company health, risks, opportunities", "monthly"),
  ],
};

function getNextWeekdayAt(weekday: number, time: string): string {
  const now = new Date();
  const currentDay = now.getDay();
  let diff = weekday - currentDay;
  if (diff <= 0) diff += 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  const [h, m] = time.split(":").map(Number);
  target.setHours(h, m, 0, 0);
  return target.toISOString();
}

function getNextDateAt(daysFromNow: number, time: string): string {
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  const [h, m] = time.split(":").map(Number);
  target.setHours(h, m, 0, 0);
  return target.toISOString();
}

function getFirstDayOfNextMonth(time: string): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [h, m] = time.split(":").map(Number);
  target.setHours(h, m, 0, 0);
  return target.toISOString();
}
