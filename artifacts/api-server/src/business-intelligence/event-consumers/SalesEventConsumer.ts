import { EventSubscriber } from "../../event-bus";
import { processOrderCreated, calculateGrossMargin } from "../calculators";
import { metricStore } from "../core";
import type { Metric } from "../core/types";

export function registerSalesConsumers(): void {
  EventSubscriber.on("order.created", async (event) => {
    const data = event.data as {
      branchId: number;
      orderId: number;
      total: number;
      totalCogs: number;
      paymentMethod: string;
    };
    processOrderCreated(data);
    calculateGrossMargin(data.branchId);
  });

  EventSubscriber.on("order.completed", async (event) => {
    const data = event.data as {
      branchId: number;
      orderId: number;
      total: number;
      paymentMethod: string;
    };

    const metric: Metric = {
      id: `order-completed-${data.orderId}-${data.branchId}`,
      domain: "sales",
      name: "completed_order",
      value: data.total,
      unit: "rupiah",
      timestamp: new Date(),
      period: "realtime",
      tags: { orderId: data.orderId, branchId: data.branchId, paymentMethod: data.paymentMethod },
      branchId: data.branchId,
    };
    metricStore.set(metric);
  });
}
