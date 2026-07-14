# Prompt Composition Engine

**Version:** 1.0.0  
**Status:** STABLE  
**Last Updated:** 2026-07-13

---

## 1. Overview

The Prompt Composition Engine defines the deterministic process for building any executive's System Prompt from EROS documentation sources.

**Principle:** Prompts are NEVER written manually. They are ALWAYS generated from source documents.

---

## 2. Composition Formula

```
SYSTEM_PROMPT(executive) =
    GLOBAL_SYSTEM_PROMPT
  + CONSTITUTION_SECTION(executive)
  + IDENTITY_SECTION(executive)
  + CAPABILITIES_SECTION(executive)
  + DECISION_RULES_SECTION(executive)
  + COMMUNICATION_SECTION(executive)
  + EXECUTION_SECTION(executive)
  + COLLABORATION_SECTION(executive)
  + OUTPUT_SECTION(executive)
  + FAILURE_SECTION(executive)
  + SAFETY_SECTION(executive)
```

Each `SECTION(executive)` is a deterministic function:
```
SECTION_RULES(executive) → string
```

---

## 3. Source Document Mapping

### Layer 0: GLOBAL_SYSTEM_PROMPT

**Source:** `GLOBAL_SYSTEM_PROMPT.md`  
**Content:** Identical for all executives  
**Extraction:** READ entire file verbatim

### Layer 1: CONSTITUTION_SECTION

**Source documents:**
- `EXECUTIVE_CONSTITUTION.md`
- `EXECUTIVE_SPEC.md` — Authority, Decision Scope, Non Scope

**Extraction rules:**
```
1. From EXECUTIVE_CONSTITUTION.md:
   - Section 1 (Core Principles) — ALL
   - Section 2 (Executive Ethics) — ALL
   - Section 3 (Decision Principles) — ALL
   - Section 5 (Delegation Principles) — ALL
   - Section 6 (Risk Principles) — ALL (role-specific criteria)
   - Section 9 (Escalation) — role-specific targets
   - Section 10 (Review Rules) — ALL
   - Section 11 (Learning Rules) — ALL

2. From EXECUTIVE_SPEC.md:
   - Authority section
   - Decision Scope section
   - Non Scope section (reformatted as constraints)
```

### Layer 2: IDENTITY_SECTION

**Source document:** `EXECUTIVE_SPEC.md`

**Extraction rules:**
```
1. Mission → "Your mission is {MISSION}"
2. Vision → "Your vision is {VISION}"
3. Primary Objective → "Your primary objective is {PRIMARY_OBJECTIVE}"
4. Responsibilities → numbered list
```

### Layer 3: CAPABILITIES_SECTION

**Source documents:**
- `EXECUTIVE_SPEC.md` — Capabilities
- `EXECUTIVE_CAPABILITY_MATRIX.md` — Governance Gates, Shared capabilities

**Extraction rules:**
```
1. List all capabilities from SPEC
2. For each shared capability, note which executive it's shared with
3. Include governance gate rules
```

### Layer 4: DECISION_RULES_SECTION

**Source documents:**
- `EXECUTIVE_DECISION_MODEL.md` — Confidence thresholds, Decision lifecycle
- `EXECUTIVE_SPEC.md` — Decision Scope

**Extraction rules:**
```
1. Decision lifecycle stages
2. Confidence thresholds (from Decision Model)
3. Role-specific typical confidence table
4. Role-specific risk criteria (from SPEC)
```

### Layer 5: COMMUNICATION_SECTION

**Source documents:**
- `EXECUTIVE_SPEC.md` — Communication Style
- `EXECUTIVE_COMMUNICATION_PROTOCOL.md` — Response Format, Success/Failure Reports

**Extraction rules:**
```
1. Response format template
2. Language (Indonesian or English)
3. Style description
4. Signature line
```

### Layer 6: EXECUTION_SECTION

**Source document:** `PLAYBOOK.md`

**Extraction rules:**
```
1. Thinking Process → numbered steps
2. Workflow → ordered stage list
3. Decision Tree (simplified for prompt)
```

### Layer 7: COLLABORATION_SECTION

**Source documents:**
- `EXECUTIVE_COLLABORATION_MODEL.md` — Interaction pairs involving this executive
- `EXECUTIVE_SPEC.md` — Delegation Rules, Escalation Rules

**Extraction rules:**
```
1. Only include pairs where this executive is the PRIMARY (owner)
2. Delegation rules table
3. Escalation rules table
```

### Layer 8: OUTPUT_SECTION

**Source documents:**
- `EXECUTIVE_SPEC.md` — Outputs section
- `EXECUTIVE_COMMUNICATION_PROTOCOL.md` — Success Report, Failure Report

**Extraction rules:**
```
1. Output format (JSON, natural language, structured)
2. Required elements in output
3. Success response structure
4. Failure response structure
```

### Layer 9: FAILURE_SECTION

**Source document:** `PLAYBOOK.md` — Recovery Strategy

**Extraction rules:**
```
1. Error categories and their handling
2. Recovery strategy per failure type
3. When to escalate on failure
```

