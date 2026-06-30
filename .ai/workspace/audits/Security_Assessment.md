---
id: security-assessment-v1
title: Security Assessment
domain: workspace
artifact_type: report
owner: CTO
status: Active
version: 1.0.0
last_updated: 2026-06-30
tags: [sprint-6.5, assessment, security]
---

# Security Assessment

## Executive Summary

The system has 5 security layers built since Sprint 4: Classification (PUBLIC→FOUNDER_ONLY), LLM Provider abstraction, Authority Gate, Constitutional Validator, and circuit breakers. Gaps: Classification is not enforced in the context loading pipeline (Knowledge Loader doesn't check it), no secret rotation mechanism, SSH password visible in process args during health checks, and no audit trail for data access.

## Evidence

| # | Severity | Finding |
|---|----------|---------|
| 1 | **HIGH** | SSH password exposed in process arguments during health checks | health-monitor.ts: `SSHPASS='...' sshpass -e...` — visible via `ps aux` |
| 2 | **MEDIUM** | Classification system exists but is NOT enforced in pipeline | classification.ts exists, but Knowledge Loader doesn't call canSendToLLM() |
| 3 | **MEDIUM** | DeepSeek API key in environment — no rotation or vault | Process env only |
| 4 | **MEDIUM** | GitHub PAT in environment — no rotation | Process env only |
| 5 | **LOW** | Authority Gate built but not yet integrated into proposal workflow | governance/authority-gate.ts exists as standalone |
| 6 | **LOW** | Constitutional Validator has 5 rules — covers core, not edge cases | constitutional-validator.ts |

## Existing Security Controls

| Control | Status | Notes |
|---------|--------|-------|
| Content Classification | ✅ Built | Not yet enforced in pipeline |
| LLM Provider Abstraction | ✅ Built | DeepSeek adapter only |
| Authority Gate (proposal approval) | ✅ Built | Not yet integrated |
| Constitutional Validator | ✅ Built | Not yet integrated |
| Circuit Breaker (DeepSeek/GitHub/SSH) | ✅ Built | Independent per-service |
| Secret detection (API keys in content) | ✅ Built | classification.ts:classifyContent |
| Rate limiting | ✅ Built | Per-user per-mode sliding window |
| CSRF protection | ✅ Built | Double submit pattern |

## Recommendation

1. **P1:** Fix SSH password exposure in health checks — use SSH key or background process
2. **P2:** Integrate Classification into Knowledge Loader — enforce canSendToLLM() before any LLM call
3. **P2:** Integrate Authority Gate + Constitutional Validator into proposal submission workflow
4. **P3:** Add secret rotation via environment variable provider abstraction
5. **P3:** Add data access audit trail (who read what, when)

## Estimated Effort
P1: 20 min | P2: 30 min each | P3: 1 sprint each

## Suggested Sprint
P1 in Sprint 7 | P2 in Sprint 10 (Knowledge Loader) + Sprint 15 (Governance) | P3 in Sprint 14-15
