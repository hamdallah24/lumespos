# RIC Philosophy — v1.1 (Architecture Lock)

**Directive**: T9.1A — Philosophy Refinement

**Status**: Ratified — all RIC documents must conform to this philosophy

**Date**: 2026-07-16

---

## Preamble

Runtime Intelligence Core (RIC) is the **Prefrontal Cortex** of the AI Operating System.

This document establishes the immutable architectural philosophy that governs all RIC design decisions. Every component, every interface, every data flow must satisfy these principles.

---

## 1. Five Responsibilities of RIC

RIC has exactly five responsibilities, in order:

```
1. UNDERSTAND
   Understand the user's intention.

2. REASON
   Produce semantic reasoning about the user's request.

3. PLAN
   Decide what information is required and specify what must be retrieved
   — never retrieve directly.

4. VERIFY
   Validate reasoning against grounded facts before proceeding.

5. BUILD RUNTIME CONTEXT
   Produce one verified RuntimeContext for Executive Runtime.
```

Step 3 (Plan) includes specifying WHAT, WHY, WHEN, and HOW MUCH must be retrieved. The actual retrieval is performed by the Grounding Layer — RIC never retrieves directly.

### Why Verification is First-Class

Verification is a mandatory reasoning stage. Every reasoning result produced by RIC must be verified against grounded information before being exposed to Executive Runtime.

Verification compares:

- **Inferred intent** — does the intent match available system capabilities?
- **Inferred domain** — does the domain have available data and providers?
- **Inferred entities** — do the extracted entities exist in grounded data?
- **Grounding availability** — are the required grounding providers online?
- **Repository availability** — do the requested files exist on the filesystem?
- **Operational truth availability** — is the requested operational data accessible?

The verification result contributes directly to the final confidence score. Reasoning without verification is considered incomplete.

### Verification Flow

```
Reasoner Output (domain: "finance")
       │
       ▼
Grounding Layer (checks: is finance data available?)
       │
       ▼
Verification (domain matches available data?)
       │
       ├── Yes → confidence preserved → RuntimeContext
       └── No  → confidence reduced → domain flagged → RuntimeContext
```

---

## 2. Simultaneous Understanding

RIC does not simply understand the user message.

RIC simultaneously understands **three dimensions** before the Executive Runtime begins reasoning:

| Dimension | What it captures | Example |
|---|---|---|---|
| **User Intent** | What does the user want? | "Check sales of Matcha Latte" |
| **Business State** | Current operational condition. Current mission. Current branch. Current KPI. Current operational truth. | Branch: Antapani, Mission: Q3 Revenue, KPI: 1.2B, Sales module online |
| **System State** | What is the system capable of right now? | Tool catalog loaded, repository indexed, memory stores online |

This makes RIC an **operating system intelligence layer**, not a chatbot.

### Why Three Dimensions

A chatbot only needs user intent. An operating system needs:

- **User Intent** — to know what to do
- **Business State** — to know the current operational reality, mission, branch, KPI, and available business data
- **System State** — to know what capabilities are available

Executive Runtime never starts reasoning without these three dimensions.

Without all three, the Executive Runtime receives an incomplete picture and must discover gaps at runtime — which is exactly what RIC was designed to prevent.

---

## 3. Non-Responsibilities (Abstracted)

RIC may **REQUEST** information.

RIC never **RETRIEVES** information.

Retrieval is exclusively owned by the Grounding Layer.

RIC only decides:

| Decision | Question |
|---|---|
| **WHAT** | What information is needed? |
| **WHY** | Why is this information needed? |
| **WHEN** | When should it be retrieved? (immediate, deferred, on-demand) |
| **HOW MUCH** | How much information is needed? (summarized, detailed, exhaustive) |

The Grounding Layer performs retrieval.
The Executive Runtime performs reasoning.
The Execution Layer performs actions.

This separation prevents intelligence from becoming coupled with infrastructure.

This principle is intentionally abstract — not tied to specific technologies like SQL, filesystems, or APIs. It survives technology changes. What matters is the architectural boundary: request ≠ retrieve.

---

## 4. Truth Ownership Principle

**RIC never owns truth.**

Grounding Layer owns truth.
Executives consume truth.
Only Grounding Layer may create Runtime Truth Objects.

RIC only reasons about truth. It never creates it.

This is a constitutional rule:
- If truth exists in Grounding Layer → RIC can reason about it
- If truth does not exist in Grounding Layer → RIC cannot create it
- If RIC needs truth that does not exist → RuntimeContext flags `missingTruth`

