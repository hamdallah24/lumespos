// ECP-032.5: Mission Timeline — constructs mission lifecycle from telemetry
// Frozen. Every mission gets a structured event timeline.

import type { MissionTimeline } from "./types";
import { decisionRegistry } from "./decision-registry";

class MissionTimelineBuilder {
  private _timelines = new Map<string, MissionTimeline>();

  start(missionId: string, title: string, runtime: string): MissionTimeline {
    const timeline: MissionTimeline = {
      missionId, title, runtime,
      events: [{ timestamp: new Date().toISOString(), event: "CREATED", detail: `Mission started by ${runtime}` }],
      status: "active",
      durationMs: 0,
      decisions: [],
    };
    this._timelines.set(missionId, timeline);
    return timeline;
  }

  addEvent(missionId: string, event: string, detail: string): void {
    const timeline = this._timelines.get(missionId);
    if (!timeline) return;
    timeline.events.push({ timestamp: new Date().toISOString(), event, detail });
    timeline.status = event === "COMPLETED" ? "completed" : event === "FAILED" ? "failed" : "active";
  }

  complete(missionId: string, success: boolean): void {
    const timeline = this._timelines.get(missionId);
    if (!timeline) return;
    timeline.status = success ? "completed" : "failed";
    timeline.durationMs = Date.now() - new Date(timeline.events[0].timestamp).getTime();
    timeline.decisions = decisionRegistry.getByMission(missionId).map(d => d.id);
  }

  get(missionId: string): MissionTimeline | undefined {
    return this._timelines.get(missionId);
  }

  all(): MissionTimeline[] {
    return [...this._timelines.values()];
  }
}

export const missionTimeline = new MissionTimelineBuilder();
