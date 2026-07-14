<!--
  EPIC R — Phase 11: Knowledge Quality Model
  Sources: knowledge-metrics.ts, knowledge-ranker.ts, knowledge-card.ts,
           governance/quality-engine.ts, governance/compliance-engine.ts
  DO NOT EDIT MANUALLY.
-->

# Knowledge Quality Model

**Version:** 1.0.0  
**Status:** STABLE  

---

## Quality Dimensions

| Dimension | Code | Weight | Description |
|-----------|------|--------|-------------|
| Accuracy | ACC | 20% | Truthfulness and correctness of knowledge |
| Authority | AUT | 15% | Source credibility and validation level |
| Freshness | FRS | 10% | How recent and up-to-date |
| Traceability | TRC | 10% | Audit trail and source chain completeness |
| Determinism | DET | 15% | Reproducible retrieval and reasoning |
| Consistency | CNS | 10% | Internal consistency and no contradictions |
| Completeness | CMP | 10% | Coverage of relevant domain |
| Reusability | RUS | 5% | Applicable across multiple contexts |
| Maintainability | MNT | 5% | Ease of update and curation |

---

## Dimension 01: Accuracy (ACC)

**Weight:** 20%  
**Question:** Is this knowledge correct?

### Accuracy Levels
| Level | Score | Criteria |
|-------|-------|----------|
| Verified | 100 | Confirmed by 3+ independent sources or Foundation authority |
| Confirmed | 85 | Confirmed by 2+ sources with executive validation |
| Plausible | 70 | Single source, reasonable, no contradictions |
| Suspect | 40 | Single source, questionable, or has contradictions |
| Incorrect | 0 | Proven wrong, contradicted by higher authority |

### Accuracy Assessment
```typescript
function assessAccuracy(item: KnowledgeItem): number {
  const sourceVerification = multiSourceScore(item) * 0.40;  // 40% weight
  const factualConsistency = checkConsistency(item) * 0.30;  // 30% weight
  const authorityEndorsement = authorityScore(item) * 0.20;  // 20% weight
  const trackRecord = usageOutcomeScore(item) * 0.10;        // 10% weight

  return weightedScore(
    sourceVerification, factualConsistency,
    authorityEndorsement, trackRecord
  );
}
```

---

## Dimension 02: Authority (AUT)

**Weight:** 15%  
**Question:** Who says this knowledge is true?

### Authority Hierarchy
| Level | Score | Source Type | Examples |
|-------|-------|-------------|---------|
| SYSTEM | 100 | Immutable system knowledge | Foundation, ADRs, Constitution |
| VALIDATED | 85 | Multi-source confirmed knowledge | Organizational memory |
| PRIMARY | 70 | PRIMARY owner documented knowledge | Executive SPECs |
| SECONDARY | 55 | SECONDARY owner contributed | Cross-executive advisory |
| EXTERNAL | 40 | External source | Market data, research |
| AI-GENERATED | 25 | LLM output without verification | Raw reasoning trace |

### Authority Rules
1. SYSTEM authority always overrides all others
2. VALIDATED requires 2+ independent sources
3. PRIMARY authority is domain-specific
4. AI-GENERATED knowledge MUST be re-validated before use

---

## Dimension 03: Freshness (FRS)

**Weight:** 10%  
**Question:** How recent is this knowledge?

### Freshness Scoring
```typescript
function freshnessScore(timestamp: Date, knowledgeType: string): number {
  const ageDays = daysSince(timestamp);
  const ttl = getDefaultTTL(knowledgeType);

  if (ageDays === 0) return 100;       // Today
  if (ageDays < ttl * 0.25) return 90; // Recent
  if (ageDays < ttl * 0.50) return 75; // Moderate
  if (ageDays < ttl * 0.75) return 50; // Aging
  if (ageDays < ttl) return 25;        // Stale
  return 0;                             // Expired
}
```

### Freshness by Knowledge Type
| Type | TTL | Score at Creation | Score at TTL/2 | Score at TTL |
|------|-----|-------------------|----------------|--------------|
| Foundation | NEVER | 100 | 100 | 100 |
| Business data | 24h | 100 | 50 | 0 |
| Episodes | PERM | 100 | 100 | 100 |
| Knowledge cards | 90d | 100 | 75 | 25 |
| Best practices | 180d | 100 | 85 | 25 |
| Market data | 7d | 100 | 50 | 0 |
| Metrics | 30d | 100 | 75 | 25 |
| Conversation | Session | 100 | N/A | N/A |

