<!--
  EPIC R — Phase 6: Executive Mental Model Library
  Sources: All EROS documents, SPECs, PLAYBOOKs, code observations,
           common mental model libraries
  DO NOT EDIT MANUALLY.
-->

# Executive Mental Model Library

**Version:** 1.0.0  
**Status:** STABLE  

---

## Mental Model Index

| ID | Model | Primary Executive | Type | Complexity |
|----|-------|-------------------|------|------------|
| MM-001 | First Principles | CEO | Reasoning | Advanced |
| MM-002 | OODA Loop | CEO | Decision | Intermediate |
| MM-003 | Second-Order Thinking | CEO | Reasoning | Advanced |
| MM-004 | Expected Value | CEO | Decision | Intermediate |
| MM-005 | Flywheel Effect | CEO | Strategy | Intermediate |
| MM-006 | Systems Thinking | CEO | Analysis | Advanced |
| MM-007 | SOLID Principles | CTO | Design | Fundamental |
| MM-008 | Domain-Driven Design | CTO | Design | Advanced |
| MM-009 | Clean Architecture | CTO | Architecture | Advanced |
| MM-010 | CAP Theorem | CTO | Architecture | Intermediate |
| MM-011 | YAGNI | CTO | Decision | Fundamental |
| MM-012 | KISS | CTO | Design | Fundamental |
| MM-013 | Event-Driven Architecture | CTO | Architecture | Advanced |
| MM-014 | CQRS | CTO | Architecture | Advanced |
| MM-015 | Performance Patterns | CTO | Optimization | Intermediate |
| MM-016 | Security Patterns | CTO | Security | Intermediate |
| MM-017 | Cash Flow Analysis | CFO | Financial | Fundamental |
| MM-018 | Financial Forecasting | CFO | Financial | Advanced |
| MM-019 | Scenario Planning | CFO | Strategy | Advanced |
| MM-020 | Capital Allocation | CFO | Decision | Advanced |
| MM-021 | Unit Economics | CFO | Analysis | Intermediate |
| MM-022 | Lean Operations | COO | Operations | Intermediate |
| MM-023 | Six Sigma | COO | Quality | Advanced |
| MM-024 | Theory of Constraints | COO | Analysis | Intermediate |
| MM-025 | Bottleneck Analysis | COO | Analysis | Intermediate |
| MM-026 | Operational Excellence | COO | Culture | Intermediate |
| MM-027 | AARRR Pirate Metrics | CMO | Analytics | Intermediate |
| MM-028 | Jobs To Be Done | CMO | Strategy | Advanced |
| MM-029 | Brand Strategy | CMO | Strategy | Intermediate |
| MM-030 | Positioning | CMO | Strategy | Intermediate |
| MM-031 | Prompt Engineering | CAIO | AI | Fundamental |
| MM-032 | Chain-of-Thought | CAIO | AI | Intermediate |
| MM-033 | ReAct Pattern | CAIO | AI | Advanced |
| MM-034 | Tree-of-Thoughts | CAIO | AI | Advanced |
| MM-035 | Verification Patterns | CAIO | AI | Intermediate |
| MM-036 | Evidence-Based Reasoning | CAIO | AI | Fundamental |
| MM-037 | Knowledge Graph Reasoning | CAIO | AI | Advanced |
| MM-038 | Knowledge Management | CKO | KM | Fundamental |
| MM-039 | Ontology Design | CKO | KM | Advanced |
| MM-040 | Taxonomy Development | CKO | KM | Intermediate |
| MM-041 | Knowledge Graphs | CKO | KM | Advanced |
| MM-042 | Learning Cycles | CKO | KM | Intermediate |
| MM-043 | Composition over Inheritance | ALL | Design | Fundamental |
| MM-044 | Single Source of Truth | ALL | Architecture | Fundamental |
| MM-045 | Least Privilege | ALL | Security | Fundamental |
| MM-046 | Defense in Depth | ALL | Security | Intermediate |

---

## CEO Mental Models

### MM-001: First Principles
- **Type:** Reasoning
- **Usage:** Breaking down complex strategic problems into fundamental truths
- **ERP Context:** CEO decomposes Founder vision into fundamental business objectives, derives executable missions from first principles rather than analogy
- **Trigger:** Strategic ambiguity, novel situations, conflicting advice
- **Example:** Instead of "we need better inventory management" → "what is the fundamental purpose of inventory? to match supply with demand at minimum cost"
- **Evidence:** EXECUTIVE_SPEC: "Translate Founder vision into actionable missions"

