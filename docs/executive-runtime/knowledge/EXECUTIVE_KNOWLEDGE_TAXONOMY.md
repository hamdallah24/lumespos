<!--
  EPIC R — Phase 3: Executive Knowledge Taxonomy
  Sources: All EROS documents, SRC audit, knowledge-platform types,
           learning types, intelligence types, governance types
  DO NOT EDIT MANUALLY.
-->

# Executive Knowledge Taxonomy

**Version:** 1.0.0  
**Status:** STABLE  

A hierarchical classification of ALL knowledge within the Executive Knowledge System.

---

## Taxonomy Structure

```
Knowledge (root)
├── 01 Foundation
├── 02 Organization
├── 03 Runtime
├── 04 Executive
├── 05 Domain (Business)
├── 06 Decision
├── 07 Framework
├── 08 Mental Model
├── 09 Playbook
├── 10 Experience
├── 11 Evidence
├── 12 Temporary
├── 13 External
├── 14 User
└── 15 Conversation
```

---

## 01 — Foundation Knowledge

Immutable knowledge that defines the system's core identity, principles, and boundaries.

```
Foundation
├── Philosophy          # Core beliefs, design philosophy, architectural principles
├── Covenant            # Agreements between system components, behavioral contracts
├── Constitution        # Executive Constitution (6 principles, ethics, escalation)
│   ├── Core Principles     # Runtime Purity, Domain Sovereignty, Dispatch Only, etc.
│   ├── Executive Ethics    # Honesty, Accountability, Respect Boundaries, Privacy, Fairness
│   └── Decision Principles # Evidence-based, Confidence-gated, Verifiable, etc.
├── North Star          # Ultimate objectives, system purpose, long-term direction
├── Architecture Rules  # Frozen rules from ArchitectureRegistry (ADR-derived)
│   ├── ADR-001 through ADR-008 (Set B)  # EIOS architecture decisions
│   └── ADR-001 through ADR-008 (Set A)  # World A architecture decisions
├── Identity            # Agent identities, roles, authority levels
│   ├── IDENTITIES map      # 9 roles: CEO, CTO, COO, CFO, CMO, CAIO, CKO, CHRO, CIO, Founder, Chat
│   ├── knowledgeDomains    # Per-role knowledge access boundaries
│   └── trustScores         # Initial trust weights per executive
├── Directives          # Per-role directives (authority, forbidden actions, required behaviors)
├── Capability Matrix   # Capability definitions per role with minMaturity, requiresEvidence
├── Delegation Matrix   # Routing matrix: domain -> runtime target
└── Governance Gates    # Confidence gates (stop=25, warn=50, execute=80)
```

---

## 02 — Organization Knowledge

Knowledge about the organizational structure, relationships, and operational hierarchy.

```
Organization
├── Executive Registry       # All registered executives, their status, version
├── Collaboration Pairs      # 21 documented executive pair relationships
│   ├── Purpose                  # Why this pair exists
│   ├── Decision Authority       # Who decides what
│   ├── Escalation Path          # How conflicts escalate
│   ├── Conflict Resolution      # How disputes are resolved
│   ├── Shared Context           # What knowledge they share
│   └── Approval Flow            # How approvals work between them
├── Hierarchy               # Reporting structure, delegation chains
├── Department Boundaries   # Domain sovereignty boundaries per executive
├── Organization State      # OrgLifecycle: BOOT → READY → ACTIVE → MAINTENANCE → RECOVERY → SHUTDOWN
├── Org Intelligence        # Organizational memory, reputation, consensus history
│   ├── OrgKnowledgeNode        # Validated knowledge (2+ sources)
│   ├── ExecutiveReputation     # Per-executive accuracy, success rate, specialties
│   ├── ConsensusHistory        # Multi-executive decision records
│   └── DecisionHistory          # All past decisions with outcomes
└── Org Health             # Governance quality scores, compliance status, risk levels
```

---

## 03 — Runtime Knowledge

Knowledge about the EIOS Runtime Core and Executive Runtime infrastructure.