---

## Dimension 04: Traceability (TRC)

**Weight:** 10%  
**Question:** Can we trace this knowledge back to its origin?

### Traceability Levels
| Level | Score | Criteria |
|-------|-------|----------|
| Full | 100 | Complete chain: original observation → episode → card → decision |
| Source | 80 | Original source identified but chain incomplete |
| Reference | 60 | Referenced but source not directly accessible |
| Claim | 40 | Claim made without source reference |
| Anonymous | 0 | No origin information |

### Traceability Requirements
- CRITICAL priority knowledge MUST have "Full" traceability
- HIGH priority MUST have "Source" level minimum
- MEDIUM priority MUST have "Reference" level minimum
- All knowledge MUST have at least "Claim" level

### Trace Format
```typescript
{
  knowledgeId: string,
  originChain: [
    { step: "observation", source: string, timestamp: Date },
    { step: "validation", source: string, timestamp: Date },
    { step: "storage", source: string, timestamp: Date },
    { step: "retrieval", source: string, timestamp: Date },
    { step: "decision", source: string, timestamp: Date },
  ],
  evidenceHashes: string[],  // Content hashes for verification
}
```

---

## Dimension 05: Determinism (DET)

**Weight:** 15%  
**Question:** Does the same query always return the same result?

### Determinism Levels
| Level | Score | Criteria |
|-------|-------|----------|
| Deterministic | 100 | Same query → same result, same order, same content |
| Stable | 80 | Same query → same result set, order may vary |
| Probabilistic | 50 | Same query → similar results with some variation |
| Non-deterministic | 20 | Same query → different results each time |
| Random | 0 | Results unpredictable |

### Determinism Requirements
- Knowledge composition (Composition Engine) MUST be deterministic
- Knowledge retrieval for the same context MUST return the same results
- LLM reasoning is the ONLY non-deterministic component
- Knowledge cache is cleared on explicit invalidation only

### Determinism Assurance
1. Cached Foundation responses (5-min TTL)
2. Consistent layer ordering in composition
3. Deterministic deduplication (content-hash based)
4. Stable ranking algorithm (fixed weights)
5. Explicit version pinning for all knowledge sources

---

## Dimension 06: Consistency (CNS)

**Weight:** 10%  
**Question:** Does this knowledge agree with itself and other knowledge?

### Consistency Checks
| Check | Method | Penalty |
|-------|--------|---------|
| Self-consistency | Internal logic check | -20 if contradictory |
| Cross-reference | Compare with related knowledge | -30 if contradicts |
| Foundation alignment | Check against immutable rules | -50 if violates Foundation |
| Temporal consistency | Timestamp order check | -10 if timeline broken |
| Numerical consistency | Math verification | -40 if calculation error |

### Consistency Score
```typescript
function consistencyScore(item: KnowledgeItem): number {
  let score = 100;

  // Penalty for each contradiction detected
  const contradictions = getContradictions(item.id);
  score -= contradictions.length * 15;

  // Penalty for foundation violations
  if (violatesFoundation(item)) score -= 50;

  // Penalty for self-contradiction
  if (isSelfContradictory(item)) score -= 20;

  return Math.max(0, score);
}
```

---

## Dimension 07: Completeness (CMP)

**Weight:** 10%  
**Question:** Does this knowledge cover the full domain?

### Completeness by Knowledge Type
| Type | Completeness Criteria |
|------|----------------------|
| Domain | All products, branches, categories, recipes documented |
| Operational | All branches have current stock, sales, expense data |
| Strategic | All missions have objectives, status, outcomes |
| Procedural | All SOPs documented for repeatable operations |
| Historical | All decisions recorded as episodes |
| External | Market data covers relevant segments |
| Runtime | All 8 health dimensions tracked |

### Completeness Score
```typescript
function completenessScore(item: KnowledgeItem, domain: string): number {
  const expectedCount = getExpectedCount(domain);
  const actualCount = getActualCount(domain, item);
  return Math.min(100, Math.round((actualCount / expectedCount) * 100));
}
```

---

## Dimension 08: Reusability (RUS)

**Weight:** 5%  
**Question:** Can this knowledge be used in multiple contexts?

### Reusability Levels
| Level | Score | Criteria |
|-------|-------|----------|
| Universal | 100 | Applicable to ALL executives and ALL domains |
| Cross-domain | 80 | Applicable across multiple domains |
| Domain-specific | 60 | Applicable within one domain |
| Context-specific | 40 | Applicable only in specific context |
| Single-use | 20 | Used once, not reusable |

