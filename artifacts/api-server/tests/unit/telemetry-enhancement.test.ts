// T5.5A.1 — Telemetry Enhancement & Distributed Tracing Tests
import { describe, it, expect, beforeEach } from "vitest";
import { learningTelemetry, recordTelemetry, TraceContext } from "../../src/learning-effectiveness/telemetry";

describe("TraceContext", () => {
  beforeEach(() => {
    TraceContext.clearTrace();
    TraceContext.clearSession();
  });

  it("should generate trace IDs", () => {
    const id = TraceContext.startTrace();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
    expect(TraceContext.getTraceId()).toBe(id);
  });

  it("should generate session IDs", () => {
    const id = TraceContext.startSession();
    expect(id).toBeTruthy();
    expect(TraceContext.getSessionId()).toBe(id);
  });

  it("should clear trace context", () => {
    TraceContext.startTrace();
    expect(TraceContext.getTraceId()).toBeTruthy();
    TraceContext.clearTrace();
    expect(TraceContext.getTraceId()).toBeNull();
  });

  it("should generate child traces", () => {
    const child = TraceContext.generateChildTrace();
    expect(child).toBeTruthy();
    expect(child.length).toBeGreaterThan(5);
  });
});

describe("Enhanced TelemetryEvent", () => {
  beforeEach(() => { learningTelemetry.clear(); });

  it("should include eventVersion and sequence", () => {
    const e = recordTelemetry({ type: "retrieve", durationMs: 10, result: "success" });
    expect(e.eventVersion).toBe(1);
    expect(e.sequence).toBeGreaterThan(0);
  });

  it("should set default severity to INFO", () => {
    const e = recordTelemetry({ type: "ingest", durationMs: 5, result: "success" });
    expect(e.severity).toBe("INFO");
  });

  it("should infer category from type", () => {
    expect(recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" }).category).toBe("retrieve");
    expect(recordTelemetry({ type: "ingest", durationMs: 1, result: "success" }).category).toBe("ingest");
    expect(recordTelemetry({ type: "feedback", durationMs: 1, result: "success" }).category).toBe("feedback");
    expect(recordTelemetry({ type: "maintenance", durationMs: 1, result: "success" }).category).toBe("maintenance");
  });

  it("should accept explicit category and severity", () => {
    const e = recordTelemetry({ type: "maintenance", category: "health", severity: "WARN", durationMs: 50, result: "failure" });
    expect(e.category).toBe("health");
    expect(e.severity).toBe("WARN");
  });

  it("should include traceId and sessionId when provided", () => {
    const e = recordTelemetry({ type: "retrieve", traceId: "trace-1", sessionId: "session-1", durationMs: 10, result: "success" });
    expect(e.traceId).toBe("trace-1");
    expect(e.sessionId).toBe("session-1");
  });

  it("should include runtime and environment", () => {
    const e = recordTelemetry({ type: "retrieve", runtime: "test", environment: "testing", durationMs: 5, result: "success" });
    expect(e.runtime).toBe("test");
    expect(e.environment).toBe("testing");
  });

  it("should include startTime and endTime", () => {
    const e = recordTelemetry({ type: "retrieve", durationMs: 100, result: "success" });
    expect(e.startTime).toBeTruthy();
    expect(e.endTime).toBeTruthy();
  });

  it("should include analytics metadata", () => {
    const e = recordTelemetry({
      type: "retrieve", durationMs: 10, result: "success",
      executiveRole: "CEO", decisionId: "dec-1", missionId: "mis-1",
      branchId: "b1", organizationId: "org-1",
    });
    expect(e.executiveRole).toBe("CEO");
    expect(e.decisionId).toBe("dec-1");
    expect(e.missionId).toBe("mis-1");
    expect(e.branchId).toBe("b1");
  });
});

describe("Enhanced TelemetryStore", () => {
  beforeEach(() => { learningTelemetry.clear(); });

  it("findByTrace returns events for trace", () => {
    recordTelemetry({ type: "retrieve", traceId: "t1", durationMs: 1, result: "success" });
    recordTelemetry({ type: "ingest", traceId: "t1", durationMs: 1, result: "success" });
    recordTelemetry({ type: "retrieve", traceId: "t2", durationMs: 1, result: "success" });
    const trace1 = learningTelemetry.findByTrace("t1");
    expect(trace1.length).toBe(2);
  });

  it("findBySession returns events for session", () => {
    recordTelemetry({ type: "retrieve", sessionId: "s1", durationMs: 1, result: "success" });
    recordTelemetry({ type: "feedback", sessionId: "s1", durationMs: 1, result: "success" });
    const s1 = learningTelemetry.findBySession("s1");
    expect(s1.length).toBe(2);
  });

  it("findChildren returns child events", () => {
    const parent = recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" });
    recordTelemetry({ type: "ingest", parentEventId: parent.id, durationMs: 1, result: "success" });
    const children = learningTelemetry.findChildren(parent.id);
    expect(children.length).toBe(1);
    expect(children[0].parentEventId).toBe(parent.id);
  });

  it("findParents returns parent event", () => {
    const parent = recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" });
    const child = recordTelemetry({ type: "ingest", parentEventId: parent.id, durationMs: 1, result: "success" });
    const parents = learningTelemetry.findParents(child.id);
    expect(parents.length).toBe(1);
    expect(parents[0].id).toBe(parent.id);
  });

  it("rebuildTimeline returns events in sequence order", () => {
    recordTelemetry({ type: "retrieve", traceId: "tl1", durationMs: 1, result: "success" });
    recordTelemetry({ type: "ingest", traceId: "tl1", durationMs: 1, result: "success" });
    recordTelemetry({ type: "feedback", traceId: "tl1", durationMs: 1, result: "success" });
    const timeline = learningTelemetry.rebuildTimeline("tl1");
    expect(timeline.length).toBe(3);
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].sequence).toBeGreaterThan(timeline[i - 1].sequence);
    }
  });

  it("countByCategory aggregates correctly", () => {
    recordTelemetry({ type: "retrieve", category: "retrieve", durationMs: 1, result: "success" });
    recordTelemetry({ type: "ingest", category: "ingest", durationMs: 1, result: "success" });
    recordTelemetry({ type: "ingest", category: "ingest", durationMs: 1, result: "success" });
    const cats = learningTelemetry.countByCategory();
    expect(cats["retrieve"]).toBe(1);
    expect(cats["ingest"]).toBe(2);
  });

  it("countByExecutive aggregates correctly", () => {
    recordTelemetry({ type: "retrieve", executive: "CEO", durationMs: 1, result: "success" });
    recordTelemetry({ type: "retrieve", executive: "CTO", durationMs: 1, result: "success" });
    recordTelemetry({ type: "retrieve", executive: "CEO", durationMs: 1, result: "success" });
    const execs = learningTelemetry.countByExecutive();
    expect(execs["CEO"]).toBe(2);
    expect(execs["CTO"]).toBe(1);
  });

  it("groupBy groups events", () => {
    recordTelemetry({ type: "retrieve", executive: "CEO", durationMs: 1, result: "success" });
    recordTelemetry({ type: "ingest", executive: "CEO", durationMs: 1, result: "success" });
    const groups = learningTelemetry.groupBy("executive");
    expect(groups["CEO"].length).toBe(2);
  });

  it("histogram buckets duration values", () => {
    recordTelemetry({ type: "retrieve", durationMs: 5, result: "success" });
    recordTelemetry({ type: "retrieve", durationMs: 15, result: "success" });
    recordTelemetry({ type: "retrieve", durationMs: 25, result: "success" });
    const hist = learningTelemetry.histogram("durationMs", 10);
    expect(hist.length).toBeGreaterThanOrEqual(2);
    expect(hist[0].count).toBeGreaterThanOrEqual(1);
  });

  it("timeSeries returns windows", () => {
    recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" });
    recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" });
    const series = learningTelemetry.timeSeries(60000);
    expect(series.length).toBeGreaterThanOrEqual(1);
    expect(series[0].count).toBeGreaterThanOrEqual(2);
  });

  it("percentile computes correctly", () => {
    for (let i = 1; i <= 100; i++) {
      recordTelemetry({ type: "retrieve", durationMs: i, result: "success" });
    }
    expect(learningTelemetry.percentile("durationMs", 50)).toBe(50);
    expect(learningTelemetry.percentile("durationMs", 90)).toBe(90);
    expect(learningTelemetry.percentile("durationMs", 99)).toBe(99);
  });
});