```
Runtime
├── Runtime Core (FROZEN)    # 12 frozen components
│   ├── PipelineEngine           # Pipeline execution engine
│   ├── ExecutiveDispatchRegistry # Cross-executive dispatch
│   ├── RuntimeFacade            # Public API (13 methods)
│   ├── RegistryLifecycle        # BOOT → REGISTERING → VALIDATING → FROZEN → RUNNING → SHUTDOWN
│   ├── RuntimeGovernance        # Boot validators, policy checks
│   ├── MetricsEngine            # Pipeline metrics, performance data
│   ├── TraceManager             # Distributed tracing
│   ├── PipelineScheduler        # Pipeline scheduling
│   ├── RuntimeHealth            # 8-dimension health scoring
│   ├── ObserverEngine           # Event observers (executive_memory, knowledge_learning, etc.)
│   ├── TriggerEngine            # 11 trigger types
│   └── RuntimeState             # Current runtime state
├── Executive Runtime (THAWED)  # 7 executives
│   ├── CEO Runtime
│   ├── CTO Runtime
│   ├── CFO Runtime
│   ├── CMO Runtime
│   ├── CAIO Runtime
│   ├── CKO Runtime
│   └── COO Runtime
├── Pipeline                # 11-stage pipeline architecture
│   ├── event_validation
│   ├── business_intelligence
│   ├── decision_context
│   ├── decision_engine
│   ├── north_star
│   ├── strategy_simulator
│   ├── strategy_engine
│   ├── execution_planner
│   ├── workflow_runtime
│   ├── brief_generator
│   └── executive_runtime
├── Observers               # 6 self-registering observers
│   ├── executive_memory        # Subscribes to decision.made (ExactlyOnce, priority 100)
│   ├── knowledge_learning      # Subscribes to decision.made (Buffered, priority 200)
│   ├── council_learning        # Subscribes to council.resolved (ExactlyOnce, priority 150)
│   ├── digital_twin
│   ├── self_evolution          # Subscribes to pipeline.completed (FireAndForget, priority 500)
│   └── communication
├── Kernel                  # Central nervous system
│   ├── Heartbeat               # 10s interval, 3 max misses
│   ├── Lifecycle               # BOOT → READY → ACTIVE → MAINTENANCE → RECOVERY → SHUTDOWN
│   ├── Checkpoint              # State snapshots (max 10)
│   └── Recovery                # Auto-recover dead runtimes
└── Runtime Metrics         # Pipeline performance, health scores, token usage
```

---

## 04 — Executive Knowledge

Knowledge about each executive's identity, capabilities, behavior patterns, and performance.

```
Executive
├── CEO
│   ├── Identity           # CEO identity, authority, mission, vision
│   ├── Capabilities       # 7 capabilities: mission-planning, delegation, etc.
│   ├── Decision Patterns  # Typical confidence levels, approval patterns
│   ├── Performance        # Decision accuracy, delegation efficiency, response time
│   └── Knowledge          # Knowledge domains CEO accesses
├── CTO
│   ├── Identity           # CTO identity, authority, mission, vision
│   ├── Capabilities       # 6 capabilities: code-analysis, implementation, etc.
│   ├── Decision Patterns  # Technical review patterns, tool usage patterns
│   ├── Performance        # Analysis accuracy, tool efficiency, response quality
│   └── Knowledge          # Knowledge domains CTO accesses
├── CFO                    # (same structure)
├── CMO                    # (same structure)
├── CAIO                   # (same structure)
├── CKO                    # (same structure)
├── COO                    # (same structure)
├── Executive States       # IDLE, DISPATCHING, DECIDING, DELEGATING, REVIEWING, etc.
├── Executive Lifecycle    # 11 stages: User Intent → Dispatch → ... → Completion
└── Executive Memory       # Per-executive isolated memory (learning/executive-memory.ts)
    ├── Experiences            # Past missions, outcomes, lessons
    ├── KnowledgeNodes         # Synthesized knowledge (PATTERN, BUG, SOLUTION, INSIGHT, WARNING)
    ├── Statistics             # Per-executive performance stats
    └── Reputation             # Trust score, accuracy, reliability
```

---

## 05 — Domain Knowledge (Business)

Business domain knowledge about products, operations, customers, and market.

