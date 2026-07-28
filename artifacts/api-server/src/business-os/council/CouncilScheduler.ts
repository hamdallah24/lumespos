import type { MeetingType, CouncilSession } from "./types";
import { createSession } from "./CouncilSession";
import { createAgendaItem, COMMON_AGENDA_TEMPLATES } from "./CouncilAgenda";
import { recordSession } from "./CouncilHistory";

const SCHEDULE_CONFIG: Record<MeetingType, { intervalMs: number; agendaKeys: string[]; defaultTitle: string }> = {
  daily_brief: { intervalMs: 86400000, agendaKeys: ["risk_assessment", "supplier_evaluation"], defaultTitle: "Daily Brief — Operational Overview" },
  weekly_meeting: { intervalMs: 604800000, agendaKeys: ["revenue_decline", "marketing_strategy", "hr_workforce", "supplier_evaluation"], defaultTitle: "Weekly Executive Meeting" },
  monthly_review: { intervalMs: 2592000000, agendaKeys: ["revenue_decline", "cashflow_crisis", "marketing_strategy", "hr_workforce", "technology", "risk_assessment", "innovation"], defaultTitle: "Monthly Business Review" },
  quarter_review: { intervalMs: 7776000000, agendaKeys: ["revenue_decline", "cashflow_crisis", "expansion", "marketing_strategy", "hr_workforce", "technology", "risk_assessment", "innovation", "supplier_evaluation"], defaultTitle: "Quarterly Strategic Review" },
  year_planning: { intervalMs: 31536000000, agendaKeys: ["expansion", "innovation", "technology", "risk_assessment", "marketing_strategy", "hr_workforce", "supplier_evaluation"], defaultTitle: "Annual Planning Summit" },
  emergency: { intervalMs: 0, agendaKeys: [], defaultTitle: "Emergency Council Meeting" },
  manual: { intervalMs: 0, agendaKeys: [], defaultTitle: "Council Meeting" },
};

function createScheduledSession(meetingType: MeetingType, customTitle?: string): CouncilSession {
  const config = SCHEDULE_CONFIG[meetingType];
  const title = customTitle || config.defaultTitle;
  const session = createSession(title, `Scheduled ${meetingType.replace("_", " ")}`, "scheduler", meetingType);

  for (const key of config.agendaKeys) {
    const template = COMMON_AGENDA_TEMPLATES[key];
    if (template) {
      session.agenda.push(createAgendaItem(template.title, template.description, template.priority, template.requiredExecutives));
    }
  }

  return session;
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastCheck: Record<string, number> = {};

export function startScheduler(checkIntervalMs: number = 60000): void {
  if (schedulerTimer) return;

  schedulerTimer = setInterval(() => {
    const now = Date.now();

    for (const [type, config] of Object.entries(SCHEDULE_CONFIG)) {
      if (type === "emergency" || type === "manual") continue;
      const lastRun = lastCheck[type] || 0;
      if (config.intervalMs > 0 && now - lastRun >= config.intervalMs) {
        const session = createScheduledSession(type as MeetingType);
        recordSession(session);
        lastCheck[type] = now;
        console.log(`[CouncilScheduler] Created ${type} session: ${session.sessionId}`);
      }
    }
  }, checkIntervalMs);

  console.log(`[CouncilScheduler] Started (interval=${checkIntervalMs}ms)`);
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

export function createEmergencySession(reason: string, triggeredBy: string, agendaItems?: { title: string; description: string }[]): CouncilSession {
  const session = createSession(`Emergency: ${reason.slice(0, 80)}`, reason, triggeredBy, "emergency", triggeredBy);
  if (agendaItems) {
    for (const item of agendaItems) {
      session.agenda.push(createAgendaItem(item.title, item.description, "critical", ["CEO", "COO", "CFO"]));
    }
  }
  return session;
}

export function createManualSession(title: string, reason: string, createdBy: string, agendaKeys?: string[]): CouncilSession {
  const session = createSession(title, reason, "manual", "manual", createdBy);
  if (agendaKeys) {
    for (const key of agendaKeys) {
      const template = COMMON_AGENDA_TEMPLATES[key];
      if (template) session.agenda.push(createAgendaItem(template.title, template.description, template.priority, template.requiredExecutives));
    }
  }
  return session;
}

export function isSchedulerRunning(): boolean {
  return schedulerTimer !== null;
}
