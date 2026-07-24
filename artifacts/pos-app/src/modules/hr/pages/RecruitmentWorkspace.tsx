import { useState, useMemo } from "react";
import { Briefcase, Users, Calendar, BarChart3, Star, Plus, ChevronDown, ChevronRight, X } from "lucide-react";
import {
  useJobPostings, useCandidates, useInterviews, useRecruitmentAnalytics,
  useCreateJobPosting, useTransitionJobPosting,
  useCreateCandidate, useTransitionCandidate, useRateCandidate,
  useCreateInterview, useCompleteInterview,
  useEmployees, useDepartments,
} from "../hooks/useHr";
import { useBranch } from "@/lib/branch";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvEmptyState } from "@/lib/inventory/InventoryComponents";
import { Button } from "@/components/ui/button";
import type { JobPosting, Candidate, Interview } from "../types";

type Tab = "pipeline" | "candidates" | "interviews" | "analytics";

const PIPELINE_STAGES = [
  { key: "applied", label: "Applied", color: "bg-blue-500/20 text-blue-300" },
  { key: "screening", label: "Screening", color: "bg-cyan-500/20 text-cyan-300" },
  { key: "interview_scheduled", label: "Interview", color: "bg-amber-500/20 text-amber-300" },
  { key: "interviewed", label: "Interviewed", color: "bg-violet-500/20 text-violet-300" },
  { key: "offer_pending", label: "Offer Pending", color: "bg-orange-500/20 text-orange-300" },
  { key: "hired", label: "Hired", color: "bg-emerald-500/20 text-emerald-300" },
];
const CANDIDATE_STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-500/15 text-blue-400", screening: "bg-cyan-500/15 text-cyan-400",
  interview_scheduled: "bg-amber-500/15 text-amber-400", interviewed: "bg-violet-500/15 text-violet-400",
  offer_pending: "bg-orange-500/15 text-orange-400", offer_extended: "bg-orange-500/15 text-orange-400",
  hired: "bg-emerald-500/15 text-emerald-400", rejected: "bg-rose-500/15 text-rose-400",
  withdrawn: "bg-white/10 text-white/40",
};
const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral", job_board: "Job Board", website: "Website", social: "Social Media", walk_in: "Walk-in",
};