```
Domain (Business)
├── Products
│   ├── Product Catalog        # All products, variants, categories
│   ├── Recipes                # Product recipes, ingredient composition
│   ├── Pricing                # Current prices, price history
│   └── Product Status         # Active/inactive/discontinued
├── Inventory
│   ├── Stock Levels           # Current stock by branch/product
│   ├── Stock Movements        # Add, reduce, correct, loss, transfer
│   └── Ingredients            # Raw ingredients, semi-finished goods
├── Branches
│   ├── Branch Data            # Branch info, location, status
│   ├── Branch Performance     # Sales, costs, margins per branch
│   └── Branch Operations      # Daily operations per branch
├── Sales
│   ├── Daily Sales            # Sales per day per branch
│   ├── Sales Trends           # Week-over-week, month-over-month
│   └── Product Performance    # Best/worst selling products
├── Expenses
│   ├── Operational Expenses   # Daily operational costs
│   ├── Ingredient Costs       # Cost of goods sold
│   └── Labor Costs            # Staff wages, role-based costs
├── Customers
│   ├── Customer Segments      # Customer types, demographics
│   ├── Engagement Patterns    # Visit frequency, purchase patterns
│   └── Feedback               # Customer complaints, suggestions
├── Market
│   ├── Market Trends          # Industry trends, seasonal patterns
│   ├── Competitor Activity    # Competitor pricing, promotions
│   └── Market Position        # Brand position, market share
└── Financials
    ├── Revenue                # Total revenue, by branch, by product
    ├── Costs                  # Total costs, breakdown
    ├── Margins                # Gross margin, net margin
    └── Cash Flow              # Inflow, outflow, balance
```

---

## 06 — Decision Knowledge

Knowledge about decisions made, decision models used, and decision outcomes.

```
Decision
├── Decision History        # All decisions made by all executives
│   ├── Decision Record         # role, action, reasoning, confidence, outcome
│   ├── Alternatives Considered # What was rejected and why
│   └── Outcome Evaluation      # Was the decision correct? What was the result?
├── Decision Models         # Structured decision frameworks
│   ├── Confidence Model        # 5-factor weighted calculation
│   ├── Approval Model          # 5 levels: NONE, SELF, CROSS, CEO, FOUNDER
│   ├── Risk Model              # 4 levels: LOW, MEDIUM, HIGH, CRITICAL
│   └── Escalation Model        # 4 levels: Executive → CEO → Founder → CAIO
├── Decision Patterns       # Recurring decision types
│   ├── Approval Patterns       # When CEO approves/rejects
│   ├── Delegation Patterns     # When to delegate vs execute
│   └── Escalation Patterns     # When to escalate
├── Decision Metrics        # Decision quality, speed, accuracy
└── Rollback Knowledge      # Reversible vs irreversible decisions
    ├── Reversible Actions         # Stock adjustments, price changes, product status
    ├── Irreversible Actions       # Data deletion, financial transactions, deployed code
    └── Compensation Actions       # Forward → compensation mapping
```

---

## 07 — Framework Knowledge

Knowledge about the frameworks and methodologies used by each executive.

```
Framework
├── EROS Framework          # Executive Runtime Operating System docs
│   ├── Handbook                # EXECUTIVE_RUNTIME_HANDBOOK
│   ├── Constitution            # EXECUTIVE_CONSTITUTION
│   ├── Operating Model         # EXECUTIVE_OPERATING_MODEL
│   ├── Decision Model          # EXECUTIVE_DECISION_MODEL
│   ├── Capability Matrix       # EXECUTIVE_CAPABILITY_MATRIX
│   ├── Collaboration Model     # EXECUTIVE_COLLABORATION_MODEL
│   ├── Communication Protocol  # EXECUTIVE_COMMUNICATION_PROTOCOL
│   └── Knowledge Architecture  # EXECUTIVE_KNOWLEDGE_ARCHITECTURE
├── EPF Framework           # Executive Prompt Framework
│   ├── Prompt Blueprint        # 16-section template
│   ├── Composition Engine      # Deterministic generation
│   ├── Prompt Inheritance      # Layer-based inheritance
│   └── Validation Rules        # 17 validation criteria
├── Governance Framework    # ECP-046
│   ├── Policy Engine           # OrganizationPolicy, thresholds
│   ├── Compliance Engine       # 8 compliance rules (GOV-001 through GOV-008)
│   ├── Risk Engine             # Quality, executive, knowledge, consensus risks
│   ├── Quality Engine          # Organization quality scoring
│   └── Improvement Engine      # AI self-improvement plans
├── Learning Framework      # ECP-044
│   ├── Experience Engine       # Execution → Experience
│   ├── Reflection Engine       # Experience → Reflection
│   ├── Knowledge Engine        # Reflection → KnowledgeNode
│   ├── Knowledge Graph         # KnowledgeNode relationships
│   └── Retrieval Engine        # Context-aware retrieval
└── Intelligence Framework  # ECP-045
    ├── Organizational Memory   # Multi-source validated knowledge
    ├── Knowledge Fusion        # Cross-executive knowledge synthesis
    ├── Consensus Engine        # Multi-executive voting
    └── Cross-Executive Learning # Knowledge transfer between executives
```

