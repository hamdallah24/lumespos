import { Router } from "express";
import {
  db,
  recipesTable,
  ingredientsTable,
  semiFinishedTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

type ComponentType = "ingredient" | "semi_finished";

async function enrich(
  rows: {
    id: number;
    componentType: string;
    componentId: number;
    quantity: string;
  }[],
) {
  const ingIds = rows
    .filter((r) => r.componentType === "ingredient")
    .map((r) => r.componentId);
  const sfIds = rows
    .filter((r) => r.componentType === "semi_finished")
    .map((r) => r.componentId);

  const ings = ingIds.length
    ? await db
        .select({
          id: ingredientsTable.id,
          name: ingredientsTable.name,
          unit: ingredientsTable.unit,
        })
        .from(ingredientsTable)
        .where(inArray(ingredientsTable.id, ingIds))
    : [];
  const sfs = sfIds.length
    ? await db
        .select({
          id: semiFinishedTable.id,
          name: semiFinishedTable.name,
          unit: semiFinishedTable.unit,
        })
        .from(semiFinishedTable)
        .where(inArray(semiFinishedTable.id, sfIds))
    : [];

  const ingMap = new Map(ings.map((i) => [i.id, i]));
  const sfMap = new Map(sfs.map((s) => [s.id, s]));

  return rows.map((r) => {
    const meta =
      r.componentType === "ingredient"
        ? ingMap.get(r.componentId)
        : sfMap.get(r.componentId);
    return {
      id: r.id,
      componentType: r.componentType as ComponentType,
      componentId: r.componentId,
      componentName: meta?.name ?? "",
      unit: meta?.unit ?? "",
      quantity: parseFloat(r.quantity),
    };
  });
}

router.get("/recipes", requireAuth, async (req, res) => {
  const parentType = String(req.query["parentType"] ?? "");
  const parentId = Number(req.query["parentId"]);
  if (!parentType || !parentId) {
    res.status(400).json({ error: "parentType and parentId are required" });
    return;
  }
  const rows = await db
    .select()
    .from(recipesTable)
    .where(
      and(
        eq(recipesTable.parentType, parentType),
        eq(recipesTable.parentId, parentId),
      ),
    );
  res.json(await enrich(rows));
});

router.put("/recipes", requireRole("owner", "manager"), async (req, res) => {
  const { parentType, parentId, components } = req.body as {
    parentType: string;
    parentId: number;
    components: {
      componentType: ComponentType;
      componentId: number;
      quantity: number;
    }[];
  };
  if (!parentType || !parentId || !Array.isArray(components)) {
    res
      .status(400)
      .json({ error: "parentType, parentId and components are required" });
    return;
  }

  const rows = await db.transaction(async (tx) => {
    await tx
      .delete(recipesTable)
      .where(
        and(
          eq(recipesTable.parentType, parentType),
          eq(recipesTable.parentId, parentId),
        ),
      );
    if (components.length > 0) {
      await tx.insert(recipesTable).values(
        components.map((c) => ({
          parentType,
          parentId,
          componentType: c.componentType,
          componentId: c.componentId,
          quantity: String(c.quantity),
        })),
      );
    }
    return tx
      .select()
      .from(recipesTable)
      .where(
        and(
          eq(recipesTable.parentType, parentType),
          eq(recipesTable.parentId, parentId),
        ),
      );
  });

  res.json(await enrich(rows));
});

export default router;
