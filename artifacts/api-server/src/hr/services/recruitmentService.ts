import { db, jobPostingsTable, candidatesTable, interviewsTable, employeesTable, positionsTable } from "@workspace/db";
import { eq, and, sql, desc, asc, gte, lte, count } from "drizzle-orm";
import { publishHrEvent } from "../events/hrEventPublisher";

/* ── Job Postings ── */

export async function createJobPosting(data: {
  title: string; positionId?: number; departmentId?: number; branchId?: number;
  employmentType?: string; description?: string; requirements?: string;
  salaryRange?: string; openings?: number; createdBy?: number;
}) {
  const [job] = await db.insert(jobPostingsTable).values({
    title: data.title, positionId: data.positionId, departmentId: data.departmentId,
    branchId: data.branchId, employmentType: data.employmentType || "full_time",
    description: data.description, requirements: data.requirements,
    salaryRange: data.salaryRange, openings: data.openings || 1,
    createdBy: data.createdBy, status: "draft",
  }).returning();
  await publishHrEvent("recruitment.job_created", "job_posting", job.id, { title: data.title }, { source: "createJobPosting" });
  return job;
}

export async function getJobPostings(branchId?: number, status?: string) {
  const conditions: any[] = [];
  if (branchId) conditions.push(eq(jobPostingsTable.branchId, branchId));
  if (status) conditions.push(eq(jobPostingsTable.status, status));

  return db.select({
    id: jobPostingsTable.id,
    title: jobPostingsTable.title,
    positionId: jobPostingsTable.positionId,
    positionTitle: positionsTable.title,
    departmentId: jobPostingsTable.departmentId,
    branchId: jobPostingsTable.branchId,
    employmentType: jobPostingsTable.employmentType,
    status: jobPostingsTable.status,
    openings: jobPostingsTable.openings,
    postedAt: jobPostingsTable.postedAt,
    createdAt: jobPostingsTable.createdAt,
    candidateCount: sql<number>`(select count(*)::int from ${candidatesTable} where ${candidatesTable.jobPostingId} = ${jobPostingsTable.id})`,
  })
    .from(jobPostingsTable)
    .leftJoin(positionsTable, eq(jobPostingsTable.positionId, positionsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobPostingsTable.createdAt));
}

export async function transitionJobPosting(id: number, newStatus: string) {
  const [job] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  if (!job) throw new Error("Job posting not found");

  const updateData: any = { status: newStatus };
  if (newStatus === "open") updateData.postedAt = new Date();
  if (newStatus === "closed") updateData.closedAt = new Date();

  const [updated] = await db.update(jobPostingsTable).set(updateData).where(eq(jobPostingsTable.id, id)).returning();
  await publishHrEvent("recruitment.job_status_changed", "job_posting", id, { oldStatus: job.status, newStatus }, { source: "transitionJobPosting" });
  return updated;
}

/* ── Candidates ── */

export async function createCandidate(data: {
  jobPostingId?: number; fullName: string; email?: string; phone?: string;
  resumeUrl?: string; source?: string; notes?: string;
}) {
  const [candidate] = await db.insert(candidatesTable).values({
    jobPostingId: data.jobPostingId, fullName: data.fullName, email: data.email,
    phone: data.phone, resumeUrl: data.resumeUrl, source: data.source,
    notes: data.notes, status: "applied",
  }).returning();
  await publishHrEvent("recruitment.candidate_applied", "candidate", candidate.id, { fullName: data.fullName }, { source: "createCandidate" });
  return candidate;
}

export async function getCandidates(opts: {
  jobPostingId?: number; status?: string; source?: string;
  page?: number; limit?: number;
}) {
  const { jobPostingId, status, source, page = 1, limit = 50 } = opts;
  const conditions: any[] = [];
  if (jobPostingId) conditions.push(eq(candidatesTable.jobPostingId, jobPostingId));
  if (status) conditions.push(eq(candidatesTable.status, status));
  if (source) conditions.push(eq(candidatesTable.source, source));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(candidatesTable).where(where);

  const rows = await db.select({
    id: candidatesTable.id,
    fullName: candidatesTable.fullName,
    email: candidatesTable.email,
    phone: candidatesTable.phone,
    jobPostingId: candidatesTable.jobPostingId,
    jobTitle: jobPostingsTable.title,
    source: candidatesTable.source,
    status: candidatesTable.status,
    rating: candidatesTable.rating,
    notes: candidatesTable.notes,
    rejectReason: candidatesTable.rejectReason,
    hiredEmployeeId: candidatesTable.hiredEmployeeId,
    appliedAt: candidatesTable.appliedAt,
    hiredAt: candidatesTable.hiredAt,
    createdAt: candidatesTable.createdAt,
  })
    .from(candidatesTable)
    .leftJoin(jobPostingsTable, eq(candidatesTable.jobPostingId, jobPostingsTable.id))
    .where(where)
    .orderBy(desc(candidatesTable.createdAt))
    .limit(limit).offset((page - 1) * limit);

  return { data: rows, total: cnt, page, limit, pages: Math.ceil(cnt / limit) };
}

export async function transitionCandidate(id: number, newStatus: string, notes?: string) {
  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id));
  if (!candidate) throw new Error("Candidate not found");

  const updateData: any = { status: newStatus };
  if (notes) updateData.notes = notes;
  if (newStatus === "hired") updateData.hiredAt = new Date();
  if (newStatus === "rejected" && notes) updateData.rejectReason = notes;

  const [updated] = await db.update(candidatesTable).set(updateData).where(eq(candidatesTable.id, id)).returning();
  await publishHrEvent("recruitment.candidate_status_changed", "candidate", id, { oldStatus: candidate.status, newStatus }, { source: "transitionCandidate" });
  return updated;
}