---

## 08 — Mental Model Knowledge

Knowledge about the mental models and thinking frameworks used by each executive.

```
Mental Model
├── CEO Models
│   ├── First Principles        # Decompose problems to fundamental truths
│   ├── OODA Loop               # Observe, Orient, Decide, Act
│   ├── Second-Order Thinking   # Consider consequences of consequences
│   ├── Expected Value          # Probability-weighted outcomes
│   ├── Flywheel Effect         # Small compounding improvements
│   └── Systems Thinking        # Interconnected system behavior
├── CTO Models
│   ├── SOLID Principles        # OOP design principles
│   ├── Domain-Driven Design    # Model-driven software design
│   ├── Clean Architecture      # Dependency inversion, separation of concerns
│   ├── CAP Theorem             # Consistency, Availability, Partition Tolerance
│   ├── YAGNI                   # You Ain't Gonna Need It
│   ├── KISS                    # Keep It Simple, Stupid
│   ├── Event-Driven            # Event-based architecture patterns
│   ├── CQRS                    # Command Query Responsibility Segregation
│   ├── Performance Patterns    # Caching, indexing, optimization
│   └── Security Patterns       # Auth, encryption, least privilege
├── CFO Models
│   ├── Cash Flow Analysis      # Inflow/outflow management
│   ├── Financial Forecasting   # Predictive financial modeling
│   ├── Scenario Planning       # Multiple future scenarios
│   ├── Capital Allocation      # Resource allocation optimization
│   └── Unit Economics          # Per-unit cost/revenue analysis
├── COO Models
│   ├── Lean Operations         # Waste reduction, value maximization
│   ├── Six Sigma               # Quality control, defect reduction
│   ├── Theory of Constraints   # Bottleneck identification
│   ├── Bottleneck Analysis     # System throughput optimization
│   └── Operational Excellence  # Continuous improvement culture
├── CMO Models
│   ├── AARRR Pirate Metrics    # Acquisition, Activation, Retention, Revenue, Referral
│   ├── Jobs To Be Done         # Customer motivation framework
│   ├── Brand Strategy          # Brand positioning, equity, identity
│   └── Positioning             # Market positioning, differentiation
├── CAIO Models
│   ├── Prompt Engineering      # System prompt design patterns
│   ├── Chain-of-Thought        # Step-by-step reasoning
│   ├── ReAct Pattern           # Reasoning + Acting
│   ├── Tree-of-Thoughts        # Multiple reasoning paths
│   ├── Verification Patterns   # Self-consistency, fact-checking
│   ├── Evidence-Based Reasoning # Data-driven conclusions
│   └── Knowledge Graph Reasoning # Graph-based inference
└── CKO Models
    ├── Knowledge Management    # Knowledge creation, sharing, utilization
    ├── Ontology Design         # Knowledge domain classification
    ├── Taxonomy Development    # Hierarchical knowledge organization
    ├── Knowledge Graphs        # Relationship-based knowledge
    └── Learning Cycles         # Experience → Reflection → Knowledge
```

---

## 09 — Playbook Knowledge

Knowledge about executable procedures, SOPs, and operational patterns.