### Reusability Factors
- Abstract vs concrete: Abstract knowledge is more reusable
- Domain-generic: Knowledge about "inventory management" is more reusable than knowledge about "branch-42 sugar stock"
- Pattern vs instance: A PATTERN knowledge node is more reusable than an episode

---

## Dimension 09: Maintainability (MNT)

**Weight:** 5%  
**Question:** How easy is this knowledge to update or curate?

### Maintainability Factors
| Factor | Weight | Description |
|--------|--------|-------------|
| Schema stability | 30% | Knowledge format doesn't change frequently |
| Decoupling | 25% | Changes don't cascade to many dependents |
| Documentation | 20% | Knowledge has clear description and usage |
| Test coverage | 15% | Knowledge retrieval is testable |
| Owner responsiveness | 10% | PRIMARY owner can make updates |

### Maintainability Score
```typescript
function maintainabilityScore(item: KnowledgeItem): number {
  const schemaAge = daysSinceLastSchemaChange(item.type);
  const dependencyCount = getDependencies(item.id).length;
  const docQuality = documentationQuality(item);
  const ownerActive = isOwnerActive(item.owner);

  return Math.round(
    Math.min(100, schemaAge * 2) * 0.30 +
    Math.max(0, 100 - dependencyCount * 5) * 0.25 +
    docQuality * 0.20 +
    (ownerActive ? 100 : 50) * 0.10 +
    getTestCoverage(item) * 0.15
  );
}
```

---

## Overall Knowledge Quality Score

```typescript
function knowledgeQualityScore(item: KnowledgeItem): number {
  const dimensions = {
    accuracy: assessAccuracy(item) * 0.20,
    authority: authorityScore(item) * 0.15,
    freshness: freshnessScore(item.timestamp, item.type) * 0.10,
    traceability: traceabilityScore(item) * 0.10,
    determinism: determinismScore(item) * 0.15,
    consistency: consistencyScore(item) * 0.10,
    completeness: completenessScore(item, item.domain) * 0.10,
    reusability: reusabilityScore(item) * 0.05,
    maintainability: maintainabilityScore(item) * 0.05,
  };

  const total = Object.values(dimensions).reduce((sum, v) => sum + v, 0);
  return Math.round(total);
}
```

### Quality Levels
| Score | Label | Meaning |
|-------|-------|---------|
| 90-100 | EXCELLENT | High confidence, all dimensions strong |
| 75-89 | GOOD | Suitable for most decisions |
| 60-74 | ACCEPTABLE | Usable with caution |
| 40-59 | POOR | Use only for low-confidence decisions |
| 0-39 | UNACCEPTABLE | Cannot be used for decisions |

---

## Quality Gates by Decision Level

| Decision Level | Minimum Quality | Minimum Accuracy | Minimum Authority |
|---------------|----------------|------------------|-------------------|
| CRITICAL | 90 (EXCELLENT) | 100 (Verified) | 100 (SYSTEM or FOUNDATION) |
| HIGH | 75 (GOOD) | 85 (Confirmed) | 85 (VALIDATED) |
| MEDIUM | 60 (ACCEPTABLE) | 70 (Plausible) | 70 (PRIMARY) |
| LOW | 40 (POOR) | 40 (Suspect) | 55 (SECONDARY) |
| BACKGROUND | Any | Any | Any |

---

## Knowledge Quality Report

Generated by `knowledgeMetrics.collect()`:

```typescript
interface KnowledgeQualityReport {
  overall: KnowledgeQualityScore;
  byDomain: Record<string, KnowledgeQualityScore>;
  byExecutive: Record<string, KnowledgeQualityScore>;
  trends: {
    improving: string[];   // Domains with increasing quality
    declining: string[];   // Domains with decreasing quality
    stable: string[];      // Domains with stable quality
  };
  alerts: QualityAlert[];  // Quality below thresholds
  recommendations: string[]; // Improvement suggestions
}
```

### Quality Alerts
| Alert | Trigger | Severity |
|-------|---------|----------|
| Domain quality < 60 | Knowledge domain score drops below 60 | HIGH |
| Stale knowledge > 30% | >30% of domain knowledge is stale | MEDIUM |
| Contradiction spike | >5 new contradictions in 24h | HIGH |
| Source degradation | PRIMARY source unavailable for >1h | CRITICAL |
| Owner inactive | Knowledge owner inactive >30 days | LOW |
