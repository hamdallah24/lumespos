# ENGINEERING_BASELINE_v1.md

> Baseline frozen: 2026-06-30
> Sprint phase: Post 6.6 (Critical Remediation), Pre 7 (Foundation Alignment)
> Status: LOCKED — all future sprints measured against this baseline

## Health Scores

| Domain | Score | Status |
|--------|-------|--------|
| Foundation | 100% | LOCKED |
| Governance | 80% | PARTIALLY LOCKED |
| Architecture | 70% | NOT LOCKED |
| Runtime | 50% | NOT LOCKED |
| Knowledge | 30% | OPEN |
| Security | 60% | NOT LOCKED |
| Identity | 0% | OPEN |
| Capability | 0% | OPEN |
| Autonomy | 0% | OPEN |

## Issue Metrics

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 4 |
| MEDIUM | 11 |
| LOW | 15 |

## Technical Debt

| Metric | Value |
|--------|-------|
| Legacy code in routes/ | 2,373 lines |
| Broken cross-references | 0 |
| Duplicate Foundation docs | 0 |
| Circular dependencies | 1 (registry ↔ health-policy) |
| Empty stubs (planned) | 6 |
| Unused imports | 9 |

## Component Registry

| Registered Components | Count |
|----------------------|-------|
| Total | 22 |
| Runtime (in ai/runtime/) | 12 |
| Governance (in ai/governance/) | 4 |
| Security (in ai/security/) | 2 |
| Infrastructure (events, trace, metrics, etc.) | 4 |

## Pipeline Status (from ENGINEERING_RUNTIME_ARCHITECTURE.md)

| Component | Priority | Files |
|-----------|----------|-------|
| LLM Gateway | P0 | runtime/llm-gateway.ts + routes/ai-helpers.ts |
| Response Renderer | P0 | routes/ai.ts (fakeStream) |
| Tool Executor | P0 | runtime/tool-executor.ts + routes/ai-helpers.ts |
| Validator | P1 | runtime/validator.ts |
| Memory Bridge | P1 | routes/ai-helpers.ts (getHistory/remember) |
| Prompt Assembler | P2 | routes/ai.ts (inline) + routes/ai-prompts.ts |
| Knowledge Loader | P2 | Not implemented |
| Planner | P3 | Not implemented |
| Intent Classifier | P3 | routes/ai.ts (inline needsDevOps) |
| Knowledge Evolution | P4 | Not implemented |

## Foundation Docs

| Doc | Location | Version | Status |
|-----|----------|---------|--------|
| NORTH_STAR | foundation/ | 1.0.0 | Active |
| CONSTITUTION | root | 1.0.0 | Active |
| PROJECT_CONTEXT | root | 1.0.0 | Active |
| AI_OPERATING_MODEL | foundation/ | 1.0.0 | Active |
| CTO_EXECUTION_DIRECTIVE | foundation/ | 1.0.0 | Active |
| FOUNDATION_INDEX | foundation/ | 1.0.0 | Active |
| README | root | 1.0.0 | Active |

## Knowledge Assets

| Type | Count | Status |
|------|-------|--------|
| ADRs (populated) | 8 (006-013) | Active |
| ADRs (planned) | 5 (001-005) | Planned |
| Sprint Reports | 6 | Active |
| Proposals | 3 | Active |
| Assessments | 10 | Active |
| Playbooks | 7 | 1 planned, 6 empty |
| Standards | 6 | Empty |
| Specs | 8 | Empty |
| Architecture docs | 8 | Empty |
| Runtime blueprints | 3 | Active |
| Templates | 5 | Empty |

## Deprecated Documents (archived)

| File | Reason | Location |
|------|--------|----------|
| NORTH_STAR.md (old) | Replaced by foundation/ version | workspace/archived/ |
| AI_OPERATING_MODEL.md (old) | Replaced by foundation/ version | workspace/archived/ |
| CTO_EXECUTION_DIRECTIVE.md (old) | Replaced by foundation/ version | workspace/archived/ |
