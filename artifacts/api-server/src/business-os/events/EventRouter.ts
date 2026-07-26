import type { EventEnvelope } from "./EventEnvelope";
import { EventPriority, PRIORITY_ORDER } from "./EventPriority";

interface RouteTarget {
  executive: string;
  minPriority: EventPriority;
  condition?: (event: EventEnvelope) => boolean;
}

const ROUTING_TABLE: Map<string, RouteTarget[]> = new Map();

function route(type: string, targets: RouteTarget[]): void {
  ROUTING_TABLE.set(type, targets);
}

function getTargets(event: EventEnvelope): string[] {
  const routes = ROUTING_TABLE.get(event.type);
  if (!routes) return [];

  const matched: string[] = [];
  for (const target of routes) {
    if (PRIORITY_ORDER[event.priority] < PRIORITY_ORDER[target.minPriority]) continue;
    if (target.condition && !target.condition(event)) continue;
    if (!matched.includes(target.executive)) matched.push(target.executive);
  }
  return matched;
}

function getAllRouteMappings(): { type: string; executives: string[] }[] {
  const result: { type: string; executives: string[] }[] = [];
  for (const [type, targets] of ROUTING_TABLE) {
    result.push({ type, executives: targets.map(t => t.executive) });
  }
  return result;
}

// ===== REGISTER ALL ROUTES =====

route("stock.low", [{ executive: "COO", minPriority: EventPriority.HIGH }]);
route("stock.out", [{ executive: "COO", minPriority: EventPriority.CRITICAL }]);
route("stock.adjusted", [{ executive: "COO", minPriority: EventPriority.INFO }]);
route("stock.added", [{ executive: "COO", minPriority: EventPriority.INFO }]);
route("stock.reduced", [{ executive: "COO", minPriority: EventPriority.INFO }]);
route("stock.corrected", [{ executive: "COO", minPriority: EventPriority.WARNING }]);
route("stock.loss_corrected", [{ executive: "COO", minPriority: EventPriority.HIGH }]);
route("stock.transferred", [{ executive: "COO", minPriority: EventPriority.INFO }]);

route("purchase.created", [{ executive: "COO", minPriority: EventPriority.INFO }]);
route("purchase.received", [{ executive: "COO", minPriority: EventPriority.WARNING }]);
route("supplier.overdue", [
  { executive: "COO", minPriority: EventPriority.HIGH },
  { executive: "CFO", minPriority: EventPriority.HIGH, condition: (e) => (e.data as any).totalValue > 5000000 },
]);

route("shift.closed", [{ executive: "CFO", minPriority: EventPriority.INFO }]);
route("shift.discrepancy", [
  { executive: "COO", minPriority: EventPriority.HIGH },
  { executive: "CFO", minPriority: EventPriority.HIGH },
]);

route("expense.recorded", [{ executive: "CFO", minPriority: EventPriority.INFO }]);
route("cash.low", [{ executive: "CFO", minPriority: EventPriority.HIGH }]);
route("cash.negative", [{ executive: "CFO", minPriority: EventPriority.CRITICAL }]);
route("finance.period.close", [{ executive: "CFO", minPriority: EventPriority.WARNING }]);
route("journal.failed", [{ executive: "CFO", minPriority: EventPriority.HIGH }]);

route("employee.absent", [{ executive: "CHRO", minPriority: EventPriority.WARNING }]);
route("employee.leave", [{ executive: "CHRO", minPriority: EventPriority.INFO }]);

route("production.failed", [
  { executive: "COO", minPriority: EventPriority.HIGH },
  { executive: "CAIO", minPriority: EventPriority.WARNING },
]);
route("production.completed", [{ executive: "COO", minPriority: EventPriority.INFO }]);
route("production.finished", [{ executive: "COO", minPriority: EventPriority.INFO }]);

route("product.created", [{ executive: "COO", minPriority: EventPriority.INFO }]);
route("price.updated", [{ executive: "CFO", minPriority: EventPriority.WARNING }]);
route("product.deactivated", [{ executive: "COO", minPriority: EventPriority.WARNING }]);
route("recipe.updated", [{ executive: "COO", minPriority: EventPriority.WARNING }]);
route("recipe.created", [{ executive: "COO", minPriority: EventPriority.INFO }]);

route("ingredient.created", [{ executive: "COO", minPriority: EventPriority.INFO }]);

route("branch.offline", [
  { executive: "COO", minPriority: EventPriority.HIGH },
  { executive: "CTO", minPriority: EventPriority.HIGH },
]);
route("branch.online", [
  { executive: "COO", minPriority: EventPriority.INFO },
  { executive: "CTO", minPriority: EventPriority.INFO },
]);

route("po.created", [{ executive: "COO", minPriority: EventPriority.INFO }]);

export const EventRouter = { route, getTargets, getAllRouteMappings };
