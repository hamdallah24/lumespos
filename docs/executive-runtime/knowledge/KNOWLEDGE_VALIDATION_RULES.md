<!--
  EPIC R — Phase 10: Knowledge Validation Rules
  Sources: knowledge-confidence.ts, knowledge-deduplicator.ts,
           knowledge-contradiction.ts, knowledge-lifecycle.ts,
           knowledge-ranker.ts, governance/compliance-engine.ts
  DO NOT EDIT MANUALLY.
-->

# Knowledge Validation Rules

**Version:** 1.0.0  
**Status:** STABLE  

---

## Validation Dimensions

Every piece of knowledge MUST be validated across these dimensions:

| Dimension | Code | Required For | Validation Method |
|-----------|------|-------------|-------------------|
| Evidence | EVD | All knowledge | Source exists and is verifiable |
| Confidence | CNF | All knowledge | Score 0-100, calculated from sources |
| Source | SRC | All knowledge | Origin is identified and traceable |
| Version | VER | All knowledge | Version number or timestamp |
| Owner | OWN | All knowledge | Responsible executive or system |
| Expiration | EXP | Time-sensitive knowledge | Expiry date or TTL |
| Priority | PRI | All knowledge | Importance level (1-5) |
| Dependency | DEP | All knowledge | What other knowledge it depends on |
| Conflict Detection | CFL | All knowledge | No contradictions with active knowledge |

---

## Rule 01: Evidence (EVD)

Every knowledge claim MUST have supporting evidence.

### Evidence Levels
| Level | Criteria | Examples |
|-------|----------|---------|
| EVD-0 | No evidence | LLM hallucination, unverified claim |
| EVD-1 | Single source | One executive episode, one file read |
| EVD-2 | Multiple sources | 2+ independent observations |
| EVD-3 | Verified source | Source confirmed by PRIMARY owner |
| EVD-4 | Immutable evidence | ADR, audit log, constitution |

### Acceptable Evidence Types
| Type | Max Level | Description |
|------|-----------|-------------|
| KnowledgePlatform episode | EVD-2 | Recorded by one executive |
| File content | EVD-2 | Read from filesystem |
| Tool output | EVD-2 | Command execution result |
| Foundation directive | EVD-4 | Immutable, highest authority |
| ADR | EVD-4 | Architecture decision record |
| Audit log | EVD-4 | Immutable audit trail |
| Metric snapshot | EVD-2 | Runtime metric at point in time |
| Multi-source consensus | EVD-3 | 2+ executives agree |
| CEO validation | EVD-3 | CEO confirms finding |

### Validation Rule
- EVD-0 knowledge CANNOT be used for any decision
- EVD-1 knowledge can be used for LOW-confidence decisions only
- EVD-2+ knowledge required for MEDIUM and HIGH decisions

---

## Rule 02: Confidence (CNF)

Knowledge MUST have a confidence score between 0-100.

### Confidence Calculation
```typescript
function calculateConfidence(item: KnowledgeItem): number {
  const sourceConfidence = item.sources.reduce(
    (sum, s) => sum + sourceWeight(s), 0
  ) / item.sources.length * 0.40;

  const validationBonus = validationLevel(item.validation) * 0.30;
  const freshnessScore = freshness(item.timestamp) * 0.15;
  const consistencyScore = consistency(item) * 0.15;

  return Math.round(
    sourceConfidence + validationBonus + freshnessScore + consistencyScore
  );
}
```

### Confidence Thresholds
| Range | Label | Meaning |
|-------|-------|---------|
| 90-100 | HIGH | Multiple sources, verified, recent, consistent |
| 70-89 | MEDIUM | Multiple sources, validated, moderately recent |
| 50-69 | LOW | Single source, partially validated |
| 30-49 | INSUFFICIENT | Unvalidated, contradictory, or stale |
| 0-29 | INVALID | Contradicted, deprecated, or without evidence |

### Confidence Adjustment Rules
| Event | Adjustment |
|-------|-----------|
| Successful use | +10 |
| Failed use | -20 |
| Partial success | +5 |
| Contradiction detected | -15 |
| New supporting source | +5 per source |
| Stale (>30 days) | -10 |
| Very stale (>90 days) | -25 |
| Founder confirmation | +20 |
| CEO confirmation | +10 |

---

## Rule 03: Source (SRC)

Knowledge MUST identify its origin.

### Required Source Metadata
```typescript
{
  sourceId: string,          // Unique identifier
  sourceType: SourceType,    // "executive" | "system" | "external" | "user"
  executiveRole?: string,    // If from executive
  timestamp: Date,           // When the knowledge was created
  method: string,            // How the knowledge was obtained
  trace?: string,            // Trace back to original observation
}
```

