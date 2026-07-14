# EROS Dependency Diagram

**Version:** 1.0.0  
**Last Updated:** 2026-07-13

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                             │
│  Routes, Services, HTTP, Mission Engine, AI Execution Loop          │
│  Dependencies: → RuntimeFacade, → ExecutiveDispatchRegistry         │
│  Forbidden: → eios-runtime/internal/*                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXECUTIVE RUNTIME (EROS)                         │
│                                                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐│
│  │ CEO  │  │ CTO  │  │ CFO  │  │ CMO  │  │ CAIO │  │ CKO  │  │ COO  ││
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘│
│     │         │         │         │         │         │         │     │
│     └─────────┼─────────┼─────────┼─────────┼─────────┼─────────┘     │
│               │         │         │         │         │               │
│               ▼         ▼         ▼         ▼         ▼               │
│        ┌─────────────────────────────────────────────────────┐        │
│        │           ExecutiveDispatchRegistry                  │        │
│        │  register(), get(), getAll(), dispatch()             │        │
│        └─────────────────────────────────────────────────────┘        │
│                                                                      │
│  Dependencies: → ExecutiveDispatchRegistry, → RuntimeFacade,         │
│                 → PipelineContracts (types only)                      │
│                 → GovernanceProvider, → KnowledgeProvider             │
│                 → PlanProvider, → CommunicationProvider               │
│                 → ConsultantRuntime, → CouncilSessionManager          │
│  Forbidden: → eios-runtime/internal/*                                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EIOS RUNTIME CORE (FROZEN)                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    PUBLIC LAYER                               │   │
│  │  RuntimeFacace │ PipelineContext │ PipelineResolver           │   │
│  │  ObserverEngine │ TriggerEngine │ ExecutiveDispatchRegistry   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    CONTRACTS LAYER                            │   │
│  │  PipelineContracts │ RuntimeContracts │ EventContracts        │   │
│  │  HealthContracts │ RegistryContracts │ ComponentId            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    INTERNAL LAYER                              │   │
│  │  PipelineEngine │ RegistryLifecycle │ RuntimeGovernance       │   │
│  │  MetricsEngine │ TraceManager │ PipelineScheduler             │   │
│  │  RuntimeHealth │ ObserverEngine │ TriggerEngine               │   │
│  │  RuntimeState │ RuntimeSnapshotManager                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FOUNDATION LAYER                                │
│  Kernel │ Identity Runtime │ Directive Providers │ Event Schema      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Executive Dependencies

### CEO
```
ceoRuntime
  ├── IdentityRuntime (getIdentity)
  ├── FoundationProvider (getDirective, getFoundationProvider)
  ├── SemanticEngine (understand)
  ├── ExecutionSpecificationV1 (buildSpecV1)
  ├── VerificationEngine (verify)
  ├── OrganizationEngine (delegateBySpec)
  ├── ConsultantRuntime (translateToTargets) [optional]
  ├── KnowledgeProvider (searchAll, getLatestEpisodes, ingestEpisode)
  ├── PlanProvider (getAll)
  ├── GovernanceProvider (canExecute)
  ├── PromptAssembler (assemble)
  ├── LLM (callDeepSeek)
  ├── MissionRuntime (create, transition)
  ├── AuditEngine (log)
  └── Foundation (summarizeMemory)
```

### CTO
```
ctoProgram
  ├── IdentityRuntime (getIdentity)
  ├── FoundationProvider (getDirective)
  ├── AuthorizationRuntime (auth.can)
  ├── MissionScope (withinScope)
  ├── SemanticEngine (understand)
  ├── ExecutionSpecificationV1 (buildSpecV1)
  ├── VerificationEngine (verify)
  ├── Planner (plan)
  ├── KnowledgeLoader (loadKnowledgeWithContent)
  ├── MissionContextRegistry (getRelevant, getContent)
  ├── ConsultantRuntime (analyze) [optional]
  ├── PromptAssembler (assemble)
  ├── LLM (callDeepSeekWithTools)
  ├── ReflectionEngine (reflect)
  ├── EvidenceCollector (collectEvidence)
  ├── KnowledgeEvolution (propose, review)
  ├── ExecutiveDispatchRegistry (dispatch)
  ├── KnowledgeProvider (searchAll, ingestEpisode)
  ├── GovernanceProvider (canExecute)
  ├── AuditEngine (log)
  └── ToolRegistry (resolveTools)
```

### CFO
```
cfoRuntime
  ├── IdentityRuntime (getIdentity)
  ├── FoundationProvider (getDirective)
  ├── SemanticEngine (understand)
  ├── ExecutionSpecificationV1 (buildSpecV1)
  ├── VerificationEngine (verify)
  ├── ConsultantRuntime (analyze) [optional]
  ├── KnowledgeProvider (searchAll, ingestEpisode)
  ├── PlanProvider (getAll)
  ├── GovernanceProvider (canExecute)
  ├── PromptAssembler (assemble)
  ├── ExecutionPipeline (execute)
  └── AuditEngine (log)
```

### CMO
```
cmoRuntime
  ├── IdentityRuntime (getIdentity)
  ├── FoundationProvider (getDirective)
  ├── SemanticEngine (understand)
  ├── ExecutionSpecificationV1 (buildSpecV1)
  ├── VerificationEngine (verify)
  ├── ConsultantRuntime (analyze) [optional]
  ├── KnowledgeProvider (searchAll, ingestEpisode)
  ├── PlanProvider (getAll)
  ├── GovernanceProvider (canExecute)
  ├── PromptAssembler (assemble)
  ├── ExecutionPipeline (execute)
  └── AuditEngine (log)
```

### CAIO
```
caioRuntime
  ├── IdentityRuntime (getIdentity)
  ├── FoundationProvider (getDirective)
  ├── SemanticEngine (understand)
  ├── ExecutionSpecificationV1 (buildSpecV1)
  ├── VerificationEngine (verify)
  ├── ConsultantRuntime (analyze) [optional]
  ├── KnowledgeProvider (searchAll, getStats, ingestEpisode)
  ├── PlanProvider (getAll)
  ├── GovernanceProvider (canExecute)
  ├── PromptAssembler (assemble)
  ├── ExecutionPipeline (execute)
  ├── RuntimeFacade (health) [through EIOS public API]
  └── AuditEngine (log)
```

### CKO
```
ckoRuntime
  ├── ConsultantRuntime (analyze)
  ├── CouncilSessionManager (getAll)
  ├── KnowledgeProvider (searchAll, getStats, getBestPractices, ingestEpisode)
  ├── BriefGenerator (generate)
  ├── LLM (callDeepSeek)
  └── AuditEngine (log)
```

### COO
```
cooRuntime
  ├── IdentityRuntime (getIdentity)
  ├── FoundationProvider (getDirective, getFoundationContext)
  ├── ConsultantRuntime (advisor) [optional]
  ├── BriefGenerator (generate)
  ├── PlanProvider (getAll, getProgress)
  ├── KnowledgeProvider (searchAll, getBestPractices, ingestEpisode)
  ├── GovernanceProvider (canExecute)
  ├── CommunicationProvider (dispatch)
  ├── LLM (callDeepSeek)
  ├── BusinessOperations (executeOperation)
  └── AuditEngine (log)
```

---

## Cross-Executive Dispatch Dependencies

```
CEO ──dispatch──→ CTO  (implementation plan approval)
CEO ──dispatch──→ CFO  (financial analysis)
CEO ──dispatch──→ COO  (operational delegation)
CEO ──dispatch──→ CMO  (market analysis)
CEO ──dispatch──→ CAIO (AI system health)
CEO ──dispatch──→ CKO  (knowledge report)

CTO ──dispatch──→ CEO  (plan approval)
CTO ──dispatch──→ CAIO (architecture review)

COO ──notify────→ CEO  (escalation)
COO ──notify────→ Founder (critical escalation via CommunicationProvider)
```

---

## External Service Dependencies

| Service | Used By | Access Method |
|---------|---------|---------------|
| FoundationProvider | CEO, CTO, CFO, CMO, CAIO, COO | getDirective(), getFoundationContext() |
| KnowledgeProvider | All | searchAll(), getLatestEpisodes(), ingestEpisode(), getStats(), getBestPractices() |
| GovernanceProvider | CEO, CTO, CFO, CMO, CAIO, COO | canExecute() |
| PlanProvider | CEO, CFO, CMO, CAIO, COO | getAll(), getProgress() |
| AuditEngine | All | log() |
| CommunicationProvider | COO | dispatch() |
| ConsultantRuntime | CEO, CTO, CFO, CMO, CAIO, CKO | translateToTargets(), analyze(), advisor() |
| CouncilSessionManager | CKO | getAll() |
| BriefGenerator | COO, CKO | generate() |
| MissionContextRegistry | CTO | getRelevant(), getContent() |
