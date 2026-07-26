import { eventBus } from "../../event-bus/EventBus";
import type { BaseEvent } from "../../event-bus/types";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

interface EventRoute {
  eventType: string;
  executive: string;
  priority: "low" | "normal" | "high" | "critical";
  autoExecute: boolean;
  generateTask: boolean;
  generateRecommendation: boolean;
}

const EVENT_ROUTES: EventRoute[] = [
  { eventType: "stock.low", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "stock.out", executive: "COO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "inventory.overstock", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "inventory.dead_stock", executive: "COO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: true },
  { eventType: "inventory.shrinkage", executive: "COO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: false },
  { eventType: "supplier.delay", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "inventory.expiring", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "inventory.reorder_point", executive: "COO", priority: "normal", autoExecute: true, generateTask: false, generateRecommendation: false },
  { eventType: "sales.spike", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "sales.drop", executive: "CMO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "sales.refund", executive: "CMO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: false },
  { eventType: "sales.target_miss", executive: "CMO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "crm.new_customer", executive: "CMO", priority: "high", autoExecute: false, generateTask: true, generateRecommendation: false },
  { eventType: "crm.churn_risk", executive: "CMO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "crm.complaint_escalated", executive: "CMO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "crm.negative_feedback", executive: "CMO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: true },
  { eventType: "finance.cash_negative", executive: "CFO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "finance.budget_exceeded", executive: "CFO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "finance.profit_drop", executive: "CFO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "finance.invoice_overdue", executive: "CFO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "finance.payroll_shortfall", executive: "CFO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "finance.expense_anomaly", executive: "CFO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: false },
  { eventType: "hr.resignation", executive: "CHRO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "hr.attendance_low", executive: "CHRO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: true },
  { eventType: "hr.overtime_exceeded", executive: "CHRO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "hr.training_need", executive: "CHRO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: true },
  { eventType: "production.machine_breakdown", executive: "COO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "production.defect_spike", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "production.capacity_full", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "production.material_shortage", executive: "COO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "purchasing.price_hike", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "purchasing.quality_issue", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "purchasing.emergency", executive: "COO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "warehouse.capacity_critical", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "warehouse.temperature_alert", executive: "COO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "warehouse.goods_mismatch", executive: "COO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: false },
  { eventType: "marketing.campaign_success", executive: "CMO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "marketing.campaign_failed", executive: "CMO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "marketing.competitor_launch", executive: "CMO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "marketing.brand_sentiment_drop", executive: "CMO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "marketing.ad_efficiency_drop", executive: "CMO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "expansion.opportunity", executive: "CEO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "expansion.branch_underperform", executive: "CEO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "expansion.regulatory_change", executive: "CEO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: true },
  { eventType: "platform.performance_degradation", executive: "CTO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "platform.security_breach", executive: "CTO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "platform.db_replication_lag", executive: "CTO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "platform.backup_failed", executive: "CTO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "council.revenue_drop", executive: "CEO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "council.margin_drop", executive: "CFO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "disaster.operational_disruption", executive: "CEO", priority: "critical", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "corporate.m&a_opportunity", executive: "CEO", priority: "high", autoExecute: true, generateTask: true, generateRecommendation: true },
  { eventType: "esg.initiative", executive: "CEO", priority: "normal", autoExecute: false, generateTask: true, generateRecommendation: true },
];

export class EventDrivenReasoner {
  private active = false;
  private unsub: (() => void) | null = null;
  public onAutoExecute: ((executive: string, event: BaseEvent, route: EventRoute) => void) | null = null;

  start(): void {
    if (this.active) return;
    this.active = true;

    const handler = (event: BaseEvent) => {
      const route = EVENT_ROUTES.find(r => r.eventType === event.type);
      if (!route) return;

      if (route.generateTask) {
        ExecutiveWorkspaceManager.addTask(
          route.executive,
          `[Auto] ${event.type}: ${JSON.stringify(event.data).slice(0, 60)}`,
          `Auto-generated task from event ${event.type}`,
          route.priority === "critical" || route.priority === "high" ? route.priority : ("normal" as any),
          event.id, undefined, true,
        );
      }

      if (route.generateRecommendation) {
        ExecutiveWorkspaceManager.addRecommendation(
          route.executive,
          `Action needed: ${event.type}`,
          `Automated recommendation based on ${event.type} event: ${JSON.stringify(event.data).slice(0, 100)}`,
          0.7,
        );
      }

      if (route.autoExecute && this.onAutoExecute) {
        this.onAutoExecute(route.executive, event, route);
      }
    };

    const subId = eventBus.subscribe("*", handler);
    this.unsub = () => eventBus.unsubscribe(subId);
    console.log(`[EventDrivenReasoner] Started with ${EVENT_ROUTES.length} event routes`);
  }

  stop(): void {
    if (this.unsub) this.unsub();
    this.active = false;
  }

  isActive(): boolean { return this.active; }
  getRoutes(): EventRoute[] { return [...EVENT_ROUTES]; }

  getRoutesForExecutive(executive: string): EventRoute[] {
    return EVENT_ROUTES.filter(r => r.executive === executive);
  }
}
