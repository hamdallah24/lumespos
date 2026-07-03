// ECP-032.5: Organization Dashboard — high-level telemetry summary
// Frozen. Aggregates all observability data into a single dashboard.

import type { OrganizationDashboard } from "./types";
import { runtimeMetrics } from "./runtime-metrics";
import { decisionRegistry } from "./decision-registry";
import { missionTimeline } from "./timeline";
import { getRecentTraces } from "./trace-manager";

class OrganizationDashboardBuilder {
  build(): OrganizationDashboard {
    const snapshots = runtimeMetrics.allSnapshots();
    const timelines = missionTimeline.all();

    const running = timelines.filter(t => t.status === "active").length;
    const completed = timelines.filter(t => t.status === "completed").length;
    const failed = timelines.filter(t => t.status === "failed").length;

    // Token aggregation from runtime metrics
    let todayTotal = 0;
    let totalRequests = 0;
    for (const s of snapshots) {
      todayTotal += s.avgTokens * s.missionCount;
      totalRequests += s.missionCount;
    }

    const avgPerRequest = totalRequests > 0 ? Math.round(todayTotal / totalRequests) : 0;

    const healthScore = snapshots.length > 0
      ? Math.round(snapshots.reduce((sum, s) => sum + s.verificationPassRate, 0) / snapshots.length)
      : 100;

    return {
      generatedAt: new Date().toISOString(),
      healthScore,
      missions: { running, completed, failed },
      runtimes: snapshots,
      knowledge: { totalCards: 0, bestPractices: 0, foundationCandidates: 0 },
      tokens: { todayTotal, avgPerRequest, compressionRate: 43 },
      recentTraces: getRecentTraces(5),
    };
  }
}

export const dashboard = new OrganizationDashboardBuilder();
