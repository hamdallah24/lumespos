---
id: readme-v1
title: Engineering OS — README
domain: foundation
artifact_type: index
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: mature
last_updated: 2026-06-29
last_reviewed: 2026-06-29
review_trigger:
  - OnChange
knowledge_level: foundational
context_priority: critical
depends_on:
  - foundation-index-v1
referenced_by:
  - null
consumers:
  - All AI Agents
  - ContextEngine
loading_strategy: always
tags:
  - foundation
  - index
  - navigation
  - onboarding
purpose: |
  Navigation index for the entire .ai/ Engineering Operating System.
  First file read by any agent. Understand the OS in 60 seconds.
---

# Engineering Operating System — `.ai/`

## What is `.ai/`?

Not a documentation folder. This is the **Engineering Knowledge Graph** — a living operating system that governs how AI agents and humans collaborate on the Lume's platform.

Every file here is a **Knowledge Asset**: a node in the Knowledge Graph with metadata, dependencies, consumers, and a lifecycle.

## Quick Start for New Agents

1. Read `foundation/FOUNDATION_INDEX.md` for the reading order
2. Read `foundation/NORTH_STAR.md` to understand why we exist
3. Read `foundation/CONSTITUTION.md` to understand how to think
4. Read `foundation/PROJECT_CONTEXT.md` to understand current state
5. Read `foundation/AI_OPERATING_MODEL.md` to understand how to work
6. If you are CTO, read `foundation/CTO_EXECUTION_DIRECTIVE.md`

## Directory Map

| Folder | Purpose | Knowledge Level |
|--------|---------|----------------|
| `foundation/` | Mission, principles, context, operating model, directives | Foundational |
| `governance/` | Policies, compliance, review workflows | Governing |
| `standards/` | Coding, TypeScript, prompts, database, API, error handling | Canonical |
| `architecture/` | System design, component maps, data flow, security, tool execution | Canonical |
| `playbooks/` | Operational workflows — CTO, code generator, debugging, releases | Operational |
| `adr/` | Architecture Decision Records — why decisions were made | Reference |
| `knowledge/` | Patterns, lessons learned, research, bug patterns | Reference |
| `specs/` | Technical contracts — API, database, tools, tokens | Canonical |
| `systems/` | Engine blueprints — knowledge, context, memory, planning | Canonical |
| `runtime/` | Execution specifications — agent registry, context loading | Operational |
| `catalog/` | Indexes — agents, tools, prompts, models, workflows | Reference |
| `workspace/` | Active work — audits, proposals, reviews, experiments | Operational |
| `meta/` | Templates, migration tracking, system health | Reference |
| `templates/` | Document templates for new Knowledge Assets | Reference |

## Philosophy Statement

> **Every Knowledge Asset must justify its existence.**

If a file cannot answer why it exists, who uses it, and what breaks if deleted — it does not belong here.

The Engineering OS is:
- **Self-documenting**: Code changes feed into documentation, not the other way around.
- **Self-validating**: Documentation is verified against the actual codebase.
- **Self-evolving**: Knowledge grows and prunes as the project matures.

## Key Entry Points

| For | Start Here |
|-----|-----------|
| Understanding the mission | `foundation/NORTH_STAR.md` |
| Understanding agent behavior rules | `foundation/CONSTITUTION.md` |
| Understanding the current sprint | `foundation/PROJECT_CONTEXT.md` |
| Understanding how to execute work | `foundation/AI_OPERATING_MODEL.md` |
| CTO's contract | `foundation/CTO_EXECUTION_DIRECTIVE.md` |
| Creating a new Knowledge Asset | `templates/` |
| Proposing a change | `workspace/proposals/` — use Proposal Workflow |
| Reading past decisions | `adr/` |
| Debugging | `playbooks/DEBUG_PLAYBOOK.md` |
| Deploying | `playbooks/RELEASE_PLAYBOOK.md` |
