import type { BaseEvent } from "../event-bus";

export interface OrderCreatedData {
  branchId: number;
  orderId: number;
  total: number;
  totalCogs: number;
  paymentMethod: string;
  cashierName: string | null;
  items: Array<{ productId: number; productVariantId?: number | null; quantity: number; price: number }>;
}

export interface OrderCompletedData {
  branchId: number;
  orderId: number;
  total: number;
  totalCogs: number;
  paymentMethod: string;
}

export interface PaymentReceivedData {
  branchId: number;
  orderId: number;
  amount: number;
  paymentMethod: string;
}

export interface OrderVoidedData {
  branchId: number;
  orderId: number;
  total: number;
  totalCogs: number;
  reason?: string;
}

export type OrderEvent =
  | { type: "order.created"; data: OrderCreatedData }
  | { type: "order.completed"; data: OrderCompletedData }
  | { type: "payment.received"; data: PaymentReceivedData }
  | { type: "order.voided"; data: OrderVoidedData };

export function createOrderCreatedEvent(
  data: OrderCreatedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `order-created-${data.orderId}`,
    type: "order.created",
    version: 1,
    timestamp: new Date(),
    aggregateId: `order:${data.orderId}`,
    aggregateType: "order",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createOrderCompletedEvent(
  data: OrderCompletedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `order-completed-${data.orderId}`,
    type: "order.completed",
    version: 1,
    timestamp: new Date(),
    aggregateId: `order:${data.orderId}`,
    aggregateType: "order",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createPaymentReceivedEvent(
  data: PaymentReceivedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `payment-received-${data.orderId}`,
    type: "payment.received",
    version: 1,
    timestamp: new Date(),
    aggregateId: `order:${data.orderId}`,
    aggregateType: "order",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createOrderVoidedEvent(
  data: OrderVoidedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `order-voided-${data.orderId}`,
    type: "order.voided",
    version: 1,
    timestamp: new Date(),
    aggregateId: `order:${data.orderId}`,
    aggregateType: "order",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}
