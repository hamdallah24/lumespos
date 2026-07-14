<!--
  EPIC R — Phase 8: Knowledge Retrieval Model
  Sources: PROMPT_COMPOSITION_ENGINE.md, learning/retrieval-engine.ts,
           knowledge-platform/providers/KnowledgeProvider.ts,
           knowledge/KnowledgeBackbone.ts
  DO NOT EDIT MANUALLY.
-->

# Knowledge Retrieval Model

**Version:** 1.0.0  
**Status:** STABLE  

---

## Retrieval Pipeline

```
User Request
     │
     ▼
┌─────────────┐
│  INTENT     │ ← Classify: approve/status/action/question/strategic/technical/financial/marketing/AI/knowledge
│  ANALYSIS   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  CAPABILITY │ ← Can the executive handle this? GovernanceProvider.canExecute()
│  CHECK      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  KNOWLEDGE  │ ← Which knowledge domain? (taxonomy path)
│  DOMAIN     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PRIORITY   │ ← How important is this? (HIGH/MEDIUM/LOW)
│  ASSESSMENT │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  EXECUTIVE  │ ← Which executive(s) should handle this?
│  ROUTING    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  KNOWLEDGE  │ ← Which knowledge layers to include?
│  LAYER      │
│  SELECTION  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  EVIDENCE   │ ← Collect supporting evidence
│  COLLECTION │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  REASONING  │ ← Synthesize knowledge → decision
│  & DECISION │
└─────────────┘
```

---

## Stage 1: Intent Analysis

Classify the user message into one of these intents:

| Intent | Description | Primary Executive |
|--------|-------------|-------------------|
| strategic | Strategic direction, vision, org change | CEO |
| approval | Plan approval, permission request | CEO |
| technical | Code analysis, implementation, architecture | CTO |
| financial | Cost analysis, margin, pricing, budget | CFO |
| operational | Inventory, sales, production, expenses | COO |
| marketing | Campaign, market analysis, customer insight | CMO |
| health | System health, performance, anomalies | CAIO |
| knowledge | Knowledge query, curation, advisory | CKO |
| council | Council session, minutes, decisions | CKO |
| general | General query, conversation | Depends on context |

### Intent Detection Rules
1. Match against known intent patterns (keyword-based first, semantic fallback)
2. If intent is ambiguous, classify as "general" + route to best-matching executive
3. If no executive matches, route to CEO (default handler)
4. Intent classification is recorded as part of the knowledge episode

---

## Stage 2: Capability Check

Verify the executive can handle the request:

```typescript
const canExecute = GovernanceProvider.canExecute(executiveRole, action, domain);
if (!canExecute) {
  // Log audit: denied
  // Route to appropriate executive or escalate
}
```

### Capability → Intent Mapping
| Intent | Required Capability | Executive |
|--------|-------------------|-----------|
| strategic | strategic-decision | CEO |
| approval | proposal-review | CEO |
| technical | code-analysis | CTO |
| financial | financial-analysis | CFO |
| operational | inventory-management | COO |
| marketing | market-analysis | CMO |
| health | ai-health-monitoring | CAIO |
| knowledge | knowledge-curation | CKO |

---

## Stage 3: Knowledge Domain Selection

Map the intent to the appropriate knowledge domain (from taxonomy):

| Intent | Primary Taxonomy Branch | Secondary Branch |
|--------|------------------------|-----------------|
| strategic | 01 Foundation | 04 Executive (CEO) |
| approval | 06 Decision | 04 Executive (CEO) |
| technical | 03 Runtime | 07 Framework |
| financial | 05 Domain (Financials) | 04 Executive (CFO) |
| operational | 05 Domain (Inventory, Sales, etc.) | 10 Experience |
| marketing | 05 Domain (Market, Customers) | 13 External |
| health | 03 Runtime | 04 Executive (CAIO) |
| knowledge | 04 Executive (CKO) | 02 Organization |
| general | 14 User | 15 Conversation |

