import { db, positionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Position, InsertPosition } from "@workspace/db";

export async function createPosition(data: InsertPosition): Promise<Position> {
  const [pos] = await db.insert(positionsTable).values(data).returning();
  return pos;
}

export async function getAllPositions(): Promise<Position[]> {
  return db.select().from(positionsTable);
}

export async function getPositionById(id: number): Promise<Position | undefined> {
  const [pos] = await db.select().from(positionsTable).where(eq(positionsTable.id, id));
  return pos;
}
