import { EventSubscriber } from "../../event-bus";
import { db, orderItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createMovement, MOVEMENT_TYPES } from "./movementService";
import { getRecipeRows } from "../../services/inventory";

// ── Operation Mode ──
// "shadow": log only, no actual movement creation (for validation)
// "active": create real movements via Movement Engine
// false: consumer registered but no-op
const OPERATION_MODE = "active" as "shadow" | "active" | false;

// Register consumer at module import time (same pattern as finance/eventHandlers)
function register(): void {
  if (!OPERATION_MODE) return;

  EventSubscriber.on("order.completed", async (event) => {
    try {
      const data = event.data as any;
      const orderId = data.orderId;
      const branchId = data.branchId;
      if (!orderId || !branchId) return;

      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));

      if (items.length === 0) return;

      let totalComponents = 0;

      for (const item of items) {
        if (!item.productId) continue;

        const parentType = item.productVariantId ? "product_variant" : "product";
        const parentId = item.productVariantId ?? item.productId;
        let recipe = await getRecipeRows(db as any, parentType as any, parentId);

        if (recipe.length === 0 && parentType === "product_variant" && item.productId) {
          recipe = await getRecipeRows(db as any, "product", item.productId);
        }

        for (const comp of recipe) {
          const totalQty = comp.quantity * item.quantity;
          totalComponents++;

          if (OPERATION_MODE === "shadow") {
            console.log(`[OrderConsumer] SHADOW: order #${orderId} — ${comp.componentType}:${comp.componentId} x${totalQty}`);
            continue;
          }

          try {
            await createMovement({
              branchId,
              itemType: comp.componentType,
              itemId: comp.componentId,
              movementType: MOVEMENT_TYPES.SALES_CONSUMPTION,
              quantity: totalQty,
              referenceType: "order",
              referenceId: orderId,
              description: `POS order #${orderId}`,
            });
          } catch (mvErr: any) {
            console.error(`[OrderConsumer] Movement failed for order #${orderId} ${comp.componentType}:${comp.componentId}:`, mvErr.message);
          }
        }
      }

      if (OPERATION_MODE === "shadow") {
        console.log(`[OrderConsumer] SHADOW: order #${orderId} — ${items.length} items, ${totalComponents} components (not written)`);
      } else {
        console.log(`[OrderConsumer] order #${orderId} — ${items.length} items, ${totalComponents} components processed`);
      }
    } catch (err) {
      console.error(`[OrderConsumer] Error processing order.completed:`, err);
    }
  });

  EventSubscriber.on("order.voided", async (event) => {
    try {
      const data = event.data as any;
      const orderId = data.orderId;
      const branchId = data.branchId;
      if (!orderId || !branchId) return;

      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));

      if (items.length === 0) return;

      let totalComponents = 0;

      for (const item of items) {
        if (!item.productId) continue;

        const parentType = item.productVariantId ? "product_variant" : "product";
        const parentId = item.productVariantId ?? item.productId;
        let recipe = await getRecipeRows(db as any, parentType as any, parentId);

        if (recipe.length === 0 && parentType === "product_variant" && item.productId) {
          recipe = await getRecipeRows(db as any, "product", item.productId);
        }

        for (const comp of recipe) {
          const totalQty = comp.quantity * item.quantity;
          totalComponents++;

          if (OPERATION_MODE === "shadow") {
            console.log(`[OrderConsumer] SHADOW: void #${orderId} — ${comp.componentType}:${comp.componentId} +${totalQty} (restore)`);
            continue;
          }

          try {
            await createMovement({
              branchId,
              itemType: comp.componentType,
              itemId: comp.componentId,
              movementType: MOVEMENT_TYPES.CUSTOMER_RETURN,
              quantity: totalQty,
              referenceType: "order",
              referenceId: orderId,
              description: `Void POS order #${orderId}`,
            });
          } catch (mvErr: any) {
            console.error(`[OrderConsumer] Void movement failed for order #${orderId} ${comp.componentType}:${comp.componentId}:`, mvErr.message);
          }
        }
      }

      if (OPERATION_MODE === "shadow") {
        console.log(`[OrderConsumer] SHADOW: void #${orderId} — ${items.length} items, ${totalComponents} components (not written)`);
      } else {
        console.log(`[OrderConsumer] void #${orderId} — ${items.length} items, ${totalComponents} components restored`);
      }
    } catch (err) {
      console.error(`[OrderConsumer] Error processing order.voided:`, err);
    }
  });

  console.log(`[OrderConsumer] Registered — mode: ${OPERATION_MODE}`);
}

register();
