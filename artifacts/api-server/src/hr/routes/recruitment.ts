import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  createJobPosting, getJobPostings, transitionJobPosting,
  createCandidate, getCandidates, transitionCandidate, rateCandidate,
  createInterview, getInterviews, completeInterview, cancelInterview,
  getRecruitmentAnalytics,
} from "../services/recruitmentService";

const router = Router();

/* ── Job Postings ── */
router.post("/hr/recruitment/jobs", requireAuth, async (req, res) => {
  try {
    const { title, positionId, departmentId, branchId, employmentType, description, requirements, salaryRange, openings } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const job = await createJobPosting({
      title, positionId: positionId ? Number(positionId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      branchId: branchId ? Number(branchId) : undefined,
      employmentType, description, requirements, salaryRange,
      openings: openings ? Number(openings) : undefined,
      createdBy: req.user?.id ? Number(req.user.id) : undefined,
    });
    return res.status(201).json(job);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.get("/hr/recruitment/jobs", requireAuth, async (req, res) => {
  try {
    const { branchId, status } = req.query;
    const jobs = await getJobPostings(branchId ? Number(branchId) : undefined, status as string | undefined);
    return res.json(jobs);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/hr/recruitment/jobs/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });
    const job = await transitionJobPosting(Number(req.params.id), status);
    return res.json(job);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Candidates ── */
router.post("/hr/recruitment/candidates", requireAuth, async (req, res) => {
  try {
    const { jobPostingId, fullName, email, phone, resumeUrl, source, notes } = req.body;
    if (!fullName) return res.status(400).json({ error: "fullName required" });
    const candidate = await createCandidate({ jobPostingId: jobPostingId ? Number(jobPostingId) : undefined, fullName, email, phone, resumeUrl, source, notes });
    return res.status(201).json(candidate);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.get("/hr/recruitment/candidates", requireAuth, async (req, res) => {
  try {
    const { jobPostingId, status, source, page, limit } = req.query;
    const result = await getCandidates({
      jobPostingId: jobPostingId ? Number(jobPostingId) : undefined,
      status: status as string | undefined,
      source: source as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return res.json(result);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/hr/recruitment/candidates/:id/status", requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });
    const candidate = await transitionCandidate(Number(req.params.id), status, notes);
    return res.json(candidate);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.patch("/hr/recruitment/candidates/:id/rate", requireAuth, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating) return res.status(400).json({ error: "rating required" });
    const candidate = await rateCandidate(Number(req.params.id), Number(rating));
    return res.json(candidate);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Interviews ── */
router.post("/hr/recruitment/interviews", requireAuth, async (req, res) => {
  try {
    const { candidateId, interviewerId, scheduledAt, duration, interviewType } = req.body;
    if (!candidateId || !scheduledAt) return res.status(400).json({ error: "candidateId and scheduledAt required" });
    const interview = await createInterview({
      candidateId: Number(candidateId), interviewerId: interviewerId ? Number(interviewerId) : undefined,
      scheduledAt, duration: duration ? Number(duration) : undefined, interviewType,
    });
    return res.status(201).json(interview);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.get("/hr/recruitment/interviews", requireAuth, async (req, res) => {
  try {
    const { candidateId, status } = req.query;
    const interviews = await getInterviews(
      candidateId ? Number(candidateId) : undefined,
      status as string | undefined,
    );
    return res.json(interviews);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/hr/recruitment/interviews/:id/complete", requireAuth, async (req, res) => {
  try {
    const { feedback, recommendation, score } = req.body;
    const interview = await completeInterview(Number(req.params.id), { feedback, recommendation, score: score ? Number(score) : undefined });
    return res.json(interview);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.patch("/hr/recruitment/interviews/:id/cancel", requireAuth, async (req, res) => {
  try {
    const interview = await cancelInterview(Number(req.params.id));
    return res.json(interview);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

/* ── Analytics ── */
router.get("/hr/recruitment/analytics", requireAuth, async (_req, res) => {
  try {
    const analytics = await getRecruitmentAnalytics();
    return res.json(analytics);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
