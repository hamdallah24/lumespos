import { useState } from "react";
import { useEmployees, useDepartments, usePositions, useCreateEmployee } from "../hooks/useHr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRp } from "@/lib/format";
import { Plus, Users, Search } from "lucide-react";
import { useBranch } from "@/lib/branch";

export default function EmployeeListPage() {
  const { branchId } = useBranch();
  const { data: employees, isLoading } = useEmployees(branchId ?? undefined);
  const { data: departments } = useDepartments(branchId ?? undefined);
  const { data: positions } = usePositions();
  const createEmployee = useCreateEmployee();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [positionId, setPositionId] = useState("");
  const [deptId, setDeptId] = useState("");

  const handleCreate = async () => {
    if (!name) return;
    await createEmployee.mutateAsync({
      fullName: name,
      branchId: branchId ?? 1,
      hireDate: new Date().toISOString().split("T")[0],
      positionId: positionId ? Number(positionId) : undefined,
      departmentId: deptId ? Number(deptId) : undefined,
    });
    setName(""); setPositionId(""); setDeptId(""); setShowForm(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5" /> Karyawan
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Input placeholder="Nama Lengkap" value={name} onChange={e => setName(e.target.value)} className="h-9 text-xs" />
            <select value={positionId} onChange={e => setPositionId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">Pilih Posisi</option>
              {positions?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <select value={deptId} onChange={e => setDeptId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">Pilih Departemen</option>
              {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createEmployee.isPending}>Simpan</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {employees?.map(emp => (
            <div key={emp.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{emp.fullName}</p>
                  <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{emp.positionTitle || "-"}</span>
                    <span>·</span>
                    <span>{emp.departmentName || "-"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    emp.status === "active" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                  }`}>{emp.status}</span>
                  <p className="text-xs text-muted-foreground mt-1">{formatRp(Number(emp.baseSalary))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
