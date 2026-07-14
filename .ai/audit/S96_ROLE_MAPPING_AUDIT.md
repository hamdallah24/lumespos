# Role Mapping Audit
## EPIC S.9.6 — Phase 4: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## 1. ROLE_DIRECTIVE_MAP — All Executive Mappings

### Source: `src/ai/runtime/foundation/domains/runtime-domain.ts:7-15`

```typescript
const ROLE_DIRECTIVE_MAP: Record<string, string> = {
  CEO: "ceo-directive",
  CTO: "cto-directive",
  COO: "coo-directive",
  CFO: "cfo-directive",
  CMO: "cmo-directive",
  CAIO: "caio-directive",
  CKO: "cko-directive",
  // CHRO IS MISSING ← confirmed
};
```

### Count: 7 entries
- CEO ✅
- CTO ✅
- COO ✅
- CFO ✅
- CMO ✅
- CAIO ✅
- CKO ✅
- CHRO ❌ **MISSING**

---

## 2. Registry Has CHRO

### Source: `.ai/registry/executive.json:66-74`
```json
"chro-directive": {
  "artifact": "runtime",
  "version": "1.0.0",
  "checksum": "3977b2af3886d080f9d4e3ec7079a7df06138e7df7e3382ce19738a95e621819",
  "consumer": ["chro-runtime"],
  "owner": "CHRO"
}
```
CHRO is **registered** with a valid checksum and consumer.

---

## 3. Compiled Asset Exists

### Source: `.ai/generated/runtime/chro-directive.directive.json` (lines 1-5)
```json
{
  "asset_type": "directive",
  "id": "chro-directive",
  "canonical": true,
  "metadata": { "title": "CHRO Runtime Directive", ... }
}
```
CHRO compiled asset **exists** on disk.

---

## 4. CHROProgram.ts Tries to Load Directive

### Source: `src/executive-runtime/executives/CHRO/CHROProgram.ts:26-30`
```typescript
function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CHRO");
  return content || "";         // ← fallback to empty string
}
```

### Flow: `provider.getDirective("CHRO")`
```
getFoundationProvider().getDirective("CHRO")
  → foundation-provider.ts:51
    → runtimeDomain.directive("CHRO")
      → runtime-domain.ts:27
        const docId = ROLE_DIRECTIVE_MAP[role.toUpperCase()];
        // ROLE_DIRECTIVE_MAP["CHRO"] = undefined ← NOT FOUND!
      → runtime-domain.ts:28
        if (!docId) return null;   ← RETURNS NULL
  → Returns ""
```

---

## 5. All Other Mappings Work

### `runtime-domain.ts:26-41` — The `directive()` method
```typescript
directive(role: string): ... {
  const docId = ROLE_DIRECTIVE_MAP[role.toUpperCase()];
  if (!docId) return null;                             // ← CHRO hits this
  if (!this._authorize(role, docId)) return null;
  const content = getAssetContent(docId);
  if (!content) return null;                           // ← other execs hit this (dir mismatch)
  return { directive: content, ... };
}
```

**Two failure modes for CHRO:**
1. **Primary failure:** `ROLE_DIRECTIVE_MAP` returns `undefined` → null → empty string
2. **Secondary failure:** Even if CHRO were in the map, `getAssetContent("chro-directive")` would also return empty due to the directory mismatch (P0 Finding 1)

**Other 7 executives:** Only fail at step 2 (directory mismatch) — their ROLE_DIRECTIVE_MAP entries exist.

---

## 6. Complete Mapping Matrix

| Executive | ROLE_DIRECTIVE_MAP | Registry (executive.json) | Compiled File Exists | Loaded at Runtime |
|-----------|:------------------:|:-------------------------:|:--------------------:|:-----------------:|
| CEO | ✅ `ceo-directive` | ✅ ceo-directive | ✅ | ❌ (dir mismatch) |
| CTO | ✅ `cto-directive` | ✅ cto-directive | ✅ | ❌ (dir mismatch) |
| COO | ✅ `coo-directive` | ✅ coo-directive | ✅ | ❌ (dir mismatch) |
| CFO | ✅ `cfo-directive` | ✅ cfo-directive | ✅ | ❌ (dir mismatch) |
| CMO | ✅ `cmo-directive` | ✅ cmo-directive | ✅ | ❌ (dir mismatch) |
| CAIO | ✅ `caio-directive` | ✅ caio-directive | ✅ | ❌ (dir mismatch) |
| CKO | ✅ `cko-directive` | ✅ cko-directive | ✅ | ❌ (dir mismatch) |
| **CHRO** | **❌ MISSING** | **✅** chro-directive | ✅ | **❌ (no mapping + dir mismatch)** |

---

## 7. Proven Facts

| Fact | Evidence | Confidence |
|------|----------|:----------:|
| `ROLE_DIRECTIVE_MAP` has 7 entries, NOT 8 | `runtime-domain.ts:7-15` — source code confirmed | **100%** |
| `"CHRO"` key is absent from the map | Line-by-line inspection: CEO,CTO,COO,CFO,CMO,CAIO,CKO — no CHRO | **100%** |
| `runtime-domain.ts:28` returns null for unmapped roles | `if (!docId) return null;` | **100%** |
| CHROProgram.ts calls `getDirective("CHRO")` | `CHROProgram.ts:28` → `provider.getDirective("CHRO")` | **100%** |
| CHROProgram.ts falls back to empty string | `CHROProgram.ts:29` → `return content \|\| "";` | **100%** |
| Directive compiled asset exists on disk | `.ai/generated/runtime/chro-directive.directive.json` exists | **100%** |
| Directive is registered in executive.json | `.ai/registry/executive.json:66-74` | **100%** |

**Conclusion: CHRO is genuinely missing from `ROLE_DIRECTIVE_MAP` in `runtime-domain.ts:7-15`. This is not a false positive. The map was likely written before the CHRO executive was created and was never updated. All other 7 executives have entries. CHRO is the only one omitted.**

---

## 8. Secondary Maps Check

### `runtime-domain.ts` — Other methods that also lack CHRO

`authority()` (lines 43-53): Handles CEO → CKO, returns `null` for CHRO
```typescript
if (r === "CKO") return "limited";
// No "CHRO" case → falls through to return null
```

`forbiddenActions()` (lines 55-65): Handles CEO → CKO, returns `[]` for CHRO
```typescript
if (r === "CKO") return ["business_decisions", "code_modification", "financial_operations"];
// No "CHRO" case → falls through to return []
```

`requiredBehaviors()` (lines 67-77): Handles CEO → CKO, returns `[]` for CHRO
```typescript
if (r === "CKO") return ["knowledge_quality_first", "curator_mindset", "evidence_based"];
// No "CHRO" case → falls through to return []
```

`delegates()` (lines 79-85): Handles CEO, CTO, COO only. Returns `{}` for CHRO.

**Pattern:** CHRO is missing from ALL methods in `runtime-domain.ts`. This suggests the CHRO role was added to the executive suite after `runtime-domain.ts` was last updated.