### Concrete Restrictions

- **No cache inside RIC.** RIC must not maintain any local cache of business data.
- **No repository state.** RIC must not track file system state.
- **No inventory state.** RIC must not track product availability.
- **No product catalog.** RIC must not store product information.
- **No financial values.** RIC must not retain sales figures.
- **No operational metrics.** RIC must not store KPIs or performance data.

These belong exclusively to Grounding Layer.

### Why This Rule Exists

Without truth ownership separation, RIC would eventually:
- Cache facts locally (diverging from Grounding Layer)
- Make assumptions about data (introducing hallucination)
- Create its own truth (becoming a second source of truth)

The Grounding Layer is the **single source of truth**. RIC is the **single reasoner about truth**.

---

## 5. Verification Principle

Reasoning must never be accepted automatically.

Every reasoning output must be validated against grounded evidence before entering RuntimeContext.

### Verification Rules

| Reasoning Output | Validated Against | Verification Method |
|---|---|---|
| Intent | Available intents in system | Schema validation |
| Domain | Available domains with data | Grounding Layer health check |
| Entities | Extracted entities exist in data | Cross-reference with business data |
| File paths | Files exist on filesystem | Repository Provider check |
| Tool selections | Tools exist in Tool Catalog | Tool Catalog lookup |
| Memory type | Memory store is available | Memory Provider health check |
| Operational data | Data source is accessible | Operational Truth Provider health check |

### Verification Confidence Impact

```
Verification Result         Confidence Impact
─────────────────────────────────────────────────────
All evidence matches         Confidence preserved
Partial evidence matches     Confidence reduced proportionally
Critical evidence missing    Confidence below threshold → clarification
Contradictory evidence       Confidence zero → re-plan required
```

---

## 6. Confidence Philosophy

Confidence does not represent model certainty.

**Confidence represents architecture confidence.**

Confidence increases only when:

- **reasoning agrees** — the LLM's semantic understanding is consistent and unambiguous
- **grounding succeeds** — the requested data is available and was retrieved successfully
- **verification passes** — the reasoning matches the grounded evidence
- **retrieval completes** — all required data was retrieved in full

Confidence decreases when one of those layers disagrees.

Therefore confidence is an **architectural metric**, not an LLM metric.

### Formula

```
CONFIDENCE = REASONING × GROUNDING × VERIFICATION
                │            │            │
            LLM certainty  Data         Evidence
            (understand)   availability  match rate
```

Each factor is independent:
- **Reasoning Confidence**: How certain is the LLM about its understanding? (0.0-1.0)
- **Grounding Confidence**: How complete is the data retrieval? (0.0-1.0)
- **Verification Confidence**: How well does reasoning match evidence? (0.0-1.0)

### Why Confidence is Architectural

A single-factor confidence score from an LLM is dangerous because it provides no visibility into whether the confidence is justified. An LLM can be 100% confident about something that is completely wrong.

Multi-factor confidence reveals the source of uncertainty:
- Low reasoning confidence → unclear user intent → ask for clarification
- Low grounding confidence → data unavailable → inform user
- Low verification confidence → reasoning contradicts facts → re-plan

---

## 7. RuntimeContext Principle

RuntimeContext is a **verified intelligence object**.

RuntimeContext is not generated directly from user input. Instead it is produced after:

```
Reasoning
    ↓
Grounding
    ↓
Verification
    ↓
Context Assembly
```

Only verified RuntimeContext may enter Executive Runtime.

This means:
- Raw user input never reaches Executive Runtime directly
- Raw LLM output never reaches Executive Runtime directly
- Raw grounding data never reaches Executive Runtime directly
- Every field in RuntimeContext has been: reasoned about, grounded in data, verified against evidence, and assembled into a coherent context

The RuntimeContext is the **final product** of RIC. Everything before it is intermediate work.

---

## 8. Architectural Law

Every reasoning produced by RIC must be **explainable**.

Every grounded information must be **traceable**.

Every RuntimeContext must be **reproducible**.

If one of these properties cannot be satisfied, the RuntimeContext must be marked as **degraded**.

### Explainability

"Explainable" means each decision in the reasoning trace must answer:
- Why was this domain selected?
- Why was this tool selected?
- Why was this repository selected?
- Why was this memory type selected?
- Why is confidence at this level?
- Why was this planning strategy chosen?

### Traceability

"Traceable" means each piece of grounded information must be linked back to its source provider:
- Which provider returned this data?
- When was it retrieved?
- What query parameters were used?
- Was there an error?

