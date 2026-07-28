import type { TimelineEntry } from "./WorkspaceTypes";

let counter = 0;

function nextId(): string {
  counter++;
  return `tl-${Date.now()}-${counter}`;
}

export function createTimelineEntry(
  executive: string,
  type: TimelineEntry["type"],
  title: string,
  description: string,
  relatedId?: string,
  metadata?: Record<string, unknown>,
): TimelineEntry {
  return {
    id: nextId(),
    executive,
    type,
    title,
    description,
    timestamp: new Date().toISOString(),
    relatedId,
    metadata,
  };
}

export function formatTimeline(entries: TimelineEntry[], maxEntries: number = 50): string {
  const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const slice = sorted.slice(0, maxEntries).reverse();
  return slice.map(e => {
    const time = new Date(e.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const icon = ICONS[e.type] || "•";
    return `${time} ${icon} ${e.title}`;
  }).join("\n");
}

const ICONS: Record<string, string> = {
  event: "📡",
  decision: "🧠",
  execution: "⚡",
  approval: "✓",
  reminder: "🔔",
  task: "📋",
  objective: "🎯",
  summary: "📊",
};

export function aggregateTimelineByHour(entries: TimelineEntry[]): { hour: string; count: number; types: string[] }[] {
  const hourMap = new Map<string, { count: number; types: Set<string> }>();
  for (const e of entries) {
    const hour = new Date(e.timestamp).toISOString().slice(0, 13);
    const existing = hourMap.get(hour) || { count: 0, types: new Set() };
    existing.count++;
    existing.types.add(e.type);
    hourMap.set(hour, existing);
  }
  return Array.from(hourMap.entries())
    .map(([hour, data]) => ({ hour, count: data.count, types: Array.from(data.types) }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}
