# Markdown Usage Matrix
## EPIC S.9.5 — Phase 1
**Date:** 2026-07-14

---

## Source: `docs/` files → Runtime consumption

| Source File | Exists? | Read By Runtime? | Via FoundationLoader? | Status |
|---|---|---|---|---|
| `docs/executive-runtime/executives/CEO/SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ (compiled via DGPS) | PASS |
| `docs/executive-runtime/executives/CEO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ✅ (compiled via DGPS) | PASS |
| `docs/executive-runtime/executives/CEO/PLAYBOOK.md` | ✅ | ❌ | ✅ (compiled via DGPS) | PASS |
| `docs/executive-runtime/executives/CTO/SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CTO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CTO/PLAYBOOK.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/COO/SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/COO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/COO/PLAYBOOK.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CFO/SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CFO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CFO/PLAYBOOK.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CMO/SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CMO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CMO/PLAYBOOK.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CAIO/SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CAIO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CAIO/PLAYBOOK.md` | ✅ | ❌ | ✅ | PASS |
| `docs/executive-runtime/executives/CKO/SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ (but orphaned) | ⚠️ ORPHAN |
| `docs/executive-runtime/executives/CKO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ✅ (but orphaned) | ⚠️ ORPHAN |
| `docs/executive-runtime/executives/CKO/PLAYBOOK.md` | ✅ | ❌ | ✅ (but orphaned) | ⚠️ ORPHAN |
| `docs/executive-runtime/executives/CHRO/SYSTEM_PROMPT.md` | ✅ | ❌ | ❌ (missing from ROLE_DIRECTIVE_MAP) | ❌ FAIL |
| `docs/executive-runtime/executives/CHRO/EXECUTIVE_SPEC.md` | ✅ | ❌ | ❌ (missing from ROLE_DIRECTIVE_MAP) | ❌ FAIL |
| `docs/executive-runtime/executives/CHRO/PLAYBOOK.md` | ✅ | ❌ | ❌ (missing from ROLE_DIRECTIVE_MAP) | ❌ FAIL |
| `docs/executive-runtime/EXECUTIVE_CONSTITUTION.md` | ✅ | ❌ | ✅ (compiled) | PASS |
| `docs/executive-runtime/prompts/GLOBAL_SYSTEM_PROMPT.md` | ✅ | ❌ | ✅ (compiled) | PASS |
| `docs/executive-runtime/knowledge/*.md` | ✅ | ❌ | ✅ (compiled) | PASS |
| `docs/PROJECT_CONTEXT.md` | ✅ | ✅ (ConsultantProvider) | ❌ (direct readFileSync) | ❌ FAIL |
| `docs/architecture/ADR-*.md` | ✅ | ❌ | ✅ (compiled) | PASS |

## Source: `.ai/` files → Runtime consumption

| Source File | Exists? | Read By Runtime? | Via FoundationLoader? | Status |
|---|---|---|---|---|
| `.ai/PROJECT_CONTEXT.md` | ✅ | ✅ (ConsultantProvider) | ❌ (direct readFileSync) | ❌ FAIL |
| `.ai/README.md` | ✅ | ✅ (ConsultantProvider) | ❌ (direct readFileSync) | ❌ FAIL |
| `.ai/runtime/registry/RUNTIME_REGISTRY.md` | ✅ | ✅ (OrganizationEngine) | ❌ (direct readFileSync) | ⚠️ has fallback |

## Source: Compiled DGPS assets → Runtime consumption

| Asset | Exists? | Read By Runtime? | Via FoundationLoader? | Status |
|---|---|---|---|---|
| `.ai/registry/manifest.json` | ✅ | ✅ | ✅ | PASS |
| `.ai/registry/foundation.json` | ✅ | ✅ | ✅ | PASS |
| `.ai/registry/executive.json` | ✅ | ✅ | ✅ (but files not found) | ❌ FAIL |
| `.ai/registry/knowledge.json` | ✅ | ✅ | ✅ | PASS |
| `.ai/registry/prompt.json` | ✅ | ✅ | ✅ | PASS |
| `.ai/registry/adr.json` | ✅ | ✅ | ✅ | PASS |
| `.ai/generated/foundation/*.json` | ✅ (17) | ✅ | ✅ | PASS |
| `.ai/generated/knowledge/*.json` | ✅ (50) | ✅ | ✅ | PASS |
| `.ai/generated/runtime/*.json` | ✅ (8) | ❌ | ❌ (expected in executive/) | ❌ FAIL |
| `.ai/generated/prompt/*.json` | ✅ (2) | ✅ | ✅ | PASS |
| `.ai/generated/adr/*.json` | ✅ (9) | ✅ | ✅ | PASS |