### Layer 10: SAFETY_SECTION

**Source documents:**
- `EXECUTIVE_SPEC.md` — Restrictions
- `EXECUTIVE_RUNTIME_HANDBOOK.md` — Forbidden Dependencies, Runtime Constraints

**Extraction rules:**
```
1. Restrictions (from SPEC, reformatted as hard rules)
2. Forbidden dependencies
3. Anti-patterns (from PLAYBOOK)
```

---

## 4. Deterministic Generation Algorithm

```
function generateSystemPrompt(executive: string): string {
  const global = readFile("GLOBAL_SYSTEM_PROMPT.md");
  const spec = readSpec(executive);
  const playbook = readPlaybook(executive);
  const constitution = readFile("../EXECUTIVE_CONSTITUTION.md");
  const decisionModel = readFile("../EXECUTIVE_DECISION_MODEL.md");
  const capabilityMatrix = readFile("../EXECUTIVE_CAPABILITY_MATRIX.md");
  const collaborationModel = readFile("../EXECUTIVE_COLLABORATION_MODEL.md");
  const commProtocol = readFile("../EXECUTIVE_COMMUNICATION_PROTOCOL.md");
  const handbook = readFile("../EXECUTIVE_RUNTIME_HANDBOOK.md");

  const sections: string[] = [];

  // Layer 0: Global (verbatim)
  sections.push(global);

  // Layer 1: Constitution
  sections.push(extractConstitution(constitution, spec));

  // Layer 2: Identity
  sections.push(extractIdentity(spec));

  // Layer 3: Capabilities
  sections.push(extractCapabilities(spec, capabilityMatrix));

  // Layer 4: Decision Rules
  sections.push(extractDecisionRules(decisionModel, spec));

  // Layer 5: Communication
  sections.push(extractCommunication(commProtocol, spec));

  // Layer 6: Execution
  sections.push(extractExecution(playbook));

  // Layer 7: Collaboration
  sections.push(extractCollaboration(collaborationModel, spec));

  // Layer 8: Output
  sections.push(extractOutput(commProtocol, spec));

  // Layer 9: Failure
  sections.push(extractFailure(playbook));

  // Layer 10: Safety
  sections.push(extractSafety(spec, handbook, playbook));

  return sections.join("\n\n---\n\n");
}
```

---

## 5. Validation After Generation

```
function validatePrompt(prompt: string, executive: string): ValidationResult {
  const checks: Check[] = [];

  // No forbidden patterns
  checks.push(notContains(prompt, "eios-runtime/internal"));
  checks.push(notContains(prompt, "PipelineEngine"));
  checks.push(notContains(prompt, "direct DB"));

  // Constitution alignment
  checks.push(containsSection(prompt, "Constitution"));

  // Identity presence
  checks.push(contains(prompt, executive.toUpperCase()));

  // Capabilities present
  checks.push(containsSection(prompt, "Capabilities"));

  // Safety rules present
  checks.push(containsSection(prompt, "Safety Rules"));
  checks.push(containsSection(prompt, "Forbidden"));

  // Communication format
  checks.push(containsSection(prompt, "Communication"));

  // Failure recovery
  checks.push(containsSection(prompt, "Failure"));

  return { valid: checks.every(c => c.pass), checks };
}
```

---

## 6. Runtime Composition (Dynamic Context)

At runtime, the static System Prompt is supplemented by:

```
FINAL_PROMPT = SYSTEM_PROMPT(executive)
  + FOUNDATION_DIRECTIVE(executive)  // From getDirective()
  + FOUNDATION_CONTEXT()             // From getFoundationContext()
  + CKO_ADVISORY()                   // From consultantRuntime (optional)
  + KNOWLEDGE_CONTEXT()              // From KnowledgeProvider.searchAll()
  + PLANS_CONTEXT()                  // From PlanProvider.getAll()
  + BRIEF_CONTEXT()                  // From BriefGenerator (optional)
  + USER_MESSAGE                     // The actual request
```

The static SYSTEM_PROMPT (generated by EPF) NEVER changes. Only the dynamic context is appended at runtime.

---

## 7. File Format

Generated prompts are stored as plain Markdown files with the following convention:

```
Section headers: "## Layer {N}: {Name}"
Required header: "**Generated from:** {source document paths}"
Version header: "**Version:** X.Y.Z"
```

Each generated prompt includes a header comment:

```markdown
<!--
  GENERATED by EPF v1.0.0
  EXECUTIVE: {role}
  SOURCES: EXECUTIVE_SPEC.md, PLAYBOOK.md, EXECUTIVE_CONSTITUTION.md,
           EXECUTIVE_DECISION_MODEL.md, EXECUTIVE_CAPABILITY_MATRIX.md,
           EXECUTIVE_COLLABORATION_MODEL.md, EXECUTIVE_COMMUNICATION_PROTOCOL.md,
           EXECUTIVE_RUNTIME_HANDBOOK.md
  DO NOT EDIT MANUALLY. Regenerate by updating source documents.
-->
```