### Source Types
| Type | Examples | Authority |
|------|----------|-----------|
| executive | CEO decision episode, CTO analysis | Domain-dependent |
| system | Pipeline metrics, health check, audit log | High (system) |
| external | Market report, API response, web fetch | Medium (verify) |
| user | Founder message, operator input | High (user) |

### Source Chain Rule
Knowledge derived from other knowledge MUST preserve the source chain:
```
OriginalObservation → Episode → KnowledgeCard → Decision
└── Source Chain: [Episode@id, Card@id] (preserved)
```

---

## Rule 04: Version (VER)

Knowledge MUST have a version or timestamp.

### Version Rules
- Immutable knowledge (Foundation, ADRs, Constitution): Semantic version (e.g., "1.0.0")
- Dynamic knowledge (business data, metrics): Timestamp (ISO 8601)
- Knowledge episodes: Monotonic ID + timestamp
- Knowledge cards: Version number (incremented on update)
- Learning nodes: Timestamp of creation, reinforcement count

### Version Conflicts
| Scenario | Resolution |
|----------|-----------|
| Same knowledge, different versions | Higher version wins |
| Same version, different content | Contradiction flagged |
| No version | Treated as lowest priority |
| Version mismatch >1 major | Requires re-validation |

---

## Rule 05: Owner (OWN)

Knowledge MUST have a designated owner.

### Owner Types
| Owner | Responsibility | Authority |
|-------|---------------|-----------|
| Executive (CEO/CTO/etc.) | Domain knowledge ownership | Per Knowledge Ownership Matrix |
| SYSTEM | Infrastructure knowledge | System-only |
| FOUNDATION | Immutable directives | Cannot be changed by executives |

### Owner Rules
1. PRIMARY owner (from Ownership Matrix) has final authority on knowledge validity
2. Owner cannot be changed without the new owner's acceptance
3. Ownerless knowledge is flagged for CKO assignment
4. Disputed ownership is resolved by CEO

---

## Rule 06: Expiration (EXP)

Time-sensitive knowledge MUST have an expiration.

### Default Expiration by Knowledge Type
| Knowledge Type | Default TTL | Notes |
|---------------|-------------|-------|
| Foundation | NEVER | Immutable |
| ADR | NEVER | Permanent |
| Identity | 1 year | Updated on role changes |
| Capabilities | 6 months | Updated on feature changes |
| Directives | 1 year | Updated on org changes |
| Business data | 24 hours | Inventory, sales, prices |
| Episodes | NEVER | Immutable records |
| Knowledge cards | 90 days | Refreshed on use |
| Best practices | 180 days | Reviewed on schedule |
| Conversation | Session | Cleared after session |
| External data | 7 days | Market research |
| Metrics | 30 days | Pipeline health data |
| Temporary | Request | Cleared after execution |

### Expiration Actions
| State | Action |
|-------|--------|
| Not expired | Normal usage |
| Expiring soon (<7 days) | Flag for refresh |
| Expired | Excluded from routine retrieval |
| Expired >30 days | Archived |
| Expired >1 year | Retired (deleted) |

---

## Rule 07: Priority (PRI)

Knowledge MUST have a priority level.

| Priority | Value | Meaning |
|----------|-------|---------|
| CRITICAL | 5 | System integrity depends on this |
| HIGH | 4 | Business-critical knowledge |
| MEDIUM | 3 | Standard operational knowledge |
| LOW | 2 | Nice-to-have context |
| BACKGROUND | 1 | Supplementary, non-essential |

### Priority Assignment
| Knowledge | Default Priority | Owner Can Override? |
|-----------|-----------------|---------------------|
| Foundation | CRITICAL (5) | No |
| ADR | HIGH (4) | No |
| Identity | HIGH (4) | No |
| Episodes | MEDIUM (3) | Yes |
| Knowledge cards | MEDIUM (3) | Yes (via promotion) |
| Best practices | MEDIUM (3) | Yes |
| Conversation | LOW (2) | No |
| External | LOW (2) | Yes |

### Priority in Retrieval
- CRITICAL and HIGH priority knowledge is loaded first
- MEDIUM priority fills remaining token budget
- LOW and BACKGROUND are loaded last, may be truncated

---

## Rule 08: Dependency (DEP)

Knowledge dependencies MUST be declared and validated.

### Dependency Types
| Type | Meaning | Example |
|------|---------|---------|
| depends_on | This knowledge requires another | Strategy depends on market data |
| referenced_by | Another knowledge references this | Episode referenced by reflection |
| consumes | Executive consumes this | CTO consumes architecture ADRs |
| conflicts_with | This contradicts another | Opposing recommendations |
| supersedes | This replaces another | New ADR supersedes old ADR |