```
Playbook
├── CEO Playbook
│   ├── Strategic Planning Procedure   # How CEO processes strategic requests
│   ├── Delegation Procedure           # How CEO delegates to executives
│   ├── Approval Procedure             # How CEO reviews and approves plans
│   └── Escalation Procedure           # How CEO escalates to Founder
├── CTO Playbook
│   ├── Code Analysis Procedure        # 3-cycle EXPLORE → ANALYZE → CONCLUDE
│   ├── Implementation Procedure       # Plan → Approval → Execute
│   ├── Architecture Review Procedure  # How CTO reviews architecture
│   └── Knowledge Evolution Procedure  # How CTO proposes knowledge updates
├── CFO Playbook
│   ├── Financial Analysis Procedure   # Query → Fetch → Analyze → Recommend
│   ├── Cost Optimization Procedure    # Identify → Analyze → Recommend
│   └── Budget Review Procedure        # Review → Analyze → Flag
├── CMO Playbook
│   ├── Campaign Design Procedure      # Analyze → Design → Recommend
│   ├── Market Analysis Procedure      # Data → Trends → Insights
│   └── Customer Insight Procedure     # Sales data → Customer patterns
├── CAIO Playbook
│   ├── Health Check Procedure         # Collect → Analyze → Report
│   ├── Performance Analysis Procedure # Metrics → Trends → Recommendations
│   └── Anomaly Detection Procedure    # Baseline → Compare → Alert
├── CKO Playbook
│   ├── Council Mode Procedure         # Keyword detect → Council data → Format
│   ├── Advisory Mode Procedure        # Analyze message → ConsultantRuntime → Fallback
│   ├── Direct LLM Procedure           # Search → Stats → Brief → Assemble → Execute
│   └── Knowledge Curation Procedure   # Register → Lifecycle → Maintenance
└── COO Playbook
    ├── Approval Procedure             # Situation → Option → Approve/Reject/Escalate
    ├── Status Procedure               # Query → Brief → LLM Response
    ├── Action Procedure               # Action → Governance → Execute → Record
    ├── Question Procedure              # Query → KnowledgeProvider → LLM
    └── Multi-Action Procedure          # LLM → Parse → Execute multiple actions
```

---

## 10 — Experience Knowledge

Knowledge derived from past executions, missions, and operations.

```
Experience
├── Mission Episodes       # Past missions executed by all executives
│   ├── missionId
│   ├── objective
│   ├── participants
│   ├── keyDecisions
│   ├── learnings
│   ├── outcome (SUCCESS / FAILURE / PARTIAL)
│   └── knowledgeAdded
├── Execution Outcomes     # Results of specific actions
│   ├── action
│   ├── confidence
│   ├── duration
│   ├── tokenUsage
│   ├── toolUsage
│   └── lessons
├── Reflections            # Post-execution analysis
│   ├── strengths
│   ├── weaknesses
│   ├── improvements
│   └── newPatterns
├── Knowledge Episodes     # Immutable append-only records (KnowledgeProvider)
│   ├── eventType
│   ├── eventId
│   ├── context
│   ├── outcome
│   ├── domain
│   ├── topic
│   ├── summary
│   └── tags
└── Learning Outcomes      # Synthesized knowledge from learning engine
    ├── PATTERNs               # Recurring patterns detected
    ├── INSIGHTs               # New understandings
    ├── WARNINGs               # Risks and pitfalls
    └── SOLUTIONs              # Effective solutions found
```

---

## 11 — Evidence Knowledge

Knowledge supporting claims, decisions, and recommendations.

```
Evidence
├── Evidence Sources
│   ├── KnowledgePlatform   # Historical episodes (HIGH confidence)
│   ├── PlanProvider        # Active plans (HIGH confidence)
│   ├── GovernanceProvider  # Authorization records (HIGH confidence)
│   ├── Foundation Directives # Immutable rules (HIGH confidence)
│   ├── ConsultantRuntime   # CKO advisory (MEDIUM confidence)
│   ├── LLM Reasoning       # AI reasoning output (MEDIUM confidence)
│   ├── MissionContextRegistry # Mission scope (MEDIUM confidence)
│   ├── CouncilSessionManager  # Council decisions (HIGH confidence)
│   └── RuntimeFacade       # System health (HIGH confidence)
├── Evidence Records
│   ├── filePath                # Source file
│   ├── diff                    # Code change diff
│   ├── deploymentLog           # Deployment evidence
│   ├── commandOutput           # SSH/command execution output
│   ├── reason                  # Business reason
│   └── auditTrail              # Governance audit reference
├── Evidence Strength
│   ├── strong                  # Multiple high-confidence sources
│   ├── medium                  # Single high-confidence or multiple medium
│   └── weak                    # Single medium-confidence source
└── Evidence Chain          # Traceability from claim → source
```