export default function RecruitmentWorkspace() {
  const { branchId } = useBranch();
  const [tab, setTab] = useState<Tab>("pipeline");

  const { data: jobs } = useJobPostings(branchId);
  const { data: candidateResult } = useCandidates({ limit: 100 });
  const { data: interviews } = useInterviews();
  const { data: analytics } = useRecruitmentAnalytics();
  const { data: employees } = useEmployees(branchId);
  const { data: departments } = useDepartments(branchId);

  const createJob = useCreateJobPosting();
  const transitionJob = useTransitionJobPosting();
  const createCandidate = useCreateCandidate();
  const transitionCandidate = useTransitionCandidate();
  const rateCandidateMut = useRateCandidate();
  const createInterviewMut = useCreateInterview();
  const completeInterviewMut = useCompleteInterview();

  const [showJobForm, setShowJobForm] = useState(false);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState<number | null>(null);
  const [jobForm, setJobForm] = useState({ title: "", description: "", openings: "1", employmentType: "full_time" });
  const [candidateForm, setCandidateForm] = useState({ fullName: "", email: "", phone: "", source: "website", jobPostingId: "" });
  const [interviewForm, setInterviewForm] = useState({ interviewerId: "", scheduledAt: "", duration: "60", interviewType: "video" });

  const candidates = candidateResult?.data || [];

  const pipelineMap = useMemo(() => {
    const map: Record<string, Candidate[]> = {};
    for (const s of PIPELINE_STAGES) map[s.key] = [];
    for (const c of candidates) {
      if (map[c.status]) map[c.status].push(c);
    }
    return map;
  }, [candidates]);

  const employeeMap = useMemo(() => {
    if (!employees) return new Map<number, string>();
    return new Map(employees.map((e: any) => [e.id, e.fullName]));
  }, [employees]);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "pipeline", label: "Pipeline", icon: Briefcase },
    { key: "candidates", label: "Kandidat", icon: Users },
    { key: "interviews", label: "Wawancara", icon: Calendar },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  const handleCreateJob = () => {
    if (!jobForm.title) return;
    createJob.mutate({
      title: jobForm.title, description: jobForm.description,
      openings: Number(jobForm.openings), employmentType: jobForm.employmentType,
    });
    setJobForm({ title: "", description: "", openings: "1", employmentType: "full_time" });
    setShowJobForm(false);
  };

  const handleCreateCandidate = () => {
    if (!candidateForm.fullName) return;
    createCandidate.mutate({
      fullName: candidateForm.fullName, email: candidateForm.email,
      phone: candidateForm.phone, source: candidateForm.source,
      jobPostingId: candidateForm.jobPostingId ? Number(candidateForm.jobPostingId) : undefined,
    });
    setCandidateForm({ fullName: "", email: "", phone: "", source: "website", jobPostingId: "" });
    setShowCandidateForm(false);
  };

  const handleCreateInterview = (candidateId: number) => {
    if (!interviewForm.scheduledAt) return;
    createInterviewMut.mutate({
      candidateId, interviewerId: interviewForm.interviewerId ? Number(interviewForm.interviewerId) : undefined,
      scheduledAt: interviewForm.scheduledAt, duration: Number(interviewForm.duration),
      interviewType: interviewForm.interviewType,
    });
    setInterviewForm({ interviewerId: "", scheduledAt: "", duration: "60", interviewType: "video" });
    setShowInterviewForm(null);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <InvSectionHeader icon={Briefcase} title="Recruitment" subtitle={`${jobs?.length || 0} lowongan, ${candidates.length} kandidat`} />
        <div className="flex gap-2">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs min-h-10"
            onClick={() => setShowJobForm(true)}>
            <Plus size={14} className="mr-1" /> Lowongan
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs min-h-10"
            onClick={() => setShowCandidateForm(true)}>
            <Plus size={14} className="mr-1" /> Kandidat
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <InvKpiCard title="Lowongan Aktif" value={analytics?.jobStats?.open || 0} icon={Briefcase} color="bg-blue-500/15 text-blue-400" />
        <InvKpiCard title="Total Kandidat" value={analytics?.pipeline?.total || 0} icon={Users} color="bg-violet-500/15 text-violet-400" />
        <InvKpiCard title="Hired" value={analytics?.pipeline?.hired || 0} icon={Star} color="bg-emerald-500/15 text-emerald-400" />
        <InvKpiCard title="Avg Rating" value={`${analytics?.avgRating || 0}★`} icon={Star} color="bg-amber-500/15 text-amber-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-10 flex-shrink-0 ${
              tab === t.key ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/60"
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Create Job Form */}
      {showJobForm && (
        <InvGlassCard>
          <InvSectionHeader icon={Plus} title="Lowongan Baru" />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Judul lowongan" value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <input placeholder="Jumlah posisi" type="number" value={jobForm.openings} onChange={e => setJobForm(f => ({ ...f, openings: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <textarea placeholder="Deskripsi" value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 sm:col-span-2 min-h-[60px]" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs min-h-10" onClick={handleCreateJob} disabled={createJob.isPending}>Simpan</Button>
            <Button size="sm" variant="ghost" className="text-white/50 text-xs min-h-10" onClick={() => setShowJobForm(false)}>Batal</Button>
          </div>
        </InvGlassCard>
      )}

      {/* Create Candidate Form */}
      {showCandidateForm && (
        <InvGlassCard>
          <InvSectionHeader icon={Plus} title="Kandidat Baru" />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Nama lengkap" value={candidateForm.fullName} onChange={e => setCandidateForm(f => ({ ...f, fullName: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <input placeholder="Email" value={candidateForm.email} onChange={e => setCandidateForm(f => ({ ...f, email: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <input placeholder="Telepon" value={candidateForm.phone} onChange={e => setCandidateForm(f => ({ ...f, phone: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <select value={candidateForm.source} onChange={e => setCandidateForm(f => ({ ...f, source: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10">
              <option value="referral">Referral</option>
              <option value="job_board">Job Board</option>
              <option value="website">Website</option>
              <option value="social">Social Media</option>
              <option value="walk_in">Walk-in</option>
            </select>
            <select value={candidateForm.jobPostingId} onChange={e => setCandidateForm(f => ({ ...f, jobPostingId: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10">
              <option value="">Tanpa Lowongan</option>
              {(jobs || []).map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs min-h-10" onClick={handleCreateCandidate} disabled={createCandidate.isPending}>Simpan</Button>
            <Button size="sm" variant="ghost" className="text-white/50 text-xs min-h-10" onClick={() => setShowCandidateForm(false)}>Batal</Button>
          </div>
        </InvGlassCard>
      )}

      {/* PIPELINE TAB */}
      {tab === "pipeline" && (
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-[700px]">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.key} className="flex-1 min-w-[140px]">
                <div className={`rounded-t-lg px-3 py-2 text-xs font-medium ${stage.color}`}>
                  {stage.label} ({pipelineMap[stage.key]?.length || 0})
                </div>
                <div className="space-y-1 bg-white/[0.02] rounded-b-lg p-1 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {(pipelineMap[stage.key] || []).map((c: Candidate) => (
                    <div key={c.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
                      <div className="font-medium text-white/70">{c.fullName}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{c.jobTitle || "Umum"}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-white/20">{SOURCE_LABELS[c.source || ""] || c.source}</span>
                        {c.rating && <span className="text-amber-400 text-[10px]">{"★".repeat(c.rating)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CANDIDATES TAB */}
      {tab === "candidates" && (
        <InvGlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/[0.05]">
                  <th className="text-left py-2 px-2 font-medium">Nama</th>
                  <th className="text-left py-2 px-2 font-medium">Lowongan</th>
                  <th className="text-left py-2 px-2 font-medium">Sumber</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-left py-2 px-2 font-medium">Rating</th>
                  <th className="text-right py-2 px-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c: Candidate) => (
                  <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-white/70">{c.fullName}</td>
                    <td className="py-2 px-2 text-white/50">{c.jobTitle || "-"}</td>
                    <td className="py-2 px-2 text-white/40 text-[10px]">{SOURCE_LABELS[c.source || ""] || c.source}</td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CANDIDATE_STATUS_COLORS[c.status] || "text-white/30"}`}>{c.status}</span>
                    </td>
                    <td className="py-2 px-2 text-amber-400">{c.rating ? "★".repeat(c.rating) : "-"}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex gap-1 justify-end">
                        {c.status === "applied" && (
                          <Button size="sm" className="h-6 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white"
                            onClick={() => transitionCandidate.mutate({ id: c.id, status: "screening" })}>Screen</Button>
                        )}
                        {c.status === "screening" && (
                          <Button size="sm" className="h-6 text-[10px] bg-amber-600 hover:bg-amber-500 text-white"
                            onClick={() => setShowInterviewForm(c.id)}>Interview</Button>
                        )}
                        {c.status === "interviewed" && (
                          <>
                            <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"
                              onClick={() => transitionCandidate.mutate({ id: c.id, status: "offer_pending" })}>Offer</Button>
                            <Button size="sm" className="h-6 text-[10px] bg-rose-600 hover:bg-rose-500 text-white"
                              onClick={() => transitionCandidate.mutate({ id: c.id, status: "rejected" })}>Reject</Button>
                          </>
                        )}
                        {c.status === "offer_pending" && (
                          <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={() => transitionCandidate.mutate({ id: c.id, status: "hired" })}>Hire</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InvGlassCard>
      )}

      {/* Interview Form Modal */}
      {showInterviewForm && (
        <InvGlassCard>
          <InvSectionHeader icon={Calendar} title={`Jadwalkan Wawancara — Kandidat #${showInterviewForm}`} />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={interviewForm.interviewerId} onChange={e => setInterviewForm(f => ({ ...f, interviewerId: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10">
              <option value="">Pilih Interviewer</option>
              {(employees || []).map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
            <input type="datetime-local" value={interviewForm.scheduledAt} onChange={e => setInterviewForm(f => ({ ...f, scheduledAt: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <select value={interviewForm.interviewType} onChange={e => setInterviewForm(f => ({ ...f, interviewType: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10">
              <option value="phone">Phone</option>
              <option value="video">Video</option>
              <option value="onsite">Onsite</option>
              <option value="technical">Technical</option>
            </select>
            <input type="number" placeholder="Durasi (menit)" value={interviewForm.duration} onChange={e => setInterviewForm(f => ({ ...f, duration: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs min-h-10"
              onClick={() => showInterviewForm && handleCreateInterview(showInterviewForm)} disabled={createInterviewMut.isPending}>Jadwalkan</Button>
            <Button size="sm" variant="ghost" className="text-white/50 text-xs min-h-10" onClick={() => setShowInterviewForm(null)}>Batal</Button>
          </div>
        </InvGlassCard>
      )}

      {/* INTERVIEWS TAB */}
      {tab === "interviews" && (
        <InvGlassCard>
          <InvSectionHeader icon={Calendar} title="Jadwal Wawancara" subtitle={`${(interviews as any[] || []).length} total`} />
          <div className="mt-3 space-y-2">
            {(interviews as any[] || []).length > 0 ? (interviews as any[]).map((iv: any) => (
              <div key={iv.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-sm flex-shrink-0">
                    {(iv.candidateName || "#").charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm text-white/70">{iv.candidateName || `#${iv.candidateId}`}</span>
                    <div className="text-[10px] text-white/30">
                      {new Date(iv.scheduledAt).toLocaleString("id-ID")} · {iv.duration}m · {iv.interviewType}
                      {iv.interviewerName && ` · ${iv.interviewerName}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    iv.status === "scheduled" ? "bg-amber-500/15 text-amber-400" :
                    iv.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                    "bg-white/10 text-white/40"
                  }`}>{iv.status}</span>
                  {iv.status === "scheduled" && (
                    <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => completeInterviewMut.mutate({ id: iv.id, recommendation: "hire" })}>Selesai</Button>
                  )}
                  {iv.recommendation && (
                    <span className="text-[10px] text-white/30">{iv.recommendation}</span>
                  )}
                </div>
              </div>
            )) : <InvEmptyState icon={Calendar} title="Belum ada wawancara" description="Jadwalkan wawancara dari tab Kandidat" />}
          </div>
        </InvGlassCard>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <InvKpiCard title="Applied" value={analytics.pipeline.applied} icon={Briefcase} color="bg-blue-500/15 text-blue-400" />
            <InvKpiCard title="Interviewed" value={analytics.pipeline.interviewed} icon={Calendar} color="bg-violet-500/15 text-violet-400" />
            <InvKpiCard title="Hired" value={analytics.pipeline.hired} icon={Star} color="bg-emerald-500/15 text-emerald-400" />
            <InvKpiCard title="Rejected" value={analytics.pipeline.rejected} icon={X} color="bg-rose-500/15 text-rose-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pipeline Funnel */}
            <InvGlassCard>
              <InvSectionHeader icon={Briefcase} title="Pipeline Funnel" />
              <div className="mt-3 space-y-2">
                {PIPELINE_STAGES.map(stage => {
                  const val = analytics.pipeline[stage.key as keyof typeof analytics.pipeline] || 0;
                  const pct = analytics.pipeline.total ? Math.round((val / analytics.pipeline.total) * 100) : 0;
                  return (
                    <div key={stage.key} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-20 truncate">{stage.label}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stage.color.split(" ")[0]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-white/30 w-8 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            </InvGlassCard>

            {/* By Source */}
            <InvGlassCard>
              <InvSectionHeader icon={Users} title="Sumber Kandidat" />
              <div className="mt-3 space-y-2">
                {Object.entries(SOURCE_LABELS).map(([key, label]) => {
                  const val = analytics.bySource[key as keyof typeof analytics.bySource] || 0;
                  const total = analytics.pipeline.total || 1;
                  const pct = Math.round((val / total) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-20 truncate">{label}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-violet-400/50" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-white/30 w-8 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            </InvGlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
