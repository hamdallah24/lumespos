<!--
  EPIC R — Phase 5: Knowledge Lifecycle
  Sources: knowledge-card.ts, knowledge-lifecycle.ts, knowledge-platform/learning/,
           learning/learning-engine.ts, intelligence/organizational-memory.ts
  DO NOT EDIT MANUALLY.
-->

# Knowledge Lifecycle

**Version:** 1.0.0  
**Status:** STABLE  

Defines the unified lifecycle that ALL knowledge follows, from acquisition to retirement.

---

## Unified Lifecycle Diagram

```
ACQUIRE → VALIDATE → NORMALIZE → CATEGORIZE → STORE → INDEX → RETRIEVE → REASON → DECISION → LEARNING → ARCHIVE → RETIRE
    ↑                                                                                                                                       │
    └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                    (Feedback loop)
```

---

## Stage 01: ACQUIRE

Knowledge enters the system through one of these channels:

| Acquisition Channel | Source | Trigger | Owner |
|--------------------|--------|---------|-------|
| Executive Execution | Any executive action | After execute() completes | All executives |
| Pipeline Observer | EIOS observers | decision.made, council.resolved, pipeline.completed | EIOS Runtime |
| User Input | Founder/Operator message | Direct message or command | CEO / COO |
| External Fetch | CMO market research | Scheduled or on-demand | CMO |
| System Event | Kernel heartbeat, health check | System event | Kernel |
| Learning Engine | Experience → Knowledge | LearningEngine.cycle() | Learning Engine |
| Knowledge Fusion | Cross-executive synthesis | CrossExecutiveLearning | Intelligence Engine |

### Acquisition Rules
1. Every execution MUST produce at least one knowledge episode
2. Failed executions are equally valuable as successful ones
3. External knowledge requires source attribution
4. User-provided knowledge requires explicit validation

---

## Stage 02: VALIDATE

Knowledge is validated before it can be used for decisions.

| Validation Method | Criteria | Used For |
|------------------|----------|----------|
| Source Count | >=3 sources with confidence >60 | Knowledge cards |
| Multi-Source | >=2 independent sources | Organizational memory |
| Executive Authority | CEO validation | Strategic knowledge |
| Self-Consistency | No contradictions with existing | All knowledge |
| Cross-Reference | Matches known facts | Business data |
| Temporal Check | Not expired (if has expiration) | Time-sensitive data |
| Governance Check | Passes GovernanceProvider.canExecute() | Decision knowledge |

### Validation Levels
| Level | Code | Criteria |
|-------|------|----------|
| Unvalidated | RAW | Single observation, no checks |
| Partially Validated | OBS | Recorded, 1 source |
| Validated | VAL | 2+ sources or CEO validation |
| Fully Validated | ACT | 3+ sources, no contradictions, confidence >70 |

### Validation Rules
1. Knowledge used for HIGH-confidence decisions MUST be at least VALIDATED
2. Knowledge used for CRITICAL decisions MUST be FULLY VALIDATED
3. Conflicting knowledge cannot both be ACTIVE — one must be flagged as contradiction
4. Validation status is stored with the knowledge and updated over time

---

## Stage 03: NORMALIZE

Knowledge is transformed into a standard format.

| Source Format | Normalized To | Transform |
|--------------|---------------|-----------|
| Episode (eventType, context, outcome) | KnowledgeBlock (episode type) | Extract features |
| Semantic (fact, source, verifiedAt) | KnowledgeBlock (semantic type) | Normalize identifiers |
| LLM output (free text) | KnowledgeBlock (procedural type) | Parse structured fields |
| Mission output (artifacts) | KnowledgeArtifact | Summarize key insights |
| Experience (missionId, outcome, lessons) | KnowledgeNode | Classify type (PATTERN/INSIGHT/etc.) |
| External data (market report) | KnowledgeBlock (semantic) | Extract structured facts |

