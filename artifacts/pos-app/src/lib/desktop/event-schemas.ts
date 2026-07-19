/**
 * Lumé OS Desktop Event Schemas
 * T13X Phase 5
 *
 * All communication is event-driven.
 * Every event has a typed schema.
 * No component-to-component calls.
 */

import { desktopEventBus, type DesktopEvent } from "./event-bus";

/* ─── Domain Event Schemas ─── */

// ERP Domain Events
export interface ERPEvents {
  "Inventory.StockLow": {
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    warehouse?: string;
  };
  "Inventory.StockUpdated": {
    productId: string;
    previousQuantity: number;
    newQuantity: number;
    delta: number;
  };
  "Finance.InvoiceCreated": {
    invoiceId: string;
    customerName: string;
    total: number;
    currency: string;
  };
  "Finance.InvoicePaid": {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paidAt: number;
  };
  "Finance.ExpenseRecorded": {
    expenseId: string;
    category: string;
    amount: number;
    description: string;
  };
  "CRM.CustomerCreated": {
    customerId: string;
    name: string;
    email?: string;
    source: string;
  };
  "CRM.CustomerUpdated": {
    customerId: string;
    fields: string[];
  };
  "CRM.LeadConverted": {
    leadId: string;
    customerId: string;
    convertedBy: string;
  };
  "POS.TransactionCompleted": {
    transactionId: string;
    total: number;
    itemCount: number;
    paymentMethod: string;
    cashierId: string;
  };
  "POS.RefundProcessed": {
    refundId: string;
    originalTransactionId: string;
    amount: number;
    reason: string;
  };
  "HR.EmployeeAdded": {
    employeeId: string;
    name: string;
    role: string;
    department: string;
  };
  "HR.AttendanceMarked": {
    employeeId: string;
    date: string;
    status: "present" | "absent" | "late" | "leave";
  };
}

// Mission Domain Events
export interface MissionEvents {
  "Mission.Created": {
    missionId: string;
    title: string;
    assignedExecutive: string;
    priority: string;
  };
  "Mission.Started": {
    missionId: string;
    startedBy: string;
  };
  "Mission.Progress": {
    missionId: string;
    progress: number;
    status: string;
  };
  "Mission.Completed": {
    missionId: string;
    result: unknown;
    duration: number;
  };
  "Mission.Failed": {
    missionId: string;
    error: string;
  };
}

// AI Domain Events
export interface AIEvents {
  "AI.Warning": {
    type: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    source: string;
  };
  "AI.Insight": {
    title: string;
    description: string;
    confidence: number;
    targetApp?: string;
  };
  "AI.ExecutiveStatusChanged": {
    executiveId: string;
    previousStatus: string;
    newStatus: string;
  };
  "AI.MissionAssigned": {
    missionId: string;
    executiveId: string;
    appId: string;
  };
}

// System Domain Events
export interface SystemEvents {
  "System.PerformanceWarning": {
    component: string;
    metric: string;
    value: number;
    threshold: number;
  };
  "System.MemoryWarning": {
    usedMB: number;
    limitMB: number;
    percentage: number;
  };
  "System.Error": {
    component: string;
    error: string;
    stack?: string;
  };
  "System.ConfigChanged": {
    key: string;
    oldValue: unknown;
    newValue: unknown;
  };
}

// Workspace Domain Events
export interface WorkspaceEventsExtended {
  "Workspace.SnapshotTaken": {
    workspaceId: string;
    windowCount: number;
    timestamp: number;
  };
  "Workspace.Restored": {
    workspaceId: string;
    windowCount: number;
  };
}

// All domain events combined
export type DomainEvent =
  | { type: keyof ERPEvents; payload: ERPEvents[keyof ERPEvents] }
  | { type: keyof MissionEvents; payload: MissionEvents[keyof MissionEvents] }
  | { type: keyof AIEvents; payload: AIEvents[keyof AIEvents] }
  | { type: keyof SystemEvents; payload: SystemEvents[keyof SystemEvents] }
  | { type: keyof WorkspaceEventsExtended; payload: WorkspaceEventsExtended[keyof WorkspaceEventsExtended] };

/* ─── Typed Event Emitter ─── */

export const domainEmit = {
  // ERP
  inventoryStockLow: (payload: ERPEvents["Inventory.StockLow"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `erp-${Date.now()}`, title: `Stock Low: ${payload.productName}` }),
  inventoryStockUpdated: (payload: ERPEvents["Inventory.StockUpdated"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `erp-${Date.now()}`, title: `Stock Updated` }),
  financeInvoiceCreated: (payload: ERPEvents["Finance.InvoiceCreated"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `erp-${Date.now()}`, title: `Invoice Created: ${payload.customerName}` }),
  financeInvoicePaid: (payload: ERPEvents["Finance.InvoicePaid"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `erp-${Date.now()}`, title: `Invoice Paid: $${payload.amount}` }),
  crmCustomerCreated: (payload: ERPEvents["CRM.CustomerCreated"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `erp-${Date.now()}`, title: `New Customer: ${payload.name}` }),
  posTransactionCompleted: (payload: ERPEvents["POS.TransactionCompleted"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `erp-${Date.now()}`, title: `Transaction: $${payload.total}` }),
  
  // Mission
  missionCreated: (payload: MissionEvents["Mission.Created"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `mission-${Date.now()}`, title: `Mission: ${payload.title}` }),
  missionCompleted: (payload: MissionEvents["Mission.Completed"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `mission-${Date.now()}`, title: `Mission Complete: ${payload.missionId}` }),
  missionFailed: (payload: MissionEvents["Mission.Failed"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `mission-${Date.now()}`, title: `Mission Failed` }),

  // AI
  aiWarning: (payload: AIEvents["AI.Warning"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `ai-${Date.now()}`, title: `AI Warning: ${payload.message}` }),
  aiInsight: (payload: AIEvents["AI.Insight"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `ai-${Date.now()}`, title: `AI Insight: ${payload.title}` }),

  // System
  systemPerformanceWarning: (payload: SystemEvents["System.PerformanceWarning"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `sys-${Date.now()}`, title: `Performance: ${payload.component}` }),
  systemMemoryWarning: (payload: SystemEvents["System.MemoryWarning"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `sys-${Date.now()}`, title: `Memory Warning: ${payload.percentage}%` }),
  systemError: (payload: SystemEvents["System.Error"]) =>
    desktopEventBus.emit({ type: "NOTIFICATION_ADDED" as const, notificationId: `sys-${Date.now()}`, title: `System Error: ${payload.component}` }),
};

/* ─── Event Schema Registry ─── */

export const eventSchemas = {
  erp: {} as ERPEvents,
  mission: {} as MissionEvents,
  ai: {} as AIEvents,
  system: {} as SystemEvents,
  workspace: {} as WorkspaceEventsExtended,
};

export type EventSchemaCategory = keyof typeof eventSchemas;

export function getEventSchemaNames(category: EventSchemaCategory): string[] {
  return Object.keys(eventSchemas[category]) as string[];
}
