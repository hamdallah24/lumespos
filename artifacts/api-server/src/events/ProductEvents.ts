import type { BaseEvent } from "../event-bus";

export interface ProductCreatedData {
  branchId: number;
  productId: number;
  name: string;
  price: number;
}

export interface PriceChangedData {
  productVariantId: number;
  productId: number;
  variantName: string;
  oldPrice: number;
  newPrice: number;
}

export interface RecipeChangedData {
  productId: number;
  productName: string;
  branchId: number;
  action: "created" | "updated";
}

export type ProductEvent =
  | { type: "product.created"; data: ProductCreatedData }
  | { type: "price.changed"; data: PriceChangedData }
  | { type: "recipe.changed"; data: RecipeChangedData };

export function createProductCreatedEvent(
  data: ProductCreatedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `product-created-${data.productId}`,
    type: "product.created",
    version: 1,
    timestamp: new Date(),
    aggregateId: `product:${data.productId}`,
    aggregateType: "product",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createPriceChangedEvent(
  data: PriceChangedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `price-changed-${data.productVariantId}-${Date.now()}`,
    type: "price.changed",
    version: 1,
    timestamp: new Date(),
    aggregateId: `product-variant:${data.productVariantId}`,
    aggregateType: "product_variant",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createRecipeChangedEvent(
  data: RecipeChangedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `recipe-changed-${data.productId}-${Date.now()}`,
    type: "recipe.changed",
    version: 1,
    timestamp: new Date(),
    aggregateId: `product:${data.productId}`,
    aggregateType: "product",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}