### Normalization Rules
1. All knowledge MUST be stored in one of the standard formats
2. Free-text fields are compressed to <500 chars for storage
3. Tags are normalized to lowercase, singular form
4. Timestamps use ISO 8601 format
5. Confidence scores are normalized to 0-100 scale

---

## Stage 04: CATEGORIZE

Knowledge is classified using the Executive Knowledge Taxonomy.

| Classification Dimension | Stored As | Example |
|-------------------------|-----------|---------|
| Taxonomy Path | `01.Foundation.Constitution.CorePrinciples` | Full path in taxonomy |
| Knowledge Type (EROS) | `strategic` | One of 7 EROS types |
| Immutability Class | `I`, `S`, `D`, `E` | From Classification Matrix |
| Source Class | `R`, `O`, `B`, `E`, `T`, `C`, `X`, `G`, `L`, `H`, `D`, `V` | From Classification Matrix |
| Validation Class | `RAW`, `OBS`, `CFM`, `VAL`, `ACT`, `BP`, `FC`, `ARC`, `RET` | From Classification Matrix |
| Persistence Class | `PERM`, `LONG`, `MED`, `SHORT`, `TRANS` | From Classification Matrix |
| Access Class | `PUB`, `EXEC`, `RES`, `PRIV`, `SYS`, `HUMAN` | From Classification Matrix |

### Categorization Rules
1. Every knowledge item MUST have at minimum: Taxonomy Path + EROS Type + Validation
2. Classification is stored as metadata alongside the knowledge
3. Missing classifications default to most restrictive (PRIV, RAW, TRANS)
4. Re-categorization requires CKO approval

---

## Stage 05: STORE

Knowledge is persisted to the appropriate storage system.

| Knowledge Type | Primary Storage | Secondary Storage | Backup |
|---------------|----------------|-------------------|--------|
| Domain (Business) | KnowledgePlatform.semantic | Foundation cache | PostgreSQL |
| Operational | KnowledgePlatform.episode | Learning executive-memory | PostgreSQL |
| Strategic | KnowledgePlatform.semantic | KnowledgeBackbone | PostgreSQL |
| Procedural | KnowledgePlatform.procedural | — | PostgreSQL |
| Historical | KnowledgePlatform.episode | Learning memory-index | PostgreSQL |
| External | KnowledgePlatform.semantic | — | PostgreSQL |
| Runtime | MetricsEngine (in-memory) | Kernel checkpoint | Redis |
| Episodes | EpisodeStore | — | PostgreSQL |
| Knowledge Cards | knowledge-governor (in-memory) | — | Redis |
| Learning Nodes | learning/knowledge-graph (in-memory) | — | Redis |
| Organizational Memory | intelligence/organizational-memory (in-memory) | — | Redis |
| Audit Logs | AuditEngine | — | PostgreSQL |
| Conversation | ai-memory-service | Redis cache | PostgreSQL |
| Working Memory | ContextManager (in-memory) | — | — |

### Storage Rules
1. Immutable knowledge is never overwritten — only appended
2. Dynamic knowledge is updated in place with change tracking
3. Storage failures must not block execution (knowledge recording is async where possible)
4. Redis is used for caching and queues; PostgreSQL is the source of truth

---

## Stage 06: INDEX

Knowledge is indexed for efficient retrieval.

| Index Type | Coverage | Implementation |
|-----------|----------|----------------|
| Full-text | All knowledge with text content | Keyword search |
| Semantic | KnowledgePlatform semantic blocks | Vector/semantic search |
| Domain | Taxonomy path | Hierarchical filter |
| Executive | Per-executive knowledge | Executive filter |
| Temporal | Timestamps | Time-range queries |
| Tag | Tags array | Tag-based filter |
| Confidence | Validation status | Quality filter |
| Relationship | Knowledge graph edges | Graph traversal |