### MM-002: OODA Loop (Observe, Orient, Decide, Act)
- **Type:** Decision cycle
- **Usage:** Rapid decision-making in dynamic environments
- **ERP Context:** CEO executive lifecycle mirrors OODA: Observe (Receive + Classify) → Orient (Translate + Understand) → Decide (Verify) → Act (Delegate or Execute)
- **Trigger:** All strategic decisions
- **Evidence:** PLAYBOOK thinking process: Receive → Classify → Translate → Understand → Verify → Delegate → Execute → Record → Respond

### MM-003: Second-Order Thinking
- **Type:** Reasoning
- **Usage:** Considering consequences of consequences
- **ERP Context:** CEO evaluates not just immediate impact of strategic decisions but ripple effects across all 6 executives
- **Trigger:** Cross-domain decisions with long-term implications
- **Evidence:** CONSTITUTION: Decision Principles — "Proportional: proportionate to the situation and its potential consequences"

### MM-004: Expected Value
- **Type:** Decision
- **Usage:** Probability-weighted outcomes for strategic decisions
- **ERP Context:** CEO evaluates multiple delegation options by considering success probability × impact
- **Trigger:** Resource allocation, mission priority setting
- **Evidence:** DECISION_MODEL: Confidence calculation includes risk assessment (15%)

### MM-005: Flywheel Effect
- **Type:** Strategy
- **Usage:** Small compounding improvements create momentum
- **ERP Context:** CEO's mission planning ensures each completed mission builds on previous learnings
- **Trigger:** Long-term strategy, organizational growth
- **Evidence:** KNOWLEDGE_ARCHITECTURE: Historical knowledge type — past decisions inform future ones

### MM-006: Systems Thinking
- **Type:** Analysis
- **Usage:** Understanding interconnected system behavior
- **ERP Context:** CEO must understand how decisions in one domain affect all 7 executives and the runtime
- **Trigger:** Organizational change, cross-domain initiatives
- **Evidence:** COLLABORATION_MODEL: 21 pair interactions — CEO must understand all relationships

---

## CTO Mental Models

### MM-007: SOLID Principles
- **Type:** Design
- **Usage:** Object-oriented design principles
- **ERP Context:** CTO evaluates codebase compliance with Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Evidence:** EXECUTIVE_SPEC: architecture-review capability

### MM-008: Domain-Driven Design (DDD)
- **Type:** Design
- **Usage:** Model-driven software design aligned with business domains
- **ERP Context:** CTO analyzes whether code structure mirrors business domain boundaries
- **Evidence:** EXECUTIVE_SPEC: architecture-review capability

### MM-009: Clean Architecture
- **Type:** Architecture
- **Usage:** Dependency inversion, separation of concerns
- **ERP Context:** CTO validates that inner layers (domain) don't depend on outer layers (infrastructure)
- **Evidence:** EXECUTIVE_SPEC: architecture-review capability

### MM-010: CAP Theorem
- **Type:** Architecture
- **Usage:** Consistency, Availability, Partition Tolerance trade-offs
- **ERP Context:** CTO evaluates distributed system design decisions
- **Evidence:** EXECUTIVE_SPEC: architecture-review capability

### MM-011: YAGNI (You Ain't Gonna Need It)
- **Type:** Decision
- **Usage:** Don't add functionality until it's needed
- **ERP Context:** CTO applies when evaluating codebase complexity and refactoring proposals
- **Evidence:** PLAYBOOK: "Analysis accuracy >85%, Tool efficiency <20 tools/call"

### MM-012: KISS (Keep It Simple, Stupid)
- **Type:** Design
- **Usage:** Simplicity is the ultimate sophistication
- **ERP Context:** CTO evaluates whether solutions are unnecessarily complex
- **Evidence:** PLAYBOOK: 3-cycle analysis (EXPLORE → ANALYZE → CONCLUDE) — systematic not over-engineered

### MM-013: Event-Driven Architecture
- **Type:** Architecture
- **Usage:** Event-based communication between components
- **ERP Context:** CTO works within EIOS event-driven pipeline (11-stage pipeline with observer pattern)
- **Evidence:** EIOS_ARCHITECTURE: 11 self-registering stages, 6 observers

### MM-014: CQRS (Command Query Responsibility Segregation)
- **Type:** Architecture
- **Usage:** Separate read and write models
- **ERP Context:** CTO evaluates whether command and query paths are properly separated
- **Evidence:** EXECUTIVE_SPEC: architecture-review capability

### MM-015: Performance Patterns
- **Type:** Optimization
- **Usage:** Caching, indexing, parallelization, lazy loading
- **ERP Context:** CTO analyzes code performance and optimization opportunities
- **Evidence:** PLAYBOOK: "Tool efficiency <20 tools/call"

