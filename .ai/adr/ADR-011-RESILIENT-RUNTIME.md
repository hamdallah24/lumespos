---
id: adr-011-resilient-runtime-v1
title: ADR-011 — Resilient Runtime (Sprint 4)
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
  - adr-010-health-monitor-v1
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr
  - circuit-breaker
  - health
  - resilience
  - sprint-4
purpose: |
  Sprint 4: Circuit Breaker (CLOSED/OPEN/HALF_OPEN), weighted Health Policy,
  GET /api/health endpoint. Start of Milestone 3: Resilient Runtime.
---

# ADR-011: Resilient Runtime (Sprint 4)

## Context

Milestone 1 (Foundation) and Milestone 2 (Observable Runtime) are complete. The system can observe itself but cannot act on observations. Milestone 3: Resilient Runtime — the system protects itself from cascading failures.

## Decisions

### 1. Circuit Breaker — 3-state state machine

Service wrappers: `deepseekBreaker`, `githubBreaker`, `sshBreaker`. Each independently tracks failures.

States: CLOSED → OPEN (3 failures/30s) → HALF_OPEN (60s cooldown) → CLOSED (test success) or OPEN (test failure).

Rationale: Prevents cascading failures. If DeepSeek is returning 400 errors, stop sending requests for 60 seconds instead of retrying immediately and failing faster.

### 2. Health Policy — Weighted Score

5 weighted components:
| Component | Weight |
|-----------|--------|
| DeepSeek | 35% |
| System | 20% |
| GitHub | 15% |
| SSH | 15% |
| Runtime | 15% |

Score: 0-100 per component, weighted total. Each component provides a detail string explaining deductions (e.g., "CPU load 3.2" deducts 20 points from System).

Rationale: Binary healthy/unhealthy hides degradation. "97/100" tells you the system is working but could be better. "78/100" demands investigation.

### 3. GET /api/health endpoint

Owner-only. Returns JSON: `{ score, status, components, registry, timestamp }`. Callable by external monitoring (UptimeRobot, Grafana).

## Status

Accepted and implemented in Sprint 4 (`da555781`).