### Indexing Rules
1. New knowledge is indexed within 5 seconds of storage
2. Index updates are asynchronous and non-blocking
3. Index failures result in degraded search but not execution failure
4. Full re-index runs daily

---

## Stage 07: RETRIEVE

Knowledge is retrieved on-demand for decision-making.

| Retrieval Method | Use Case | Implementation |
|-----------------|----------|----------------|
| Direct Query | User asks specific question | KnowledgeProvider.searchAll() |
| Context Retrieval | Before executive reasoning | RetrievalEngine.getContext() |
| Episode History | Recent decisions | KnowledgeProvider.getLatestEpisodes() |
| Best Practices | SOP lookups | KnowledgeProvider.getBestPractices() |
| Knowledge Bundle | CEO strategic queries | KnowledgeBackbone.query() |
| Scoped Knowledge | Executive-specific context | KnowledgeBackbone.getScoped() |
| Misson Context | CTO code analysis | MissionContextRegistry |
| Council History | CKO council sessions | CouncilSessionManager.getAll() |

### Retrieval Priority
When assembling context from knowledge, use this priority order:

```
1. Foundation (immutable, highest priority)
2. Directives (per-role, high priority)
3. Capabilities (per-role, high priority)
4. Knowledge Episodes (executive-specific, medium priority)
5. Best Practices (procedural, medium priority)
6. Plans (active plans, medium priority)
7. Brief (current situation, medium priority)
8. Council History (if applicable, low priority)
9. Conversation History (recent, low priority)
10. External Data (market, low priority)
┌──────────────────────────────────────────┐
│ Token Budget Allocation                  │
│ Foundation: 25% | Knowledge: 25%         │
│ History: 20% | Plans: 15% | Brief: 15%  │
└──────────────────────────────────────────┘
```

---

## Stage 08: REASON

Knowledge is used as input to reasoning and decision-making.

| Reasoning Pattern | Knowledge Used | Executive |
|------------------|---------------|-----------|
| Strategic Reasoning | Foundation, Episodes, Plans | CEO |
| Technical Analysis | Architecture, Code, ADRs | CTO |
| Financial Calculation | Business, Trends, Episodes | CFO |
| Operational Decision | Business, SOPs, Episodes | COO |
| Marketing Insight | Market, Customer, Trends | CMO |
| Health Assessment | Runtime, Knowledge Stats | CAIO |
| Knowledge Synthesis | All sources | CKO |
| Governance Check | Policies, Compliance, Risks | Governance Engine |

---

## Stage 09: DECISION

A decision is made using the knowledge and reasoning.

### Decision Recording
Every decision produces:
1. **Decision Record** — What was decided, why, confidence
2. **Knowledge Episode** — Immutable record of the event
3. **Audit Log** — Governance audit trail
4. **Evidence Chain** — What knowledge supported the decision

### Decision → Knowledge Feedback
The decision outcome feeds back into the knowledge system:
- Successful decisions reinforce the knowledge used
- Failed decisions trigger reflection and potential knowledge update
- Low-confidence decisions signal knowledge gaps

---

## Stage 10: LEARNING

Knowledge is refined based on decision outcomes.

| Learning Mechanism | Trigger | Effect |
|-------------------|---------|--------|
| Confidence Adjustment | Decision outcome recorded | +10 success, -20 failure, +5 partial |
| Pattern Promotion | 5+ successes | observed → confirmed |
| Pattern Deprecation | 3+ failures or confidence <30 | Deprecated |
| Knowledge Synthesis | Reflection engine runs | Experience → KnowledgeNode |
| Knowledge Reinforcement | Similar knowledge found | Increase reinforcement count |
| Knowledge Fusion | 2+ executives contribute | Auto-validate cross-domain |
| Knowledge Evolution | Evidence of gap | Propose knowledge update |
| Deduplication | Similarity >95% | Merge cards |
| Contradiction Detection | Opposing keyword pairs | Flag as contradiction |

