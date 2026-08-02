import { db, accountingPeriodsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Updating accounting periods...");
  await db.update(accountingPeriodsTable)
    .set({ status: "CLOSED", closedAt: new Date() })
    .where(eq(accountingPeriodsTable.name, "July 2026"));

  const startOfAug = new Date("2026-08-01T00:00:00Z");
  const endOfAug = new Date("2026-08-31T23:59:59Z");

  const [aug] = await db.insert(accountingPeriodsTable).values({
    name: "August 2026",
    startDate: startOfAug,
    endDate: endOfAug,
    status: "OPEN",
  }).returning();

  console.log("August 2026 Period created:", aug);
  process.exit(0);
}

main().catch(err => {
  console.error("Failed to update periods:", err);
  process.exit(1);
});