### MM-016: Security Patterns
- **Type:** Security
- **Usage:** Authentication, authorization, encryption, least privilege
- **ERP Context:** CTO evaluates code security, access control, vulnerability patterns
- **Evidence:** EXECUTIVE_SPEC: restrictions — "Must not modify governance or policy files"

---

## CFO Mental Models

### MM-017: Cash Flow Analysis
- **Type:** Financial
- **Usage:** Track inflow/outflow, identify patterns, predict shortages
- **ERP Context:** CFO monitors cash position, flags anomalies
- **Evidence:** SYSTEM_PROMPT (expanded): cash-flow-analysis capability

### MM-018: Financial Forecasting
- **Type:** Financial
- **Usage:** Predictive financial modeling based on historical data
- **ERP Context:** CFO projects future costs, revenues, margins
- **Evidence:** EXECUTIVE_SPEC: financial-analysis capability

### MM-019: Scenario Planning
- **Type:** Strategy
- **Usage:** Evaluate multiple future scenarios
- **ERP Context:** CFO provides cost/margin projections under different scenarios
- **Evidence:** DECISION_MODEL: Confidence calculation includes risk assessment (15%)

### MM-020: Capital Allocation
- **Type:** Decision
- **Usage:** Optimize resource allocation across competing priorities
- **ERP Context:** CFO advises CEO on budget allocation across CTO/COO/CMO initiatives
- **Evidence:** EXECUTIVE_SPEC: budget-review capability

### MM-021: Unit Economics
- **Type:** Analysis
- **Usage:** Per-unit cost, revenue, margin analysis
- **ERP Context:** CFO calculates cost per product, margin per branch, revenue per customer
- **Evidence:** SYSTEM_PROMPT (expanded): bep-calculation, margin-analysis

---

## COO Mental Models

### MM-022: Lean Operations
- **Type:** Operations
- **Usage:** Eliminate waste, maximize value
- **ERP Context:** COO optimizes inventory levels, reduces waste, streamlines processes
- **Evidence:** EXECUTIVE_SPEC: operational execution

### MM-023: Six Sigma
- **Type:** Quality
- **Usage:** Reduce defects, standardize processes
- **ERP Context:** COO enforces SOPs, tracks operational errors
- **Evidence:** PLAYBOOK: best practices, SOPs

### MM-024: Theory of Constraints (TOC)
- **Type:** Analysis
- **Usage:** Identify and eliminate bottlenecks
- **ERP Context:** COO identifies operational bottlenecks (slow inventory movement, production delays)
- **Evidence:** EXECUTIVE_SPEC: process optimization

### MM-025: Bottleneck Analysis
- **Type:** Analysis
- **Usage:** Identify system throughput constraints
- **ERP Context:** COO identifies which branch, product, or process is constraining overall operations
- **Evidence:** PLAYBOOK: status handler — "full brief + LLM response"

### MM-026: Operational Excellence
- **Type:** Culture
- **Usage:** Continuous improvement culture
- **ERP Context:** COO ensures each operational action is recorded as a knowledge episode for learning
- **Evidence:** KNOWLEDGE_ARCHITECTURE: Operational knowledge type

---

## CMO Mental Models

### MM-027: AARRR Pirate Metrics
- **Type:** Analytics
- **Usage:** Acquisition, Activation, Retention, Revenue, Referral
- **ERP Context:** CMO analyzes customer funnel from sales data
- **Evidence:** EXECUTIVE_SPEC: customer-insight capability

### MM-028: Jobs To Be Done (JTBD)
- **Type:** Strategy
- **Usage:** Understand customer motivations
- **ERP Context:** CMO identifies what "job" customers are hiring products for
- **Evidence:** EXECUTIVE_SPEC: market-analysis capability

### MM-029: Brand Strategy
- **Type:** Strategy
- **Usage:** Brand positioning, equity, identity
- **ERP Context:** CMO develops brand messaging aligned with market position
- **Evidence:** SYSTEM_PROMPT (expanded): brand-messaging capability

### MM-030: Positioning
- **Type:** Strategy
- **Usage:** Market positioning, differentiation
- **ERP Context:** CMO identifies competitive differentiation opportunities
- **Evidence:** SYSTEM_PROMPT (expanded): promotional-strategy capability

---

## CAIO Mental Models

### MM-031: Prompt Engineering
- **Type:** AI
- **Usage:** Design effective system prompts
- **ERP Context:** CAIO monitors prompt quality across all 7 executives, identifies prompt drift
- **Evidence:** EXECUTIVE_SPEC: ai-health-monitoring capability

### MM-032: Chain-of-Thought (CoT)
- **Type:** AI
- **Usage:** Step-by-step reasoning through problems
- **ERP Context:** CAIO ensures executive reasoning is structured and traceable
- **Evidence:** PLAYBOOK: each executive has defined thinking process with explicit steps

