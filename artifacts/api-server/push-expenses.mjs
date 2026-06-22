// Quick script to push just the expenses table
// Run with: node --require dotenv/config push-expenses.mjs
import { db, expensesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const exists = await db.execute(sql`
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expenses')
`);

if (exists.rows?.[0]?.exists || exists[0]?.exists) {
  console.log("Table 'expenses' already exists");
} else {
  await db.execute(sql`
    CREATE TABLE "expenses" (
      "id" serial PRIMARY KEY NOT NULL,
      "branch_id" integer NOT NULL,
      "description" text NOT NULL,
      "amount" numeric(14, 2) DEFAULT '0' NOT NULL,
      "category" text,
      "notes" text,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`
    ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_branches_id_fk"
    FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict;
  `);
  console.log("Table 'expenses' created successfully");
}

process.exit(0);
