# ADR-006: Organization Layer

**Status:** ACCEPTED
**Date:** ECP-041–ECP-042
**Supersedes:** Ad-hoc runtime registration and delegation

## Context

Multi-executive collaboration required a formal organization layer above the Execution Foundation.

## Decision

| Module | Owner | Responsibility |
|--------|-------|---------------|
| `OrganizationEngine` | organization-engine.ts | Single dispatcher for executive routing (SSOT) |
| `ExecutiveBoard` | executive-board.ts | Single registry for all executives (SSOT) |
| `ExecutiveCollaboration` | executive-collaboration.ts | Session lifecycle, task distribution, result collection |
| `ExecutiveTask` | executive-task.ts | Standard task format for all executives |
| `ExecutiveVoting` | executive-voting.ts | YES/NO/ABSTAIN voting with tally |
| `ExecutiveDebate` | executive-debate.ts | Multi-turn discussion with moderator |
| `ExecutiveReport` | executive-report.ts | Output format + CEO synthesis prompt |

## Rules

1. `OrganizationEngine.delegate()` is the **single** executive dispatcher
2. No component may have a local executive routing map
3. `ExecutiveBoard` is the **single** executive registry
4. Collaboration Engine **MUST NOT** reason, vote, or synthesize
5. CEO is the **single** synthesizer of executive reports
6. Runtimes **MUST NOT** call other runtimes directly

## Dependencies

Organization Layer → Execution Foundation → LLM Adapter → Tool Adapter

## Violations

Direct Runtime-to-Runtime calls = Architecture Compliance FAIL.
