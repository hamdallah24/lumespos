import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBranches,
  useCreateBranch,
  getListBranchesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { Building2, Plus, MapPin, Pencil } from "lucide-react";

type Branch = {
  id: number;
  name: string;
  location?: string | null;
  createdAt: string;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const { data: branchesRaw, isLoading } = useListBranches();
  const branches = Array.isArray(branchesRaw) ? (branchesRaw as Branch[]) : [];
  const createBranch = useCreateBranch();

  // State tambah
  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  // State edit
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const resetAdd = () => { setName(""); setLocation(""); };

  const openEdit = (branch: Branch) => {
    setEditBranch(branch);
    setEditName(branch.name);
    setEditLocation(branch.location ?? "");
  };

  const submitAdd = () => {
    if (!name.trim()) { toast.error("Nama cabang wajib diisi"); return; }
    createBranch.mutate(
      { data: { name: name.trim(), location: location.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success(`Cabang "${name.trim()}" berhasil ditambahkan`);
          setOpenAdd(false); resetAdd();
          qc.invalidateQueries({ queryKey: getListBranchesQueryKey() });
        },
        onError: (e: any) => {
          const msg = e?.response?.data?.error ?? "Gagal menambah cabang";
          toast.error(msg);
        },
      },
    );
  };

  const submitEdit = async () => {
    if (!editBranch) return;
    if (!editName.trim()) { toast.error("Nama cabang wajib diisi"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/branches/${editBranch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editName.trim(),
          location: editLocation.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Gagal mengupdate cabang");
      }
      toast.success(`Cabang "${editName.trim()}" berhasil diupdate`);
      setEditBranch(null);
      qc.invalidateQueries({ queryKey: getListBranchesQueryKey() });
    } catch (err: any) {
      toast.error(err.message ?? "Gagal mengupdate cabang");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-3 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mx-3 mt-3">
        <h1 className="font-bold text-lg tracking-tight">Manajemen Cabang</h1>
        <Badge variant="secondary" className="ml-3">{branches.length} cabang</Badge>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Tombol Tambah */}
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpenAdd(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Tambah Cabang
            </Button>
          </div>

          {/* List Cabang */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada cabang terdaftar</p>
            </div>
          ) : (
            branches.map((branch) => (
              <Card key={branch.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{branch.name}</p>
                      {branch.id === 1 && (
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300 bg-yellow-50">
                          Pusat
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {branch.location ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{branch.location}
                          <span className="mx-1">·</span>
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        Dibuat {formatDate(branch.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      ID #{branch.id}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => openEdit(branch)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Info Box */}
          <div className="p-4 rounded-xl bg-muted/50 border text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tentang Multi-Cabang</p>
            <p>Setiap cabang memiliki stok, laporan, dan data transaksi yang terpisah.</p>
          </div>
        </div>
      </ScrollArea>

      {/* Dialog Tambah Cabang */}
      <Dialog open={openAdd} onOpenChange={(o) => { if (!o) { setOpenAdd(false); resetAdd(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Cabang Baru</DialogTitle>
            <DialogDescription>
              Cabang baru akan memiliki stok dan laporan terpisah dari cabang lain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama Cabang <span className="text-destructive">*</span></label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth. Cilengkrang 2, Cisaranten"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Lokasi / Alamat</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="cth. Jl. Raya Cilengkrang No. 12"
              />
              <p className="text-[11px] text-muted-foreground">Opsional — membantu identifikasi cabang.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenAdd(false); resetAdd(); }}>Batal</Button>
            <Button onClick={submitAdd} disabled={createBranch.isPending}>
              {createBranch.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Cabang */}
      <Dialog open={!!editBranch} onOpenChange={(o) => { if (!o) setEditBranch(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Cabang
            </DialogTitle>
            <DialogDescription>
              Ubah informasi cabang ID #{editBranch?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama Cabang <span className="text-destructive">*</span></label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="cth. Cilengkrang 2"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Lokasi / Alamat</label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="cth. Jl. Raya Cilengkrang No. 12"
              />
              <p className="text-[11px] text-muted-foreground">Opsional — kosongkan untuk menghapus lokasi.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBranch(null)}>Batal</Button>
            <Button onClick={submitEdit} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}