### Reproducibility

"Reproducible" means the same input (message + system state) must produce the same RuntimeContext:
- Deterministic grounding guarantees same data for same request
- Verification rules are deterministic
- Context assembly is deterministic
- Only the LLM calls introduce variance (mitigated by temperature=0 in production)

### Degraded Mode

A RuntimeContext is marked degraded when:
- LLM confidence was low and regex fallback was used
- One or more grounding providers failed
- Verification checks failed below threshold
- Missing truth exceeds acceptable limit

Degraded RuntimeContexts are still usable but confidence is reduced and the executive is notified.

---

## 9. Runtime Contract

Every RuntimeContext must satisfy the **Runtime Contract**:

| Property | Meaning | Failure Mode |
|---|---|---|
| **Grounded** | All fields supported by retrieved data | Missing truth flagged |
| **Verified** | Reasoning validated against evidence | Contradictions detected |
| **Traceable** | Every decision has a recorded origin | Audit trail missing |
| **Explainable** | Why-decisions exposed in reasoningTrace | Black box output |
| **Composable** | Can be consumed by any Executive Runtime | Executive-specific fields leak |

This contract is the **API guarantee** between RIC and every Executive Runtime. No executive should need to look beyond this contract.

---

## 10. Contract Dependency

Executives never depend on Runtime Intelligence modules.

Executives only depend on RuntimeContract.

```
Executive Runtime
       │
       ▼
RuntimeContract    ← ONLY dependency
       │
       ▼
   RIC Modules     ← NEVER accessed directly
```

This law guarantees low coupling between RIC internals and executive implementations. RIC can evolve its internal architecture without requiring executive changes.

## 11. Immutability Principle

RuntimeContext is immutable. No executive may mutate RuntimeContext. Every modification creates a new RuntimeContext version.

### Why Immutable

If executives could mutate RuntimeContext:

```
CEO → mutate confidence → 0.95
CTO reads CEO's confidence → 0.95
CFO reads original confidence → 0.82
Dual truth → inconsistency
```

Immutability eliminates dual truth. Every executive reads the same contract. If an executive needs a modified context, it creates a derived contract (new version).

### Enforcement

At the assembly boundary, RuntimeContext is deep-frozen before being passed to any executive.

---

## 12. Executive Independence

**Executive Runtime does not perform intelligence.**

**Executive Runtime consumes intelligence.**

All executives receive the same verified RuntimeContext. Only the following differ per executive:

- **Personality** — CEO persona, CTO persona, CFO persona, etc.
- **Authority** — what decisions each executive is authorized to make
- **Decision style** — analytical, strategic, operational, creative
- **Communication style** — formal, concise, explanatory, directive
- **Governance** — approval requirements, compliance rules, risk tolerance

### What Executives No Longer Do

Executives no longer:
- Determine intent — RIC does this
- Determine domain — RIC does this
- Select tools by keyword — RIC does this
- Search for files — RIC does this
- Query metadata — RIC does this
- Build execution plans — RIC does this
- Determine confidence — RIC does this

### What Executives Still Do

Executives only:
- Read the verified RuntimeContext
- Apply persona-specific reasoning
- Make decisions according to their authority
- Communicate in their designated style
- Govern according to their risk tolerance

### Why This Separation Exists

Intelligence is shared. Personality is isolated.

A CEO and CTO analyzing the same sales data will ask different questions and make different recommendations, but both start from the same facts. RIC ensures the facts are complete, verified, and consistent before either executive begins reasoning.

This eliminates:
- Duplicated intent detection across executives
- Inconsistent domain classification
- Conflicting tool selections
- Redundant file searches
- Diverging confidence calculations

Every RuntimeContext must expose the reasoning behind every decision.

### Minimum Explainability Requirements

```typescript
interface RuntimeContext {
  // ...
  reasoningTrace: [
    { step: "domain_selection", input: "Check sales of Matcha Latte", output: "sales", confidence: 0.94, alternatives: ["inventory"] },
    { step: "tool_selection", input: "Need sales data retrieval", output: "get_sales_summary", confidence: 0.91, alternatives: ["get_detailed_sales"] },
    { step: "repository_selection", input: "Sales-related files", output: "src/sales/SalesService.ts", confidence: 0.88, alternatives: [] },
    { step: "memory_selection", input: "Previous sales discussions", output: "episodic", confidence: 0.85, alternatives: ["working"] },
    { step: "confidence_calculation", input: "All factors", output: "0.82", confidence: 0.95, factors: { reasoning: 0.94, grounding: 0.88, verification: 0.90 } },
    { step: "planning_strategy", input: "Simple sales inquiry", output: "direct", confidence: 0.93, alternatives: ["sequential"] },
  ];
}
```

