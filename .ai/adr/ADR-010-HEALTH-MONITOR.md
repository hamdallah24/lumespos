---
id: adr-010-health-monitor-v1
title: ADR-010 — Health Monitor (In-Memory, Periodic)
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-29
last_reviewed: 2026-06-29
review_trigger:
  - OnArchitectureChange
knowledge_level: reference
context_priority: normal
depends_on:
  - adr-009-observability-v1
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr
  - health
  - monitor
  - sprint-3.6
purpose: |
  Document Sprint 3.6 decision: periodic system health checks
  with auto-start on server boot.
---

# ADR-010: Health Monitor (In-Memory, Periodic)

## Context

Sprint 3.5 delivered observability — tracing what has already happened. But the system lacks visibility into its CURRENT condition: are APIs reachable? Is the server overloaded? Observability answers "what went wrong in the past". Health Monitor answers "is the system healthy RIGHT NOW".

## Decision

**In-memory periodic health monitor auto-started on server boot.**

5 checks registered:
1. **DeepSeek** — sends a minimal API call (1 token ping). Degraded if not configured, unhealthy if unreachable.
2. **GitHub** — HEAD request to repo. Degraded if no PAT, unhealthy if unreachable.
3. **SSH** — `echo ok` via SSH. Degraded if no auth, unhealthy if unreachable.
4. **PM2** — checks process uptime. Degraded if <5 min (recent restart).
5. **System** — CPU loadavg, RAM usage, disk estimate via `os` module.

Runs every 60 seconds. Auto-starts on `index.ts` server boot via `startHealthMonitor()`. Reports to console in PM2 logs with box-drawn format.

Format:
```
╔══════════════════════════════════════╗
║  Engineering Runtime Monitor        ║
║  Status: 🟢 Healthy                 ║
║  System                             ║
║    CPU: 12.0%                       ║
║    RAM: 34.2%                       ║
║    🟢 DeepSeek      OK 420ms       ║
║    🟢 GitHub         OK 210ms       ║
║    🟢 SSH            OK 34ms        ║
╚══════════════════════════════════════╝
```

## Consequences

### Positive
- Immediate visibility into system health through PM2 logs
- Auto-detects API outages, SSH failures, resource pressure
- Zero database impact — all in-memory
- Ring buffer of 60 reports for history
- `healthMonitor.check()` callable on-demand for external monitoring

### Negative
- SSH check requires valid SSH config (key or password)
- DeepSeek ping consumes 1 token per minute (~0.14% of 700 daily)
- Box-drawn format may not render in all terminals (but PM2 handles it)

## Status

Accepted and implemented in Sprint 3.6 (`e38ed636`).
