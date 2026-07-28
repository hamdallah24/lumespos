import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/csrf";
import { InvLoadingSkeleton } from "@/lib/inventory/InventoryComponents";

async function apiGet(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return { data: await res.json() };
}
async function apiPost(url: string, body: any) {
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return { data: await res.json() };
}

const STEPS = [
  { id: 1, label: "Company Profile", icon: "🏢", desc: "Nama, alamat, logo perusahaan" },
  { id: 2, label: "Branch Activation", icon: "📍", desc: "Pilih cabang yang aktif" },
  { id: 3, label: "Department Builder", icon: "🏗️", desc: "Bangun struktur departemen" },
  { id: 4, label: "Position Builder", icon: "💼", desc: "Template posisi organisasi" },
  { id: 5, label: "Organization Chart", icon: "🔗", desc: "Susun hierarki reporting" },
  { id: 6, label: "Import POS Users", icon: "👥", desc: "Map akun POS ke karyawan" },
  { id: 7, label: "Warehouse & Inventory", icon: "📦", desc: "Hubungkan gudang & stok" },
  { id: 8, label: "Finance Linking", icon: "💰", desc: "Approval level & cost center" },
  { id: 9, label: "Verification", icon: "✅", desc: "Review & finalisasi" },
  { id: 10, label: "ERP Ready!", icon: "🚀", desc: "Sistem siap digunakan" },
];

const TEMPLATES = [
  { title: "CEO", level: "executive", grade: "E", reportsTo: null, reportsToTitle: null },
  { title: "COO", level: "executive", grade: "E", reportsTo: "CEO", reportsToTitle: "CEO" },
  { title: "CFO", level: "executive", grade: "E", reportsTo: "CEO", reportsToTitle: "CEO" },
  { title: "CHRO", level: "executive", grade: "E", reportsTo: "CEO", reportsToTitle: "CEO" },
  { title: "CTO", level: "executive", grade: "E", reportsTo: "CEO", reportsToTitle: "CEO" },
  { title: "Manager", level: "manager", grade: "C", reportsTo: null, reportsToTitle: null },
  { title: "Supervisor", level: "supervisor", grade: "D", reportsTo: null, reportsToTitle: null },
  { title: "Staff", level: "staff", grade: "F", reportsTo: null, reportsToTitle: null },
  { title: "Operator", level: "operator", grade: "G", reportsTo: null, reportsToTitle: null },
  { title: "Intern", level: "intern", grade: "H", reportsTo: null, reportsToTitle: null },
];

const LEVEL_COLORS: Record<string, string> = {
  executive: "bg-amber-500/20 text-amber-300",
  director: "bg-purple-500/20 text-purple-300",
  manager: "bg-blue-500/20 text-blue-300",
  supervisor: "bg-emerald-500/20 text-emerald-300",
  staff: "bg-slate-500/20 text-slate-300",
  operator: "bg-cyan-500/20 text-cyan-300",
  intern: "bg-pink-500/20 text-pink-300",
};

interface WizardData {
  branches: { id: number; name: string; warehouseId: number | null; warehouseName: string | null; active: boolean }[];
  posUsers: { id: number; name: string; email: string; role: string; branches: number[] }[];
  departments: { id: number; name: string; code: string | null; parentId: number | null }[];
  positions: { id: number; title: string; level: string | null; departmentId: number | null }[];
  warehouses: { id: number; name: string; branchId: number | null }[];
}