---

## Stage 4: Priority Assessment

Determine retrieval priority based on context:

| Priority | Criteria | Knowledge Weight |
|----------|----------|-----------------|
| CRITICAL | System failure, data loss, emergency | 100% (all available knowledge) |
| HIGH | Business-critical decision, Founder request | 80% token budget |
| MEDIUM | Standard operational request | 50% token budget |
| LOW | Informational query, general conversation | 30% token budget |

### Priority Rules
1. Priority affects token budget allocation for knowledge retrieval
2. CRITICAL priority retrieves ALL potentially relevant knowledge
3. LOW priority may skip some knowledge layers (e.g., skip External, skip Conversation)
4. Priority is set by the executive based on risk assessment

---

## Stage 5: Executive Routing

Route the request to the appropriate executive(s):

| Route | Target | Condition |
|-------|--------|-----------|
| Direct | Single executive | Intent matches exactly one executive's domain |
| Delegation | Source → Target executive | Source executive delegates within scope |
| Escalation | Executive → Higher authority | Out of scope, low confidence, risk |
| Collaboration | Two or more executives | Cross-domain issue requiring multiple perspectives |
| Council | All executives | Multi-executive consensus required |

### Routing Rules
1. Always route to PRIMARY domain owner first
2. PRIMARY owner may delegate to SECONDARY owner
3. Escalation follows: Executive → CEO → Founder → CAIO (system)
4. Council is called only for unresolved conflicts or constitutional amendments

---

## Stage 6: Knowledge Layer Selection

Select which knowledge layers to include in the retrieval:

| Layer | Contents | Source | Computational Cost |
|-------|----------|--------|-------------------|
| L1 — Foundation | Philosophy, Constitution, Architecture Rules | FoundationProvider | Low (cached) |
| L2 — Directives | Per-role authority, forbidden actions, required behaviors | FoundationProvider.domains | Low (cached) |
| L3 — Identity | Executive identity, capabilities, knowledge domains | identity.ts | Low (cached) |
| L4 — Episodes | Recent knowledge episodes (relevant to domain) | KnowledgeProvider.getLatestEpisodes() | Medium |
| L5 — Knowledge | Semantic + procedural knowledge (relevant query) | KnowledgeProvider.searchAll() | High |
| L6 — Best Practices | SOPs, best practice knowledge | KnowledgeProvider.getBestPractices() | Medium |
| L7 — Plans | Active plans, pending missions | PlanProvider.getAll() | Medium |
| L8 — Brief | Current situation, pending approvals | BriefGenerator.generate() | Medium |
| L9 — Memory | Executive-specific memory, recent experiences | learning/ExecutiveMemory | High |
| L10 — Council | Council decisions, session history | CouncilSessionManager | Medium |
| L11 — History | Conversation history, temporal references | ContextManager | Low |
| L12 — External | Market data, external knowledge | KnowledgePlatform.semantic | Variable |

### Layer Selection Rules
1. L1-L3 are ALWAYS included (Foundation, Directives, Identity)
2. L4 is ALWAYS included for decision-making executives
3. L6 is included when the intent involves execution (procedural knowledge)
4. L8 is included for operational/status intents
5. L9 is included for executives with active memory scope
6. L10 is included only for CKO council queries
7. L12 is included only for CMO marketing intents

---

## Stage 7: Evidence Collection

Gather supporting evidence for the knowledge retrieved:

| Evidence Source | Retrieval Method | Confidence | When Used |
|----------------|-----------------|------------|-----------|
| KnowledgePlatform episodes | KnowledgeProvider.searchAll() | HIGH | All decisions |
| PlanProvider | PlanProvider.getAll() | HIGH | Active plan context |
| GovernanceProvider | GovernanceProvider.canExecute() | HIGH | Authorization check |
| Foundation directives | FoundationProvider.getDirective() | HIGH | Role directive check |
| CKO ConsultantRuntime | consultantRuntime.analyze() | MEDIUM | Knowledge advisory |
| LLM reasoning | LLM call output | MEDIUM | Reasoning trace |
| MissionContextRegistry | missionContextRegistry.getRelevant() | MEDIUM | CTO code context |
| CouncilSessionManager | councilSessionManager.getAll() | HIGH | Council decisions |
| RuntimeFacade | RuntimeFacade.health() | HIGH | System health |