describe("Export", () => {
  beforeEach(() => { learningTelemetry.clear(); });

  it("should export JSON", () => {
    recordTelemetry({ type: "retrieve", durationMs: 10, result: "success" });
    const json = learningTelemetry.exportEvents("json");
    expect(json).toContain("eventVersion");
    expect(json).toContain("retrieve");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("should export NDJSON", () => {
    recordTelemetry({ type: "retrieve", durationMs: 10, result: "success" });
    recordTelemetry({ type: "ingest", durationMs: 5, result: "success" });
    const ndjson = learningTelemetry.exportEvents("ndjson");
    const lines = ndjson.trim().split("\n");
    expect(lines.length).toBe(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("should export CSV", () => {
    recordTelemetry({ type: "retrieve", durationMs: 10, result: "success" });
    const csv = learningTelemetry.exportEvents("csv");
    expect(csv).toContain("eventVersion");
    expect(csv).toContain("retrieve");
    const lines = csv.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it("should export empty CSV gracefully", () => {
    const csv = learningTelemetry.exportEvents("csv");
    expect(csv).toBe("");
  });
});

describe("TelemetryStore Health", () => {
  beforeEach(() => { learningTelemetry.clear(); });

  it("should return health metrics", () => {
    recordTelemetry({ type: "retrieve", durationMs: 10, result: "success" });
    const health = learningTelemetry.getHealth();
    expect(health.size).toBe(1);
    expect(health.maxSize).toBeGreaterThan(0);
    expect(typeof health.memoryUsage).toBe("number");
    expect(typeof health.droppedEvents).toBe("number");
    expect(health.oldestEvent).toBeTruthy();
    expect(health.newestEvent).toBeTruthy();
    expect(health.averageLatency).toBe(10);
  });

  it("should handle empty store health", () => {
    const health = learningTelemetry.getHealth();
    expect(health.size).toBe(0);
    expect(health.oldestEvent).toBeNull();
    expect(health.newestEvent).toBeNull();
  });
});

describe("Backward Compatibility", () => {
  beforeEach(() => { learningTelemetry.clear(); });

  it("should still support basic getStats()", () => {
    recordTelemetry({ type: "retrieve", engine: "org", executive: "CEO", durationMs: 100, result: "success" });
    const stats = learningTelemetry.getStats();
    expect(stats.total).toBe(1);
    expect(stats.byType["retrieve"]).toBe(1);
    expect(stats.successRate).toBe(100);
  });

  it("should still support basic query()", () => {
    recordTelemetry({ type: "retrieve", durationMs: 10, result: "success" });
    const results = learningTelemetry.query({ type: "retrieve" });
    expect(results.length).toBe(1);
  });

  it("should still clear events", () => {
    recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" });
    learningTelemetry.clear();
    expect(learningTelemetry.count()).toBe(0);
  });
});
