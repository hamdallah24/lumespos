import { pgTable, bigserial, text, integer, date, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";
import { positionsTable } from "./positions";

export const jobPostingsTable = pgTable("job_postings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  positionId: integer("position_id").references(() => positionsTable.id, { onDelete: "set null" }),
  departmentId: integer("department_id"),
  branchId: integer("branch_id"),
  employmentType: text("employment_type").notNull().default("full_time"),
  description: text("description"),
  requirements: text("requirements"),
  salaryRange: text("salary_range"),
  status: text("status").notNull().default("draft"), // draft | open | closed | filled
  openings: integer("openings").notNull().default(1),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const CANDIDATE_STATUSES = [
  "applied", "screening", "interview_scheduled", "interviewed",
  "offer_pending", "offer_extended", "hired", "rejected", "withdrawn",
] as const;

export const candidatesTable = pgTable("candidates", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  jobPostingId: integer("job_posting_id").references(() => jobPostingsTable.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  source: text("source"), // referral | job_board | website | social | walk_in
  status: text("status").notNull().default("applied"),
  rating: integer("rating"), // 1-5
  notes: text("notes"),
  rejectReason: text("reject_reason"),
  hiredEmployeeId: integer("hired_employee_id").references(() => employeesTable.id, { onDelete: "set null" }),
  appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow(),
  hiredAt: timestamp("hired_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interviewsTable = pgTable("interviews", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidatesTable.id, { onDelete: "cascade" }),
  interviewerId: integer("interviewer_id").references(() => employeesTable.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  duration: integer("duration").default(60), // minutes
  interviewType: text("interview_type").notNull().default("phone"), // phone | video | onsite | technical
  status: text("status").notNull().default("scheduled"), // scheduled | completed | cancelled | no_show
  feedback: text("feedback"),
  recommendation: text("recommendation"), // strong_hire | hire | maybe | no_hire | strong_no_hire
  score: integer("score"), // 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JobPosting = typeof jobPostingsTable.$inferSelect;
export type Candidate = typeof candidatesTable.$inferSelect;
export type Interview = typeof interviewsTable.$inferSelect;