### Evidence Chain Format
```typescript
{
  claim: string,            // What is being claimed
  evidence: [               // Supporting evidence
    {
      source: string,       // Source identifier (e.g., "KnowledgeProvider")
      confidence: number,   // 0-100
      content: string,      // Evidence content (truncated)
      timestamp: Date,      // When evidence was collected
    }
  ],
  strength: "strong" | "medium" | "weak",
  chain: string[],          // Full trace from claim to source
}
```

---

## Stage 8: Reasoning & Decision

Synthesize retrieved knowledge into a decision:

### Knowledge Synthesis Formula
```
Decision = f(
  Foundation(Directives, Identity),
  Episodes(Relevant, Recent),
  Knowledge(Semantic, Procedural),
  Context(Brief, Plans, Memory, Conversation)
)
```

### Confidence Calculation (Revisited for Knowledge)
```
Data Availability (30%):   How much relevant knowledge was found?
Spec Clarity (25%):        Was the intent clearly understood?
Knowledge Quality (20%):   What is the validation level of retrieved knowledge?
Risk Assessment (15%):     What is the risk level of this decision?
Historical Precedent (10%): Are there similar past decisions?
```

### Knowledge Quality in Confidence
| Knowledge Retrieved | Quality Score |
|--------------------|--------------|
| Foundation knowledge only | 30 (insufficient) |
| Foundation + validated episodes | 60 (low) |
| Foundation + validated + best practices | 80 (medium) |
| All layers with high validation | 95 (high) |

---

## Retrieval API Reference

### Primary Retrieval Methods

```typescript
// Broad search across all knowledge types
KnowledgeProvider.searchAll(query: string): KnowledgeBlock[]

// Get recent episode history
KnowledgeProvider.getLatestEpisodes(n: number): Episode[]

// Get best practices (procedural knowledge)
KnowledgeProvider.getBestPractices(): BestPractice[]

// Get knowledge platform statistics
KnowledgeProvider.getStats(): KnowledgeStats

// Ingest new knowledge (only recording, not retrieval)
KnowledgeProvider.ingestEpisode(event: Episode): void
```

### Strategic Retrieval (CEO)
```typescript
// Full knowledge bundle for strategic decisions
KnowledgeBackbone.query(missionId: string): KnowledgeBundle
```

### Scoped Retrieval (All executives)
```typescript
// Domain/executive-scoped knowledge
KnowledgeBackbone.getScoped(
  executive: ExecutiveRole,
  domain: string,
  message: string
): ScopedKnowledge
```

### Context-Aware Retrieval (Learning Engine)
```typescript
// Before executive reasoning
RetrievalEngine.getContext(
  executive: ExecutiveRole,
  domain: string,
  keywords: string[]
): LLMContextPrompt
```

### Mission Context (CTO only)
```typescript
// Codebase context for CTO analysis
MissionContextRegistry.getRelevant(missionId: string): MissionContext
```

---

## Retrieval Optimization Rules

1. **Cache Priority**: Foundation > Identity > Directives > Episodes > Knowledge
2. **Token Budget**: Foundation (25%) -> Episodes (25%) -> Knowledge (20%) -> Plans (15%) -> Brief (15%)
3. **Time-to-Live**: Foundation (5 min) > Identity (5 min) > Directives (5 min) > Brief (1 min) > Episodes (30s)
4. **Fallback**: If primary source fails → try secondary → try cache → degrade gracefully
5. **Concurrent Retrieval**: Independent layers (L4-L12) are retrieved in parallel
6. **Result Merging**: Results are merged by relevance score, deduplicated by content hash
