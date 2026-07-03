# ECP-034 — Mission Authority

Status: FROZEN. Single Source of Truth for Missions.

## Authority

Only Mission Authority may: create, prioritize, approve, cancel, complete missions.
All Runtimes submit proposals. Mission Authority decides.

## Architecture

Founder -> North Star -> Strategic Objectives -> Mission Authority -> Mission Engine -> Runtime

## Lifecycle

PROPOSAL -> VALIDATION -> PRIORITIZATION -> APPROVAL -> QUEUED -> ACTIVE -> COMPLETED -> KNOWLEDGE -> ARCHIVED

## Approval

Priority <50: Auto-Reject
Priority 60-79: CEO Approval
Priority 80-89: Council Approval
Priority 90+: Founder Approval

## Forbidden

No Runtime may create a mission directly. All must go through missionAuthority.submit().