export async function rateCandidate(id: number, rating: number) {
  if (rating < 1 || rating > 5) throw new Error("Rating must be 1-5");
  const [updated] = await db.update(candidatesTable).set({ rating }).where(eq(candidatesTable.id, id)).returning();
  return updated;
}

/* ── Interviews ── */

export async function createInterview(data: {
  candidateId: number; interviewerId?: number; scheduledAt: string;
  duration?: number; interviewType?: string;
}) {
  const [interview] = await db.insert(interviewsTable).values({
    candidateId: data.candidateId, interviewerId: data.interviewerId,
    scheduledAt: new Date(data.scheduledAt), duration: data.duration || 60,
    interviewType: data.interviewType || "phone", status: "scheduled",
  }).returning();

  // Update candidate status to interview_scheduled
  await db.update(candidatesTable).set({ status: "interview_scheduled" }).where(eq(candidatesTable.id, data.candidateId));
  await publishHrEvent("recruitment.interview_scheduled", "interview", interview.id, { candidateId: data.candidateId }, { source: "createInterview" });
  return interview;
}

export async function getInterviews(candidateId?: number, status?: string) {
  const conditions: any[] = [];
  if (candidateId) conditions.push(eq(interviewsTable.candidateId, candidateId));
  if (status) conditions.push(eq(interviewsTable.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select({
    id: interviewsTable.id,
    candidateId: interviewsTable.candidateId,
    candidateName: candidatesTable.fullName,
    interviewerId: interviewsTable.interviewerId,
    interviewerName: employeesTable.fullName,
    scheduledAt: interviewsTable.scheduledAt,
    duration: interviewsTable.duration,
    interviewType: interviewsTable.interviewType,
    status: interviewsTable.status,
    feedback: interviewsTable.feedback,
    recommendation: interviewsTable.recommendation,
    score: interviewsTable.score,
    createdAt: interviewsTable.createdAt,
  })
    .from(interviewsTable)
    .leftJoin(candidatesTable, eq(interviewsTable.candidateId, candidatesTable.id))
    .leftJoin(employeesTable, eq(interviewsTable.interviewerId, employeesTable.id))
    .where(where)
    .orderBy(asc(interviewsTable.scheduledAt));
}

export async function completeInterview(id: number, data: {
  feedback?: string; recommendation?: string; score?: number;
}) {
  const [updated] = await db.update(interviewsTable).set({
    status: "completed", feedback: data.feedback,
    recommendation: data.recommendation, score: data.score,
  }).where(eq(interviewsTable.id, id)).returning();

  // Update candidate to interviewed
  if (updated) {
    await db.update(candidatesTable).set({ status: "interviewed" }).where(eq(candidatesTable.id, updated.candidateId));
  }

  await publishHrEvent("recruitment.interview_completed", "interview", id, { recommendation: data.recommendation, score: data.score }, { source: "completeInterview" });
  return updated;
}

export async function cancelInterview(id: number) {
  const [updated] = await db.update(interviewsTable).set({ status: "cancelled" }).where(eq(interviewsTable.id, id)).returning();
  return updated;
}

/* ── Analytics ── */

export async function getRecruitmentAnalytics() {
  const [pipeline] = await db.select({
    total: sql<number>`count(*)::int`,
    applied: sql<number>`count(*) filter (where ${candidatesTable.status} = 'applied')::int`,
    screening: sql<number>`count(*) filter (where ${candidatesTable.status} = 'screening')::int`,
    interviewScheduled: sql<number>`count(*) filter (where ${candidatesTable.status} = 'interview_scheduled')::int`,
    interviewed: sql<number>`count(*) filter (where ${candidatesTable.status} = 'interviewed')::int`,
    offerPending: sql<number>`count(*) filter (where ${candidatesTable.status} = 'offer_pending')::int`,
    hired: sql<number>`count(*) filter (where ${candidatesTable.status} = 'hired')::int`,
    rejected: sql<number>`count(*) filter (where ${candidatesTable.status} = 'rejected')::int`,
  }).from(candidatesTable);

  const [bySource] = await db.select({
    referral: sql<number>`count(*) filter (where ${candidatesTable.source} = 'referral')::int`,
    jobBoard: sql<number>`count(*) filter (where ${candidatesTable.source} = 'job_board')::int`,
    website: sql<number>`count(*) filter (where ${candidatesTable.source} = 'website')::int`,
    social: sql<number>`count(*) filter (where ${candidatesTable.source} = 'social')::int`,
    walkIn: sql<number>`count(*) filter (where ${candidatesTable.source} = 'walk_in')::int`,
  }).from(candidatesTable);

  const [avgRating] = await db.select({
    avg: sql<number>`coalesce(avg(${candidatesTable.rating}), 0)::int`,
  }).from(candidatesTable).where(sql`${candidatesTable.rating} IS NOT NULL`);

  const [jobStats] = await db.select({
    total: sql<number>`count(*)::int`,
    open: sql<number>`count(*) filter (where ${jobPostingsTable.status} = 'open')::int`,
    draft: sql<number>`count(*) filter (where ${jobPostingsTable.status} = 'draft')::int`,
    closed: sql<number>`count(*) filter (where ${jobPostingsTable.status} = 'closed')::int`,
  }).from(jobPostingsTable);

  return { pipeline: pipeline!, bySource: bySource!, avgRating: avgRating?.avg || 0, jobStats: jobStats! };
}