### Why Explainability is Mandatory

Without explainability, RuntimeContext becomes another black box:

- Developers cannot debug incorrect decisions
- Users cannot trust the system
- Auditors cannot verify compliance
- The system cannot improve (no feedback loop)

---

## 12. Brain Analogy (Complete)

The AI Operating System maps to the human brain:

```
User Input
     │
     ▼
SENSORY CORTEX                    Grounding Layer
  • Receives raw input              • Fetches raw data
  • Routes to processing centers    • Provides factual truth
  • No reasoning                    • Deterministic only
     │
     ▼
PREFRONTAL CORTEX                 Runtime Intelligence Core
  • Understands intent              • Understands user
  • Plans actions                   • Thinks semantically
  • Coordinates resources           • Plans retrieval
  • Executive function              • Verifies truth
     │
     ▼
PERSONALITY LAYER                 Executive Runtime
  • CEO persona                     • CEO executive
  • CTO persona                     • CTO executive
  • Domain-specific reasoning       • Domain-specific personae
  • Values and principles           • Business strategy
     │
     ▼
MOTOR CORTEX                      Execution Layer
  • Executes actions                • Performs actions
  • Sends signals                   • Calls APIs
  • Produces output                 • Produces response
```

This analogy is not decorative — it enforces architectural boundaries. No layer should perform another layer's function.

---

## 13. Truth Contract Immutability

| Component | Can Evolve? |
|---|---|
| Reasoning (LLM models, prompts) | Yes |
| Grounding (providers, data sources) | Yes |
| Executives (personae, strategies) | Yes |
| Execution (tools, APIs) | Yes |
| **RuntimeContext Contract** | **No — immutable** |

### Why the RuntimeContext is Immutable

If the RuntimeContext contract changes:

1. Every executive must be updated → fragile coupling
2. Every grounding provider must be updated → cascading changes
3. Every verification rule must be updated → validation drift
4. Every tool must be updated → integration breaks

The RuntimeContext is the **permanent API** of the AI Operating System. It can be extended (new optional fields) but never modified (existing fields cannot change type, name, or semantics).

### Extension vs Modification

| Action | Allowed? | Example |
|---|---|---|
| Add new optional field | Yes | `context.experimentalFeature` |
| Add new reasoning trace entry | Yes | `context.reasoningTrace.push(...)` |
| Change field type | No | `intent: string` → `intent: IntentEnum` (breaking) |
| Rename existing field | No | `domain` → `businessDomain` (breaking) |
| Remove existing field | No | Delete `confidence` (breaking) |
| Change field semantics | No | `confidence: 0-1` → `confidence: A-F` (breaking) |

---

## Summary: Architectural Lock

These fifteen principles form the permanent philosophical foundation of RIC:

| # | Principle | Core Idea |
|---|---|---|
| 1 | Five Responsibilities | U→R→P→V→B, verification is first-class |
| 2 | Simultaneous Understanding | Intent + Business State (mission, branch, KPI) + System State |
| 3 | Abstract Non-Responsibilities | May request, never retrieve. Only WHAT/WHY/WHEN/HOW MUCH |
| 4 | Truth Ownership | RIC never owns truth. Only Grounding Layer creates truth |
| 5 | Verification | All reasoning validated against evidence |
| 6 | Architecture Confidence | Confidence = reasoning × grounding × verification |
| 7 | RuntimeContext Principle | Only verified context enters Executive Runtime |
| 8 | Architectural Law | Explainable, traceable, reproducible, or degraded |
| 9 | Runtime Contract | Grounded, Verified, Traceable, Explainable, Composable |
| 10 | Contract Dependency | Executives depend only on RuntimeContract, never on RIC modules |
| 11 | Immutability | RuntimeContext is immutable. No executive may mutate it |
| 12 | Executive Independence | Executives consume intelligence, never perform it |
| 13 | Explainability | Every decision exposes its why |
| 14 | Brain Analogy | Complete four-layer mapping (Grounding → RIC → Executive → Execution) |
| 15 | Truth Contract Immutability | RuntimeContext never changes |

All RIC documents — architecture, implementation plan, migration strategy, risk analysis — must comply with these principles.