### Learning Rules
1. Every execution outcome triggers confidence adjustment
2. Reflections run asynchronously after execution
3. Pattern promotion is automated but deprecation requires review
4. Knowledge evolution proposals require Founder approval (never auto-modify Foundation)
5. Learning failures (engine errors) must not block execution

---

## Stage 11: ARCHIVE

Knowledge that is no longer actively useful is archived.

| Archive Trigger | Conditions | Action |
|----------------|-----------|--------|
| Low confidence | Confidence <30 | Mark as ARCHIVED |
| Stale (short) | Unused >30 days + importance <30 | Mark as ARCHIVED |
| Stale (long) | Unused >90 days | Mark as ARCHIVED |
| Superseded | New knowledge replaces old | Mark as ARCHIVED + link to replacement |
| Explicit | CKO or Founder directive | Mark as ARCHIVED |

### Archive Rules
1. Archived knowledge is NOT deleted — only marked as ARCHIVED
2. Archived knowledge can be reactivated by CKO
3. Archived knowledge is excluded from routine searches
4. Archive index is maintained for audit purposes
5. Archive retention: minimum 1 year before deletion consideration

---

## Stage 12: RETIRE

Knowledge that is permanently obsolete is retired (mark for deletion).

| Retire Trigger | Conditions | Action |
|---------------|-----------|--------|
| Archived >1 year | No reactivation | Permanently deleted after 30-day grace |
| Explicit directive | CKO + CEO approval | Immediate deletion |
| Competing knowledge | Superseded with confirmation | Delete old after migration |

### Retirement Rules
1. Retirement requires CKO approval (for knowledge) or CEO approval (for strategic)
2. A final archive snapshot is kept before deletion (minimal metadata)
3. Linked knowledge must be updated before retirement
4. Retired knowledge is removed from ALL indexes

---

## Lifecycle State Machine

```
                    ┌─────────┐
                    │ ACQUIRE │
                    └────┬────┘
                         ↓
                    ┌─────────┐
                    │VALIDATE │ ← ─ ─ ─ ┐ (Re-validate)
                    └────┬────┘         │
                         ↓              │
                    ┌───────────┐       │
                    │ NORMALIZE │       │
                    └─────┬─────┘       │
                          ↓            │
                    ┌────────────┐      │
                    │ CATEGORIZE │      │
                    └─────┬──────┘      │
                          ↓            │
                    ┌─────────┐        │
                    │  STORE  │        │
                    └────┬────┘        │
                         ↓             │
                    ┌─────────┐        │
                    │  INDEX  │        │
                    └────┬────┘        │
                         ↓             │
              ┌────────────────────┐   │
              │ RETRIEVE ← ─ ─ ─ ─ │   │
              └────────┬───────────┘   │
                       ↓              │
              ┌──────────────────┐    │
              │ REASON → DECISION│    │
              └────────┬─────────┘    │
                       ↓              │
              ┌──────────────────┐    │
              │    LEARNING ← ─ ─│────┘
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │     ARCHIVE      │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │     RETIRE       │
              └──────────────────┘
```

---

## Lifecycle Ownership

| Stage | Owner | Governance Gate |
|-------|-------|----------------|
| ACQUIRE | All executives | Must be within domain scope |
| VALIDATE | CKO (Primary), Source Executive (Secondary) | Validation rules per type |
| NORMALIZE | Knowledge Platform | Schema conformance |
| CATEGORIZE | CKO | Taxonomy adherence |
| STORE | Knowledge Platform | Storage policy |
| INDEX | Knowledge Platform | Index schema |
| RETRIEVE | All executives | Access control per classification |
| REASON | Respective executive | Domain sovereignty |
| DECISION | Respective executive | Decision authority |
| LEARNING | Learning Engine | Learning policy |
| ARCHIVE | CKO | Archive criteria |
| RETIRE | CKO + CEO | Retirement approval |