### Dependency Validation
1. All dependencies MUST exist (no broken references)
2. Dependency graph MUST be acyclic (no circular dependencies)
3. If a dependency is archived, all dependents MUST be re-validated
4. If a dependency is retired, dependents MUST be updated or retired

---

## Rule 09: Conflict Detection (CFL)

Conflicts between knowledge MUST be detected and flagged.

### Conflict Types
| Type | Detection Method | Resolution |
|------|-----------------|------------|
| Semantic contradiction | Keyword pairs (always/never, increase/decrease) | Flag both, escalate to owner |
| Factual discrepancy | Numerical mismatch (e.g., stock level differs) | Investigate source, correct |
| Policy violation | Knowledge violates active policy | Flag as violation, notify governance |
| Temporal inconsistency | Order of events contradicts timeline | Reconcile timestamps |
| Authority conflict | Knowledge contradicts Foundation directive | Foundation wins (immutable) |

### Contradiction Detection Algorithm
```typescript
function detectContradictions(
  existing: KnowledgeItem[],
  incoming: KnowledgeItem
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const item of existing) {
    // Check keyword pairs
    if (hasKeywordContradiction(item.content, incoming.content)) {
      contradictions.push({
        type: 'semantic',
        existingId: item.id,
        incomingId: incoming.id,
        severity: 'medium',
      });
    }

    // Check numerical values
    if (hasNumericalConflict(item, incoming)) {
      contradictions.push({
        type: 'factual',
        existingId: item.id,
        incomingId: incoming.id,
        severity: 'high',
      });
    }

    // Check authority level
    if (hasAuthorityConflict(item, incoming)) {
      contradictions.push({
        type: 'authority',
        existingId: item.id,
        incomingId: incoming.id,
        severity: 'critical',
      });
    }
  }

  return contradictions;
}
```

### Conflict Resolution Hierarchy
1. **Foundation knowledge** always wins (immutable)
2. **Higher validation level** wins (ACTIVE > VALIDATED > OBSERVED)
3. **Higher confidence** wins (90 > 70)
4. **More recent** wins (if same validation + confidence)
5. **PRIMARY owner** decides (if still unresolved)
6. **CEO** decides (if owner cannot resolve)
7. **Founder** decides (if CEO cannot resolve)

---

## Validation Flow

```
New Knowledge
     │
     ▼
┌─────────────────┐
│ Evidence Check  │ ← EVD-1 minimum
│ (EVD)           │
└──────┬──────────┘
       │ PASS
       ▼
┌─────────────────┐
│ Source Check    │ ← Source must be identified
│ (SRC)           │
└──────┬──────────┘
       │ PASS
       ▼
┌─────────────────┐
│ Version Check   │ ← Version or timestamp
│ (VER)           │
└──────┬──────────┘
       │ PASS
       ▼
┌─────────────────┐
│ Owner Check     │ ← Must have designated owner
│ (OWN)           │
└──────┬──────────┘
       │ PASS
       ▼
┌─────────────────┐
│ Expiration Check│ ← Set TTL or mark permanent
│ (EXP)           │
└──────┬──────────┘
       │ PASS
       ▼
┌─────────────────┐
│ Priority Check  │ ← Assign priority level
│ (PRI)           │
└──────┬──────────┘
       │ PASS
       ▼
┌─────────────────┐
│ Dependency Check│ ← Validate all dependencies
│ (DEP)           │
└──────┬──────────┘
       │ PASS
       ▼
┌─────────────────┐
│ Conflict Check  │ ← Detect contradictions with existing
│ (CFL)           │
└──────┬──────────┘
       │ PASS (no conflicts)
       ▼
┌─────────────────┐
│  Confidence     │ ← Calculate confidence score
│  Calculation    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   STORE + INDEX │
└─────────────────┘
```

---

## Validation Override

In exceptional cases, validation can be overridden:

| Override Authority | Can Override | Conditions |
|-------------------|-------------|------------|
| FOUNDER | All rules | Any reason |
| CEO | EVD, SRC, VER, OWN, EXP, PRI, DEP | Business justification |
| PRIMARY owner | OWN, EXP, PRI, DEP | Domain authority |
| CKO | CNF, OWN, PRI | Knowledge curation authority |

### Override Trail
All overrides are recorded:
```typescript
{
  overriddenBy: string,         // Who overrode
  rule: string,                 // Which rule was overridden
  reason: string,               // Justification
  timestamp: Date,              // When
  originalValue: any,           // What the rule required
  newValue: any,                // What was set instead
}
```
