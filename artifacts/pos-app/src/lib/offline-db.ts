import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "lumes-pos-offline";
const DB_VERSION = 1;

export interface CachedProduct {
  id: number;
  name: string;
  price: number;
  categoryId: number | null;
  imageUrl: string | null;
  hasVariants: boolean;
  minPrice: number | null;
  maxPrice: number | null;
}

export interface QueuedOrder {
  id: string;
  payload: {
    branchId: number | null;
    cashierName: string;
    cashierId: number | null;
    paymentMethod: string;
    amountPaid: number;
    discount?: number;
    discountType?: string;
    applyTax?: boolean;
    items: Array<{
      productId: number | null;
      productVariantId?: number | null;
      quantity: number;
      productName?: string;
      price?: number;
    }>;
  };
  status: "pending" | "synced" | "failed";
  createdAt: number;
  syncedAt?: number;
  retryCount: number;
  lastError?: string;
}

interface OfflineDBSchema {
  products: {
    key: number;
    value: CachedProduct;
    indexes: { "by-category": number | null };
  };
  orderQueue: {
    key: string;
    value: QueuedOrder;
    indexes: { "by-status": string; "by-timestamp": number };
  };
}

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export async function getOfflineDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const productStore = db.createObjectStore("products", { keyPath: "id" });
      productStore.createIndex("by-category", "categoryId");

      const orderStore = db.createObjectStore("orderQueue", { keyPath: "id" });
      orderStore.createIndex("by-status", "status");
      orderStore.createIndex("by-timestamp", "createdAt");
    },
  });
  return dbInstance;
}

export async function cacheProducts(products: CachedProduct[]) {
  const db = await getOfflineDB();
  const tx = db.transaction("products", "readwrite");
  await tx.store.clear();
  for (const p of products) {
    await tx.store.put(p);
  }
  await tx.done;
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  const db = await getOfflineDB();
  return db.getAll("products");
}

export async function queueOfflineOrder(order: QueuedOrder) {
  const db = await getOfflineDB();
  await db.put("orderQueue", order);
}

export async function getPendingOrders(): Promise<QueuedOrder[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex("orderQueue", "by-status", "pending");
}

export async function markOrderSynced(id: string) {
  const db = await getOfflineDB();
  const order = await db.get("orderQueue", id);
  if (order) {
    await db.put("orderQueue", { ...order, status: "synced", syncedAt: Date.now() });
  }
}

export async function markOrderFailed(id: string, error: string) {
  const db = await getOfflineDB();
  const order = await db.get("orderQueue", id);
  if (order) {
    await db.put("orderQueue", {
      ...order,
      status: "failed",
      retryCount: order.retryCount + 1,
      lastError: error,
    });
  }
}

export async function getPendingOrderCount(): Promise<number> {
  const db = await getOfflineDB();
  return db.count("orderQueue", "by-status", "pending");
}

export async function cleanupSyncedOrders() {
  const db = await getOfflineDB();
  const allOrders = await db.getAll("orderQueue");
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tx = db.transaction("orderQueue", "readwrite");
  for (const order of allOrders) {
    if (order.status === "synced" && order.syncedAt && order.syncedAt < weekAgo) {
      await tx.store.delete(order.id);
    }
  }
  await tx.done;
}
