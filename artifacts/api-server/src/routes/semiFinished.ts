import { Router } from "express";
import { db, semiFinishedTable, currentInventoryTable, ingredientsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth, requireBranchAccess, requireRole, canAccessBranch } from "../middlewares/requireAuth";
import { adjustInventory, getRecipeRows, getInventoryStock, type Executor } from "../services/inventory";

const router = Router();

// Helper: ambil cost per unit dari komponen (semi_finished atau ingredient)
async function getComponentCost(
  tx: Executor,
  componentType: string,
  componentId: number
): Promise<number> {
  if (componentType === "semi_finished") {
    const [sf] = await tx
      .select({ costPricePerUnit: semiFinishedTable.costPricePerUnit })
      .from(semiFinishedTable)
      .where(eq(semiFinishedTable.id, componentId));
    return sf ? parseFloat(sf.costPricePerUnit) : 0;
  } 
  else if (componentType === "ingredient") {
    const [ing] = await tx
      .select({ costPricePerUnit: ingredientsTable.costPricePerUnit })
      .from(ingredientsTable)
      .where(eq(ingredientsTable.id, componentId));
    return ing ? parseFloat(ing.costPricePerUnit) : 0;
  }
  return 0;
}

// Helper serialize
function serialize(row: typeof semiFinishedTable.$inferSelect, currentStock: number) {
  return {
    id: row.id,
    branchId: row.branchId,
    name: row.name,
    unit: row.unit,
    costPricePerUnit: parseFloat(row.costPricePerUnit),
    currentStock,
    yieldQuantity: parseFloat(row.yieldQuantity ?? "1"),
    yieldUnit: row.yieldUnit ?? row.unit,
    trackInShift: row.trackInShift,
  };
}

