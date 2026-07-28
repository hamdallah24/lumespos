import type { ApprovalItem } from "./WorkspaceTypes";

let counter = 0;

function nextId(): string {
  counter++;
  return `appr-${Date.now()}-${counter}`;
}

export function createApprovalItem(
  executive: string,
  action: string,
  parameters: Record<string, unknown>,
  reasoning: string,
  confidence: number,
  level: string = "ceo",
): ApprovalItem {
  return {
    id: nextId(),
    executive,
    action,
    parameters,
    reasoning,
    confidence,
    status: "pending",
    level,
    requestedAt: new Date().toISOString(),
  };
}

export function approve(item: ApprovalItem, by: string): ApprovalItem {
  return { ...item, status: "approved", resolvedAt: new Date().toISOString(), resolvedBy: by };
}

export function reject(item: ApprovalItem, by: string): ApprovalItem {
  return { ...item, status: "rejected", resolvedAt: new Date().toISOString(), resolvedBy: by };
}

export function getPendingApprovals(items: ApprovalItem[]): ApprovalItem[] {
  return items.filter(i => i.status === "pending");
}

export function getApprovalsByLevel(items: ApprovalItem[], level: string): ApprovalItem[] {
  return items.filter(i => i.level === level);
}