export default function CompanyInitWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<WizardData | null>(null);
  const [companyProfile, setCompanyProfile] = useState({
    companyName: "", companyAddress: "", companyTimezone: "Asia/Jakarta",
    companyCurrency: "IDR", fiscalYearStart: 1, logoUrl: "",
  });
  const [activeBranches, setActiveBranches] = useState<number[]>([]);
  const [departments, setDepartments] = useState<{ name: string; code: string; parentId: number | null; sortOrder: number }[]>([]);
  const [positionTemplates, setPositionTemplates] = useState<{ title: string; level: string; grade: string; departmentName: string; reportsToTitle: string | null }[]>([]);
  const [orgChart, setOrgChart] = useState<{ positionTitle: string; reportsToTitle: string | null; departmentName: string }[]>([]);
  const [userMapping, setUserMapping] = useState<{ userId: number; name: string; positionTitle: string; departmentName: string; branchId: number }[]>([]);
  const [warehouseMapping, setWarehouseMapping] = useState<{ branchId: number; warehouseId: number; departmentName: string }[]>([]);
  const [financeMapping, setFinanceMapping] = useState<{ positionTitle: string; approvalLevel: string; costCenter: string }[]>([]);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const loadWizard = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, dataRes, stateRes] = await Promise.all([
        apiGet("/api/hr/setup/status"),
        apiGet("/api/hr/setup/data"),
        apiGet("/api/hr/setup"),
      ]);
      setData(dataRes.data);
      if (statusRes.data.step > 1) setStep(statusRes.data.step);
      if (stateRes.data.company_name) {
        setCompanyProfile({
          companyName: stateRes.data.company_name || "",
          companyAddress: stateRes.data.company_address || "",
          companyTimezone: stateRes.data.company_timezone || "Asia/Jakarta",
          companyCurrency: stateRes.data.company_currency || "IDR",
          fiscalYearStart: stateRes.data.fiscal_year_start || 1,
          logoUrl: stateRes.data.logo_url || "",
        });
      }
      if (stateRes.data.step2_data) setActiveBranches(stateRes.data.step2_data);
      if (stateRes.data.step3_data) setDepartments(stateRes.data.step3_data);
      if (stateRes.data.step4_data) setPositionTemplates(stateRes.data.step4_data);
      if (stateRes.data.step5_data) setOrgChart(stateRes.data.step5_data);
      if (stateRes.data.step6_data) setUserMapping(stateRes.data.step6_data);
      if (stateRes.data.step7_data) setWarehouseMapping(stateRes.data.step7_data);
      if (stateRes.data.step8_data) setFinanceMapping(stateRes.data.step8_data);

      generateAiSuggestions(dataRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadWizard(); }, [loadWizard]);

  const generateAiSuggestions = (d: WizardData) => {
    const s: string[] = [];
    if (d.departments.length === 0) s.push("Belum ada departemen. Mulai dengan department builder.");
    if (d.positions.length === 0) s.push("Belum ada posisi. Gunakan template untuk membuat cepat.");
    if (d.posUsers.filter(u => u.role === "cashier").length > 3) {
      s.push(`${d.posUsers.filter(u => u.role === "cashier").length} kasir aktif. Pertimbangkan tambah Supervisor.`);
    }
    if (!d.departments.find(x => x.name.toLowerCase().includes("finance"))) {
      s.push("Departemen Finance belum ada. Diperlukan untuk cost center.");
    }
    if (!d.departments.find(x => x.name.toLowerCase().includes("hr"))) {
      s.push("Departemen HR belum ada. Diperlukan untuk management karyawan.");
    }
    setAiSuggestions(s);
  };

  const saveStep = async (s: number, payload: any) => {
    setSaving(true);
    try {
      await apiPost(`/api/hr/setup/step/${s}`, payload);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const goNext = async () => {
    if (step === 1) await saveStep(1, companyProfile);
    else if (step === 2) await saveStep(2, activeBranches);
    else if (step === 3) await saveStep(3, departments);
    else if (step === 4) await saveStep(4, positionTemplates);
    else if (step === 5) await saveStep(5, orgChart);
    else if (step === 6) await saveStep(6, userMapping);
    else if (step === 7) await saveStep(7, warehouseMapping);
    else if (step === 8) await saveStep(8, financeMapping);
    setStep(s => Math.min(s + 1, 10));
  };

  const goPrev = () => setStep(s => Math.max(s - 1, 1));

  const handleFinalize = async () => {
    setSaving(true);
    try {
      const res = await apiPost("/api/hr/setup/finalize", {});
      setFinalResult(res.data);
      setStep(10);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const addDepartment = () => setDepartments([...departments, { name: "", code: "", parentId: null, sortOrder: departments.length }]);
  const updateDept = (i: number, field: string, val: any) => {
    const next = [...departments]; (next[i] as any)[field] = val; setDepartments(next);
  };
  const removeDept = (i: number) => setDepartments(departments.filter((_, idx) => idx !== i));

  const addPosition = () => setPositionTemplates([...positionTemplates, { title: "", level: "staff", grade: "F", departmentName: "", reportsToTitle: null }]);
  const updatePos = (i: number, field: string, val: any) => {
    const next = [...positionTemplates]; (next[i] as any)[field] = val; setPositionTemplates(next);
  };
  const removePos = (i: number) => setPositionTemplates(positionTemplates.filter((_, idx) => idx !== i));

  const applyTemplates = () => {
    const deptNames = departments.map(d => d.name);
    const tpls = TEMPLATES.map(t => ({ ...t, departmentName: deptNames[0] || "" }));
    setPositionTemplates(tpls);
  };

  if (loading) return (
    <div className="p-6"><InvLoadingSkeleton /></div>
  );

  return (
    <div className="flex h-full bg-[#0a0e1a] text-white overflow-hidden relative">
      {/* Mobile sidebar toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/60 hover:text-white">
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:relative z-50 lg:z-auto w-72 h-full border-r border-white/5 flex flex-col bg-[#0a0e1a] transition-transform`}>
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white/80">Company Setup Wizard</h2>
          <p className="text-[10px] text-white/40 mt-1">Step {step} of 10</p>
          <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500" style={{ width: `${(step / 10) * 100}%` }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {STEPS.map(s => (
            <button key={s.id} onClick={() => s.id <= step && setStep(s.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-all ${
                step === s.id ? "bg-white/5 text-white" : s.id < step ? "text-white/60 hover:text-white/80 cursor-pointer" : "text-white/20 cursor-not-allowed"
              }`}>
              <span className="text-lg">{s.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{s.label}</div>
                <div className="text-[10px] text-white/30 truncate">{s.desc}</div>
              </div>
              {s.id < step && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
            </button>
          ))}
        </div>
        {aiSuggestions.length > 0 && (
          <div className="p-3 border-t border-white/5">
            <div className="text-[10px] font-bold text-amber-400 mb-2">🤖 AI SUGGESTIONS</div>
            {aiSuggestions.slice(0, 3).map((s, i) => (
              <div key={i} className="text-[10px] text-white/40 mb-1">• {s}</div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pt-14 lg:pt-6">
          {step === 1 && <Step1Profile data={companyProfile} onChange={setCompanyProfile} />}
          {step === 2 && <Step2Branches branches={data?.branches || []} active={activeBranches} onChange={setActiveBranches} />}
          {step === 3 && <Step3Departments departments={departments} onAdd={addDepartment} onUpdate={updateDept} onRemove={removeDept} />}
          {step === 4 && <Step4Positions positions={positionTemplates} onAdd={addPosition} onUpdate={updatePos} onRemove={removePos} onApplyTemplates={applyTemplates} departments={departments} />}
          {step === 5 && <Step5OrgChart positions={positionTemplates} orgChart={orgChart} onChange={setOrgChart} />}
          {step === 6 && <Step6Users users={data?.posUsers || []} mapping={userMapping} onChange={setUserMapping} departments={departments} positions={positionTemplates} branches={data?.branches || []} activeBranches={activeBranches} />}
          {step === 7 && <Step7Warehouse branches={data?.branches || []} warehouses={data?.warehouses || []} mapping={warehouseMapping} onChange={setWarehouseMapping} departments={departments} />}
          {step === 8 && <Step8Finance mapping={financeMapping} onChange={setFinanceMapping} positions={positionTemplates} />}
          {step === 9 && <Step9Verify companyProfile={companyProfile} activeBranches={activeBranches} branches={data?.branches || []} departments={departments} positions={positionTemplates} userMapping={userMapping} users={data?.posUsers || []} />}
          {step === 10 && <Step10Ready result={finalResult} />}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <button onClick={goPrev} disabled={step <= 1}
            className="px-4 py-2.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-10">
            ← Kembali
          </button>
          <div className="text-[10px] text-white/30">
            {saving ? "Menyimpan..." : `Step ${step}/10`}
          </div>
          {step < 9 ? (
            <button onClick={goNext}
              className="px-4 py-2.5 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-all min-h-10">
              Lanjut →
            </button>
          ) : step === 9 ? (
            <button onClick={handleFinalize} disabled={saving}
              className="px-4 py-2.5 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg transition-all disabled:opacity-50 min-h-10">
              {saving ? "Initializing..." : "🚀 Initialize ERP"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Step Components ─── */

function Step1Profile({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white">Company Profile</h3>
        <p className="text-xs text-white/40 mt-1">Informasi dasar perusahaan Anda</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Nama Perusahaan *</label>
          <input value={data.companyName} onChange={e => onChange({ ...data, companyName: e.target.value })}
            className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none min-h-10"
            placeholder="PT Lume's Indonesia" />
        </div>
        <div>
          <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Alamat</label>
          <textarea value={data.companyAddress} onChange={e => onChange({ ...data, companyAddress: e.target.value })}
            className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none min-h-10"
            rows={3} placeholder="Jl. Contoh No. 123, Bandung" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Timezone</label>
            <select value={data.companyTimezone} onChange={e => onChange({ ...data, companyTimezone: e.target.value })}
              className="mt-1 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
              <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
              <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Mata Uang</label>
            <select value={data.companyCurrency} onChange={e => onChange({ ...data, companyCurrency: e.target.value })}
              className="mt-1 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              <option value="IDR">IDR - Rupiah Indonesia</option>
              <option value="USD">USD - US Dollar</option>
              <option value="SGD">SGD - Singapore Dollar</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Fiscal Year Start (bulan)</label>
          <select value={data.fiscalYearStart} onChange={e => onChange({ ...data, fiscalYearStart: parseInt(e.target.value) })}
            className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none min-h-10">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Januari {i + 1}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Step2Branches({ branches, active, onChange }: { branches: any[]; active: number[]; onChange: (a: number[]) => void }) {
  const toggle = (id: number) => {
    onChange(active.includes(id) ? active.filter(x => x !== id) : [...active, id]);
  };
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white">Branch Activation</h3>
        <p className="text-xs text-white/40 mt-1">Pilih cabang yang ingin diaktifkan di ERP</p>
      </div>
      <div className="space-y-2">
        {branches.map(b => (
          <div key={b.id} onClick={() => toggle(b.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
              active.includes(b.id) ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/5 hover:bg-white/10"
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${active.includes(b.id) ? "bg-emerald-400" : "bg-white/20"}`} />
              <div>
                <div className="text-sm font-medium text-white">{b.name}</div>
                <div className="text-[10px] text-white/40">Gudang: {b.warehouseName || "Belum ada"}</div>
              </div>
            </div>
            <div className={`text-xs px-2 py-1 rounded ${active.includes(b.id) ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>
              {active.includes(b.id) ? "Active" : "Inactive"}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-white/30">{active.length} dari {branches.length} cabang aktif</div>
    </div>
  );
}

function Step3Departments({ departments, onAdd, onUpdate, onRemove }: { departments: any[]; onAdd: () => void; onUpdate: (i: number, f: string, v: any) => void; onRemove: (i: number) => void }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Department Builder</h3>
          <p className="text-xs text-white/40 mt-1">Buat struktur departemen perusahaan</p>
        </div>
        <button onClick={onAdd} className="px-3 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg min-h-10">+ Tambah</button>
      </div>
      <div className="space-y-2">
        {departments.map((d, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3 overflow-x-auto min-h-[52px]">
            <span className="text-white/20 text-xs w-6">{i + 1}</span>
            <input value={d.code} onChange={e => onUpdate(i, "code", e.target.value)}
              className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10"
              placeholder="Code" />
            <input value={d.name} onChange={e => onUpdate(i, "name", e.target.value)}
              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10"
              placeholder="Nama Departemen" />
            <select value={d.parentId || ""} onChange={e => onUpdate(i, "parentId", e.target.value ? parseInt(e.target.value) : null)}
              className="w-36 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              <option value="">— Root —</option>
              {departments.filter((_, j) => j !== i).map((p, pi) => (
                <option key={pi} value={pi}>{p.name}</option>
              ))}
            </select>
            <button onClick={() => onRemove(i)} className="text-red-400/50 hover:text-red-400 text-xs">✕</button>
          </div>
        ))}
      </div>
      {departments.length === 0 && (
        <div className="text-center py-12 text-white/20 text-xs">Klik "+ Tambah" untuk membuat departemen baru</div>
      )}
    </div>
  );
}

function Step4Positions({ positions, onAdd, onUpdate, onRemove, onApplyTemplates, departments }: { positions: any[]; onAdd: () => void; onUpdate: (i: number, f: string, v: any) => void; onRemove: (i: number) => void; onApplyTemplates: () => void; departments: any[] }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Position Builder</h3>
          <p className="text-xs text-white/40 mt-1">Gunakan template atau buat manual</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onApplyTemplates} className="px-3 py-2 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg min-h-10">⚡ Apply Template</button>
          <button onClick={onAdd} className="px-3 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg min-h-10">+ Tambah</button>
        </div>
      </div>
      <div className="space-y-2">
        {positions.map((p, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3 overflow-x-auto min-h-[52px]">
            <span className="text-white/20 text-xs w-6">{i + 1}</span>
            <input value={p.title} onChange={e => onUpdate(i, "title", e.target.value)}
              className="w-36 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10"
              placeholder="Jabatan" />
            <select value={p.level} onChange={e => onUpdate(i, "level", e.target.value)}
              className="w-28 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              {Object.keys(LEVEL_COLORS).map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select value={p.grade} onChange={e => onUpdate(i, "grade", e.target.value)}
              className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              {["A","B","C","D","E","F","G","H"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={p.departmentName} onChange={e => onUpdate(i, "departmentName", e.target.value)}
              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              <option value="">— Dept —</option>
              {departments.map((d, di) => <option key={di} value={d.name}>{d.name}</option>)}
            </select>
            <select value={p.reportsToTitle || ""} onChange={e => onUpdate(i, "reportsToTitle", e.target.value || null)}
              className="w-32 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              <option value="">— Reports To —</option>
              {positions.filter((_, j) => j !== i).map((pp, pi) => <option key={pi} value={pp.title}>{pp.title}</option>)}
            </select>
            <button onClick={() => onRemove(i)} className="text-red-400/50 hover:text-red-400 text-xs">✕</button>
          </div>
        ))}
      </div>
      {positions.length === 0 && (
        <div className="text-center py-12 text-white/20 text-xs">Klik "Apply Template" untuk membuat posisi standar atau "+ Tambah" untuk manual</div>
      )}
    </div>
  );
}

function Step5OrgChart({ positions, orgChart, onChange }: { positions: any[]; orgChart: any[]; onChange: (c: any[]) => void }) {
  const addLink = () => onChange([...orgChart, { positionTitle: positions[0]?.title || "", reportsToTitle: null, departmentName: "" }]);
  const updateLink = (i: number, field: string, val: any) => {
    const next = [...orgChart]; (next[i] as any)[field] = val; onChange(next);
  };
  const removeLink = (i: number) => onChange(orgChart.filter((_, idx) => idx !== i));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Organization Chart</h3>
          <p className="text-xs text-white/40 mt-1">Susun hierarki reporting antar posisi</p>
        </div>
        <button onClick={addLink} className="px-3 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg min-h-10">+ Tambah Link</button>
      </div>
      <div className="space-y-2">
        {orgChart.map((c, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3 overflow-x-auto min-h-[52px]">
            <select value={c.positionTitle} onChange={e => updateLink(i, "positionTitle", e.target.value)}
              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              {positions.map((p, pi) => <option key={pi} value={p.title}>{p.title}</option>)}
            </select>
            <span className="text-white/20 text-xs">reports to</span>
            <select value={c.reportsToTitle || ""} onChange={e => updateLink(i, "reportsToTitle", e.target.value || null)}
              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              <option value="">— None (Top) —</option>
              {positions.map((p, pi) => <option key={pi} value={p.title}>{p.title}</option>)}
            </select>
            <button onClick={() => removeLink(i)} className="text-red-400/50 hover:text-red-400 text-xs">✕</button>
          </div>
        ))}
      </div>
      {orgChart.length === 0 && (
        <div className="text-center py-12 text-white/20 text-xs">Klik "+ Tambah Link" untuk menyusun hierarki</div>
      )}
    </div>
  );
}

function Step6Users({ users, mapping, onChange, departments, positions, branches, activeBranches }: { users: any[]; mapping: any[]; onChange: (m: any[]) => void; departments: any[]; positions: any[]; branches: any[]; activeBranches: number[] }) {
  const activeBranchesList = branches.filter(b => activeBranches.includes(b.id));

  const autoMap = () => {
    const newMapping = users.map(u => ({
      userId: u.id, name: u.name,
      positionTitle: u.role === "owner" ? "CEO" : u.role === "cashier" ? "Staff" : "",
      departmentName: departments[0]?.name || "",
      branchId: activeBranchesList[0]?.id || 1,
    }));
    onChange(newMapping);
  };

  const updateMap = (i: number, field: string, val: any) => {
    const next = [...mapping]; (next[i] as any)[field] = val; onChange(next);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Import POS Users</h3>
          <p className="text-xs text-white/40 mt-1">Map akun POS yang sudah ada ke data karyawan</p>
        </div>
        <button onClick={autoMap} className="px-3 py-2 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg min-h-10">⚡ Auto-Map</button>
      </div>
      <div className="space-y-2">
        {users.map((u, i) => {
          const m = mapping.find(x => x.userId === u.id) || { userId: u.id, name: u.name, positionTitle: "", departmentName: "", branchId: 1 };
          const mi = mapping.findIndex(x => x.userId === u.id);
          return (
            <div key={u.id} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3 overflow-x-auto min-h-[52px]">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 text-xs flex items-center justify-center font-bold">
                {u.name?.charAt(0) || "?"}
              </div>
              <div className="min-w-[120px]">
                <div className="text-xs font-medium text-white">{u.name}</div>
                <div className="text-[10px] text-white/30">{u.email}</div>
                <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded">{u.role}</span>
              </div>
              <span className="text-white/20 text-xs">→</span>
              <select value={m.positionTitle} onChange={e => {
                if (mi >= 0) updateMap(mi, "positionTitle", e.target.value);
                else onChange([...mapping, { ...m, positionTitle: e.target.value }]);
              }}
                className="w-32 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
                <option value="">— Posisi —</option>
                {positions.map((p, pi) => <option key={pi} value={p.title}>{p.title}</option>)}
              </select>
              <select value={m.departmentName} onChange={e => {
                if (mi >= 0) updateMap(mi, "departmentName", e.target.value);
                else onChange([...mapping, { ...m, departmentName: e.target.value }]);
              }}
                className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
                <option value="">— Dept —</option>
                {departments.map((d, di) => <option key={di} value={d.name}>{d.name}</option>)}
              </select>
              <select value={m.branchId} onChange={e => {
                if (mi >= 0) updateMap(mi, "branchId", parseInt(e.target.value));
                else onChange([...mapping, { ...m, branchId: parseInt(e.target.value) }]);
              }}
                className="w-36 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
                {activeBranchesList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step7Warehouse({ branches, warehouses, mapping, onChange, departments }: { branches: any[]; warehouses: any[]; mapping: any[]; onChange: (m: any[]) => void; departments: any[] }) {
  const autoMap = () => {
    const newMapping = branches.filter(b => warehouses.some(w => w.branchId === b.id)).map(b => {
      const w = warehouses.find(wh => wh.branchId === b.id);
      return { branchId: b.id, warehouseId: w?.id || 0, departmentName: "Inventory" };
    });
    onChange(newMapping);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Warehouse & Inventory Linking</h3>
          <p className="text-xs text-white/40 mt-1">Hubungkan gudang dengan departemen & manager</p>
        </div>
        <button onClick={autoMap} className="px-3 py-2 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg min-h-10">⚡ Auto-Map</button>
      </div>
      <div className="space-y-2">
        {mapping.map((m, i) => {
          const b = branches.find(x => x.id === m.branchId);
          const w = warehouses.find(x => x.id === m.warehouseId);
          return (
            <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3 overflow-x-auto min-h-[52px]">
              <span className="text-xs font-medium text-white w-40">{b?.name || "?"}</span>
              <span className="text-white/20 text-xs">→</span>
              <span className="text-xs text-white/60">{w?.name || "?"}</span>
              <span className="text-white/20 text-xs">→</span>
              <select value={m.departmentName} onChange={e => {
                const next = [...mapping]; next[i].departmentName = e.target.value; onChange(next);
              }}
                className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
                <option value="">— Dept —</option>
                {departments.map((d, di) => <option key={di} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step8Finance({ mapping, onChange, positions }: { mapping: any[]; onChange: (m: any[]) => void; positions: any[] }) {
  const addLink = () => onChange([...mapping, { positionTitle: positions[0]?.title || "", approvalLevel: "level1", costCenter: "" }]);
  const updateLink = (i: number, field: string, val: any) => {
    const next = [...mapping]; (next[i] as any)[field] = val; onChange(next);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Finance Linking</h3>
          <p className="text-xs text-white/40 mt-1">Setup approval level & cost center</p>
        </div>
        <button onClick={addLink} className="px-3 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg min-h-10">+ Tambah</button>
      </div>
      <div className="space-y-2">
        {mapping.map((m, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3 overflow-x-auto min-h-[52px]">
            <select value={m.positionTitle} onChange={e => updateLink(i, "positionTitle", e.target.value)}
              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              {positions.map((p, pi) => <option key={pi} value={p.title}>{p.title}</option>)}
            </select>
            <select value={m.approvalLevel} onChange={e => updateLink(i, "approvalLevel", e.target.value)}
              className="w-32 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
              <option value="level1">Level 1</option>
              <option value="level2">Level 2</option>
              <option value="level3">Level 3</option>
            </select>
            <input value={m.costCenter} onChange={e => updateLink(i, "costCenter", e.target.value)}
              className="w-40 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10"
              placeholder="Cost Center" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Step9Verify({ companyProfile, activeBranches, branches, departments, positions, userMapping, users }: {
  companyProfile: any; activeBranches: number[]; branches: any[];
  departments: any[]; positions: any[];
  userMapping: any[]; users: any[];
}) {
  const checks = [
    { label: "Company Profile", ok: !!companyProfile.companyName, detail: companyProfile.companyName || "Belum diisi" },
    { label: "Branches", ok: activeBranches.length > 0, detail: `${activeBranches.length} cabang aktif` },
    { label: "Departments", ok: departments.length > 0, detail: `${departments.length} departemen` },
    { label: "Positions", ok: positions.length > 0, detail: `${positions.length} posisi` },
    { label: "POS Users Mapped", ok: userMapping.length > 0, detail: `${userMapping.length} dari ${users.length} user` },
  ];
  const allGreen = checks.every(c => c.ok);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white">Verification</h3>
        <p className="text-xs text-white/40 mt-1">Review semua konfigurasi sebelum initialize</p>
      </div>
      <div className="space-y-3">
        {checks.map((c, i) => (
          <div key={i} className={`p-4 rounded-lg border flex items-center justify-between ${
            c.ok ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${c.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                {c.ok ? "✓" : "✕"}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{c.label}</div>
                <div className="text-[10px] text-white/40">{c.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!allGreen && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-300">
          ⚠ Beberapa item belum lengkap. Kembali ke langkah sebelumnya untuk melengkapi.
        </div>
      )}
    </div>
  );
}

function Step10Ready({ result }: { result: any }) {
  return (
    <div className="max-w-xl space-y-6 text-center">
      <div className="text-6xl mb-4">🚀</div>
      <h3 className="text-2xl font-bold text-white">ERP Ready!</h3>
      <p className="text-sm text-white/40">Perusahaan Anda sudah terkonfigurasi dan siap menggunakan Lumé ERP</p>
      {result?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-emerald-400">{result.summary.deptsCreated}</div>
            <div className="text-xs text-white/40">Departemen</div>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{result.summary.positionsCreated}</div>
            <div className="text-xs text-white/40">Posisi</div>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-amber-400">{result.summary.employeesCreated}</div>
            <div className="text-xs text-white/40">Karyawan</div>
          </div>
        </div>
      )}
      <div className="mt-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-left">
        <div className="text-xs font-bold text-emerald-300 mb-2">SELAMAT! ERP ANDA SIAP</div>
        <div className="text-[11px] text-white/50 space-y-1">
          <div>✓ Departemen & struktur organisasi sudah aktif</div>
          <div>✓ POS Users sudah terhubung sebagai karyawan</div>
          <div>✓ Gudang & inventory sudah terkonfigurasi</div>
          <div>✓ Finance approval sudah terset</div>
          <div>✓ Semua modul ERP sudah siap digunakan</div>
        </div>
      </div>
    </div>
  );
}