// GET /api/semi-finished
router.get("/semi-finished", requireAuth, requireBranchAccess((req) => Number(req.query.branchId)), async (req, res) => {
  try {
    const branchId = Number(req.query.branchId);
    if (!branchId) {
      return res.status(400).json({ error: "branchId required" });
    }

    const rows = await db
      .select({
        id: semiFinishedTable.id,
        branchId: semiFinishedTable.branchId,
        name: semiFinishedTable.name,
        unit: semiFinishedTable.unit,
        costPricePerUnit: semiFinishedTable.costPricePerUnit,
        yieldQuantity: semiFinishedTable.yieldQuantity,
        yieldUnit: semiFinishedTable.yieldUnit,
        trackInShift: semiFinishedTable.trackInShift,
        currentStock: sql<string>`coalesce(${currentInventoryTable.currentStock}, '0')`,
      })
      .from(semiFinishedTable)
      .leftJoin(
        currentInventoryTable,
        and(
          eq(currentInventoryTable.itemType, sql`'semi_finished'`),
          eq(currentInventoryTable.itemId, semiFinishedTable.id),
          eq(currentInventoryTable.branchId, branchId)
        )
      )
      .where(eq(semiFinishedTable.branchId, branchId))
      .orderBy(semiFinishedTable.name);

    return res.json(
      rows.map((r) => ({
        id: r.id,
        branchId: r.branchId,
        name: r.name,
        unit: r.unit,
        costPricePerUnit: parseFloat(r.costPricePerUnit),
        currentStock: parseFloat(r.currentStock),
        yieldQuantity: parseFloat(r.yieldQuantity ?? "1"),
        yieldUnit: r.yieldUnit ?? r.unit,
        trackInShift: r.trackInShift,
      }))
    );
  } catch (error) {
    console.error("GET /semi-finished error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/semi-finished
router.post("/semi-finished", requireRole("owner", "manager"), requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, name, unit, yieldQuantity, yieldUnit, trackInShift } = req.body as {
      branchId: number;
      name: string;
      unit: string;
      yieldQuantity?: number;
      yieldUnit?: string;
      trackInShift?: boolean;
    };

    if (!branchId || !name?.trim() || !unit?.trim()) {
      return res.status(400).json({ error: "branchId, name and unit are required" });
    }

    const [created] = await db
      .insert(semiFinishedTable)
      .values({
        branchId,
        name: name.trim(),
        unit: unit.trim(),
        yieldQuantity: yieldQuantity ? String(yieldQuantity) : "1",
        yieldUnit: yieldUnit?.trim() || unit.trim(),
        trackInShift: trackInShift !== undefined ? trackInShift : true,
      })
      .returning();

    return res.status(201).json(serialize(created, 0));
  } catch (error) {
    console.error("POST /semi-finished error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/semi-finished/:id
router.patch("/semi-finished/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { name, unit, yieldQuantity, yieldUnit, trackInShift } = req.body as {
      name?: string;
      unit?: string;
      yieldQuantity?: number;
      yieldUnit?: string;
      trackInShift?: boolean;
    };

    const update: Record<string, any> = {};
    if (name !== undefined) update["name"] = name.trim();
    if (unit !== undefined) update["unit"] = unit.trim();
    if (yieldQuantity !== undefined) update["yieldQuantity"] = String(yieldQuantity);
    if (yieldUnit !== undefined) update["yieldUnit"] = yieldUnit.trim();
    if (trackInShift !== undefined) update["trackInShift"] = trackInShift;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [updated] = await db
      .update(semiFinishedTable)
      .set(update)
      .where(eq(semiFinishedTable.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json(serialize(updated, 0));
  } catch (error) {
    console.error("PATCH /semi-finished error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/semi-finished/:id
router.delete("/semi-finished/:id", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    await db.delete(semiFinishedTable).where(eq(semiFinishedTable.id, id));
    return res.status(204).send();
  } catch (error) {
    console.error("DELETE /semi-finished error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// PRODUCTION ENDPOINT — HPP dihitung dari hasil timbangan riil
// ============================================================
router.post("/semi-finished/:id/produce", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const { producedWeight } = req.body as {
    producedWeight: number;
  };

  if (!producedWeight || producedWeight <= 0) {
    return res.status(400).json({ error: "Hasil timbangan harus lebih dari 0" });
  }

  try {
    await db.transaction(async (tx: Executor) => {
      // 1. Ambil data semi finished
      const [sf] = await tx
        .select()
        .from(semiFinishedTable)
        .where(eq(semiFinishedTable.id, id));
      if (!sf) throw new Error("Not found");

      // Check branch access
      if (sf.branchId && !(await canAccessBranch(req as any, sf.branchId))) {
        throw new Error("Forbidden branch");
      }

      const branchId = sf.branchId!;

      // 2. Ambil resep (BOM) dari semi_finished ini
      const recipe = await getRecipeRows(tx, "semi_finished", id);

      if (recipe.length === 0) {
        throw new Error("Resep belum diisi. Silakan isi BOM terlebih dahulu.");
      }

      // 3. Validasi ketersediaan stok bahan baku sebelum dikurangi (Guard Rail)
      for (const r of recipe) {
        const currentStock = await getInventoryStock(tx, branchId, r.componentType, r.componentId);
        if (currentStock < r.quantity) {
          let name = `ID ${r.componentId}`;
          if (r.componentType === "ingredient") {
            const [ing] = await tx.select({ name: ingredientsTable.name }).from(ingredientsTable).where(eq(ingredientsTable.id, r.componentId));
            if (ing) name = ing.name;
          } else {
            const [sfComp] = await tx.select({ name: semiFinishedTable.name }).from(semiFinishedTable).where(eq(semiFinishedTable.id, r.componentId));
            if (sfComp) name = sfComp.name;
          }
          throw new Error(`Stok bahan baku "${name}" tidak mencukupi! Dibutuhkan ${r.quantity}, tapi sisa stok hanya ${currentStock}. Silakan isi stok terlebih dahulu.`);
        }
      }

      // 4. Hitung total biaya bahan baku yang terpakai (untuk 1 batch) dan kurangi stok
      let totalCost = 0;
      for (const r of recipe) {
        const componentCost = await getComponentCost(tx, r.componentType, r.componentId);
        totalCost += componentCost * r.quantity;
        
        // Kurangi stok bahan baku
        await adjustInventory(tx, branchId, r.componentType, r.componentId, -r.quantity);
      }

      // 5. Hitung HPP baru berdasarkan hasil timbangan riil
      const newHpp = totalCost / producedWeight;

      // 6. Ambil stok lama sebelum ditambah untuk perhitungan moving average
      const oldStock = await getCurrentStock(tx, branchId, id);

      // 7. Tambah stok setengah jadi sebesar hasil timbangan
      await adjustInventory(tx, branchId, "semi_finished", id, producedWeight);

      // 8. Update costPricePerUnit dengan HPP yang baru (moving average)
      const oldTotalValue = (parseFloat(sf.costPricePerUnit) || 0) * oldStock;
      const newTotalValue = newHpp * producedWeight;
      const avgHpp = (oldTotalValue + newTotalValue) / (oldStock + producedWeight);
      
      await tx
        .update(semiFinishedTable)
        .set({ costPricePerUnit: String(avgHpp) })
        .where(eq(semiFinishedTable.id, id));
    });

    return res.json({ 
      success: true, 
      producedWeight,
      message: "Produksi berhasil, HPP dihitung dari hasil timbangan"
    });
  } catch (error: any) {
    console.error("Production error:", error);
    if (error.message === "Not found") {
      return res.status(404).json({ error: "Item setengah jadi tidak ditemukan" });
    }
    if (error.message.includes("tidak mencukupi") || error.message.includes("Resep belum diisi")) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Gagal produksi: " + error.message });
  }
});

// Helper: ambil stok saat ini
async function getCurrentStock(
  tx: Executor,
  branchId: number,
  itemId: number
): Promise<number> {
  const [stock] = await tx
    .select({ currentStock: currentInventoryTable.currentStock })
    .from(currentInventoryTable)
    .where(
      and(
        eq(currentInventoryTable.itemType, "semi_finished"),
        eq(currentInventoryTable.itemId, itemId),
        eq(currentInventoryTable.branchId, branchId)
      )
    );
  return stock ? parseFloat(stock.currentStock) : 0;
}

export default router;
