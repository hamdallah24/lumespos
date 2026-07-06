# Lumé CMN — Project Context & Current Issues

**Date**: 2026-07-05  
**Version**: v1.0 Architecture Complete + Intelligence Layer  
**Target Audience**: Technical Lead / AI Support Engineer  

---

## 1. What Is Lumé CMN?

Lumé's Everywhere (Lumé CMN) is a **multi-agent AI Executive Organization** built on top of a Point-of-Sale (POS) system. It is NOT a chatbot. It is an AI Operating System where multiple AI agents (CEO, CTO, COO, CFO) collaborate to execute missions.

### 6-Layer Architecture

```
Layer 6 — Governance      Audit, Quality, Policy, Risk, Improvement
Layer 5 — Collective       Consensus, Fusion, Reputation, Decisions  
Layer 4 — Learning         Experience → Knowledge → Retrieval
Layer 3 — Organization     Multi-Executive, Collaboration, Board
Layer 2 — Intelligence     Adaptive Planning, Elastic Budget
Layer 1 — Foundation       Execution, Pipeline, Governor, Driver
```

**Key principle**: Foundation is FROZEN. All new features are extensions built above it.

---

## 2. Architecture Overview

### Request Flow

```
Founder (User)
  ↓ POST /api/ai/chat
CEO Runtime → OrganizationEngine → ExecutiveCollaboration
  ↓
CTO Runtime → ExecutionPipeline → ExecutionDriver → ExecutionGovernor
  ↓
LLM Adapter (DeepSeek v4-pro via SumoPod) → Tool Adapter (readFile, execCommand, etc.)
  ↓
Executive Result → CEO Synthesis → Founder
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| ExecutionGovernor | `src/ai/runtime/execution/execution-governor.ts` | SSOT for execution policy (budget, evidence, strategy) |
| ExecutionDriver | `src/ai/runtime/execution/execution-driver.ts` | Lifecycle controller — the while loop |
| ExecutionPipeline | `src/ai/runtime/execution/execution-pipeline.ts` | Single entry point for all execution |
| LLM Adapter | `src/ai/llm/llm-adapter.ts` | Stateless DeepSeek API communication |
| Tool Adapter | `src/ai/tools/tool-adapter.ts` | Stateless tool execution (readFile, execCommand, etc.) |
| Prompt Assembler | `src/ai/runtime/prompt-assembler.ts` | System prompt builder for all runtimes |
| CEO Runtime | `src/ai/programs/ceo-runtime.ts` | Orchestrates delegation + synthesis |
| CTO Runtime | `src/ai/programs/cto-runtime.ts` | Technical execution: reads files, runs commands |
| Organization Engine | `src/ai/runtime/organization-engine.ts` | SSOT dispatcher — determines which executive handles a task |
| Executive Collaboration | `src/organization/executive-collaboration.ts` | Multi-executive parallel dispatch + collect |

### LLM Provider

- **Provider**: SumoPod (DeepSeek API reseller)
- **Model**: `deepseek-v4-pro` (higher token density than `deepseek-chat`: 1.55x)
- **Context window**: ~32K tokens (conservative estimate for v4-pro)
- **Current budget**: 25,000 tokens per mission (medium complexity)

---

## 3. Current Problems

### Problem A: CTO Output Quality (Active Investigation)

**Symptom**: CTO successfully reads files and runs commands, but produces generic reports instead of technical analysis.

**Root cause chain** (resolved ✅):
1. ~~Budget too small (12K → 25K)~~ — FIXED
2. ~~Evidence not tracking file paths~~ — FIXED  
3. ~~Model stuck in EXPLORE/INVESTIGATE loop~~ — FIXED (MissionIntelligence CONCLUDE)
4. ~~CEO hallucinating "Waiting for CTO"~~ — FIXED (BLOCK 5.5 + Runtime Status)

**Root cause chain** (active 🔴):
5. **CONCLUDE prompt produces generic text** — being addressed (RFC-013)
6. **CTO reports use speculative language** ("kemungkinan", "mungkin")
7. **Evidence not used to build report content** — Evidence used ONLY for scoring
8. **No traceability**: "Confidence 90%" without justification

**Latest fix deployed**: RFC-013 — CONCLUDE prompt now requires line numbers, banned speculative words, requires confidence justification.

**Latest commit**: `80176c10`

### Problem B: CEO Reports "CTO belum merespon" Despite CTO Completing (Recently Fixed)

**Status**: Fix deployed (`31ffcf2f`). `synthesisContext` now includes `Runtime Status: COMPLETED/FAILED` so CEO LLM knows the ground truth. Testing in progress.

### Problem C: DeepSeek HTTP 400 at Later Cycles (Resolved)

**Status**: FIXED (`a8c276df` + `ad2f6fa0`). Auto-cap `max_tokens` prevents context overflow. File context capped to 3,000 chars. Model context limit set to 32K conservative.

### Problem D: CTO Reads Cache Files Instead of Project Files (Resolved)

**Status**: FIXED (`6ef53108`). `MissionContextRegistry` enforces workspace whitelist (artifacts/, src/, .ai/, docs/). Blacklist (.local/, .cache/, node_modules/). CTO file context reduced from 12,829 → 3,000 chars.

---

## 4. Key Files for Debugging

| File | Purpose |
|------|---------|
| `/home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-driver.ts` | Main execution loop, CONCLUDE logic |
| `/home/ubuntu/lumespos/artifacts/api-server/src/ai/programs/cto-runtime.ts` | CTO fetchContext(), LLM call |
| `/home/ubuntu/lumespos/artifacts/api-server/src/ai/llm/llm-adapter.ts` | DeepSeek API communication |
| `/home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/prompt-assembler.ts` | System prompt builder |
| `/home/ubuntu/lumespos/artifacts/api-server/src/routes/ai-prompts.ts` | Output schemas (CEO + CTO) |
| `/home/ubuntu/lumespos/artifacts/api-server/src/organization/executive-collaboration.ts` | Multi-exec dispatch |
| `/home/ubuntu/lumespos/artifacts/api-server/src/memory/` | ContextManager, MissionIntelligence, BudgetTracker |

---

## 5. Deployment

```bash
cd ~/lumespos
git pull origin main
pnpm --filter ./artifacts/api-server run build
pm2 restart pos-api
```

### Quick Health Check

```bash
pm2 status
pm2 logs pos-api --lines 30 --nostream | grep -E "Mission Budget|STOP:|error"
```

---

## 6. Next Steps

| Priority | Task | Status |
|:---:|------|:---:|
| P0 | Verify RFC-013 CONCLUDE prompt produces traceable analysis | Testing |
| P1 | Monitor CEO responses — no more "waiting" hallucination | Testing |
| P2 | Consider per-cycle `max_tokens` cap if budget still exceeds | Not started |
| P3 | Add Executive Evidence Builder (separate evidence from LLM reasoning) | Future |
| P4 | Migrate from deepseek-v4-pro to model with lower token density | Future |