### MM-033: ReAct Pattern (Reasoning + Acting)
- **Type:** AI
- **Usage:** Interleave reasoning with tool use
- **ERP Context:** CAIO monitors executive tool use patterns for effectiveness
- **Evidence:** SYSTEM_PROMPT: Execution Protocol — "Run LLM for strategic reasoning (only if within scope)"

### MM-034: Tree-of-Thoughts
- **Type:** AI
- **Usage:** Explore multiple reasoning paths
- **ERP Context:** CAIO evaluates whether executives consider alternatives before deciding
- **Evidence:** DECISION_MODEL: "Alternatives Considered" in decision history

### MM-035: Verification Patterns
- **Type:** AI
- **Usage:** Self-consistency, fact-checking, confidence calibration
- **ERP Context:** CAIO monitors executive verification stage performance
- **Evidence:** EROS OPERATING_MODEL: Stage [7] Verification

### MM-036: Evidence-Based Reasoning
- **Type:** AI
- **Usage:** Data-driven conclusions, no hallucination
- **ERP Context:** CAIO enforces anti-hallucination rules across all executives
- **Evidence:** GLOBAL_SYSTEM_PROMPT: "DILARANG KERAS menyebut angka tanpa data"

### MM-037: Knowledge Graph Reasoning
- **Type:** AI
- **Usage:** Graph-based inference and knowledge traversal
- **ERP Context:** CAIO monitors knowledge graph health and query effectiveness
- **Evidence:** KNOWLEDGE_ARCHITECTURE: 7 knowledge types, knowledge flow diagram

---

## CKO Mental Models

### MM-038: Knowledge Management
- **Type:** KM
- **Usage:** Knowledge creation, sharing, utilization
- **ERP Context:** CKO manages complete knowledge lifecycle across all executives
- **Evidence:** EXECUTIVE_SPEC: knowledge-curation capability

### MM-039: Ontology Design
- **Type:** KM
- **Usage:** Formal knowledge domain classification
- **ERP Context:** CKO designs and maintains the Executive Knowledge Taxonomy
- **Evidence:** THIS DOCUMENT: Phase 3 — Executive Knowledge Taxonomy

### MM-040: Taxonomy Development
- **Type:** KM
- **Usage:** Hierarchical knowledge organization
- **ERP Context:** CKO maintains the 15-branch taxonomy and ensures consistent classification
- **Evidence:** KNOWLEDGE_CLASSIFICATION: 5-dimensional classification system

### MM-041: Knowledge Graphs
- **Type:** KM
- **Usage:** Relationship-based knowledge representation
- **ERP Context:** CKO manages knowledge graph (learning/knowledge-graph.ts, intelligence/organizational-memory.ts)
- **Evidence:** KNOWLEDGE_ARCHITECTURE: knowledge flow diagram

### MM-042: Learning Cycles (Kolb)
- **Type:** KM
- **Usage:** Concrete Experience → Reflective Observation → Abstract Conceptualization → Active Experimentation
- **ERP Context:** CKO ensures the learning engine (ECP-044) implements a complete learning cycle
- **Evidence:** LEARNING_ENGINE: Experience → Reflection → Knowledge → Graph → Index → Memory

---

## Shared Mental Models

### MM-043: Composition over Inheritance
- **Type:** Design
- **Usage:** Favor composition over class inheritance
- **ERP Context:** EPF uses composition-based prompt inheritance, not class-based
- **Evidence:** PROMPT_INHERITANCE: "Composition-based inheritance (not class-based)"
- **Used By:** ALL executives (via EPF)

### MM-044: Single Source of Truth (SSOT)
- **Type:** Architecture
- **Usage:** Each piece of knowledge has exactly one authoritative source
- **ERP Context:** EROS documents are SSOT for executive behavior; Foundation is SSOT for directives; ADRs are SSOT for architecture decisions
- **Evidence:** ADR-002: "Governor SSOT", EROS_EXECUTIVE_SUMMARY: 88% SSOT Score
- **Used By:** ALL executives

### MM-045: Least Privilege
- **Type:** Security
- **Usage:** Only use capabilities explicitly declared
- **ERP Context:** GovernanceProvider.canExecute() enforces least privilege
- **Evidence:** CONSTITUTION: Principle 5 — "Least Privilege"
- **Used By:** ALL executives

### MM-046: Defense in Depth
- **Type:** Security
- **Usage:** Multiple layers of security controls
- **ERP Context:** Dual governance (Runtime + Organization), multiple audit mechanisms, capability-based access
- **Evidence:** EROS_GOVERNANCE_MATRIX: Two governance levels (Level 1 + Level 2)
- **Used By:** ALL executives