---

## 12 — Temporary Knowledge

Short-lived knowledge that is only relevant for the current session or context.

```
Temporary
├── Session Context        # Current user conversation context
│   ├── userIntent
│   ├── conversationHistory
│   └── activeTopics
├── Working Memory         # Current task state
│   ├── currentMission
│   ├── pendingTasks
│   ├── completedTasks
│   ├── currentFindings
│   └── currentConfidence
├── Context Budget         # Token budget allocation per context type
│   ├── systemContext
│   ├── foundationContext
│   ├── knowledgeContext
│   ├── planContext
│   ├── briefContext
│   ├── historyContext
│   └── userContext
└── Execution State        # Current pipeline execution state
    ├── currentStage
    ├── stageResults
    └── accumulatedContext
```

---

## 13 — External Knowledge

Knowledge sourced from outside the system.

```
External
├── Market Data            # External market research, trends, news
├── Competitor Information # Competitor activities, pricing, products
├── Industry Research      # Industry reports, benchmarks, standards
├── Customer Feedback      # External customer surveys, reviews, social media
├── Regulatory Knowledge   # Laws, regulations, compliance requirements
├── Technology Trends      # Emerging technologies, best practices
└── Third-Party APIs       # External service integrations
```

---

## 14 — User Knowledge

Knowledge about the human users (Founder, operators, customers).

```
User
├── Founder                # System owner, highest authority
│   ├── preferences
│   ├── communication style
│   ├── strategic priorities
│   ├── past decisions
│   └── feedback patterns
├── Operators              # Daily system operators (store managers, staff)
│   ├── roles
│   ├── permissions
│   ├── preferences
│   └── past requests
└── Customers              # End customers
    ├── segments
    ├── purchase history
    ├── preferences
    └── feedback
```

---

## 15 — Conversation Knowledge

Knowledge about past conversations, interactions, and communication patterns.

```
Conversation
├── Conversation History   # Past user-system interactions
│   ├── user messages
│   ├── system responses
│   ├── timestamps
│   └── outcomes
├── Semantic Memory        # Resolved temporal references ("yang kemarin")
│   ├── reference
│   ├── resolved context
│   └── timestamp
├── Communication Patterns # How each user communicates
│   ├── common requests
│   ├── typical phrasing
│   └── preference patterns
└── Active Conversations   # Currently open conversations
    ├── conversationId
    ├── participants
    ├── context
    └── status
```

---

## Taxonomy Usage Rules

1. **Every knowledge item** MUST be classifiable into exactly ONE leaf node
2. **Cross-cutting knowledge** (e.g., CEO's decision about COO operations) is classified by the PRIMARY domain owner's perspective
3. **New knowledge** MUST be classified at creation time using this taxonomy
4. **Classification** is stored as a path string: `Foundation.Constitution.CorePrinciples`
5. **Taxonomy changes** require CKO approval (knowledge-curation capability)
6. **Version** of taxonomy is tracked independently

---

## Cross-Reference: Knowledge Types to Taxonomy

| EROS Knowledge Type | Primary Taxonomy Branch | Secondary Branch |
|---------------------|------------------------|-----------------|
| Domain | 05 Domain (Business) | 01 Foundation |
| Operational | 05 Domain (Operations) | 10 Experience |
| Strategic | 04 Executive (CEO) | 02 Organization |
| Procedural | 09 Playbook | 07 Framework |
| Historical | 10 Experience | 06 Decision |
| External | 13 External | 05 Domain (Market) |
| Runtime | 03 Runtime | 04 Executive (CAIO) |
