import {
  pgTable,
  serial,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const userBranchesTable = pgTable(
  "user_branches",
  {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
      }),

    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userBranchUnique: unique("user_branches_user_branch_unique").on(
      table.userId,
      table.branchId,
    ),
  }),
);

export type UserBranch = typeof userBranchesTable.$inferSelect;
export type NewUserBranch = typeof userBranchesTable.$inferInsert;