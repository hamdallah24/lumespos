import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBranch } from "@/lib/branch";
import { formatRp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wallet, Plus, Trash2, Pencil, ArrowDownRight, ShoppingCart } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";
import { motion } from "framer-motion";

type Expense = {
  id: number;
  branchId: number;
  description: string;
  amount: string;
  category: string | null;
  notes: string | null;
  createdAt: string;
};

const CATEGORIES = [
  "Bahan Baku", "Operasional", "Utility", "Gaji", "Transport", "Lainnya",
] as const;

function PengeluaranPage() {
  const qc = useQueryClient();
  const { branchId } = useBranch();
  const { data: me } = useGetMe();
  const canManage = me?.role === "owner" || me?.role === "manager";

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Petty Cash");
  const [notes, setNotes] = useState("");

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      const res = await fetch(`/api/expenses?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data");
      return res.json();
    },
    enabled: !!branchId,
  });

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Gagal"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Pengeluaran berhasil dicatat");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      resetForm();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Gagal mencatat pengeluaran")),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiFetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Gagal"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Pengeluaran diperbarui");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      resetForm();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Gagal memperbarui pengeluaran")),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Gagal"); }
    },
    onSuccess: () => {
      toast.success("Pengeluaran dihapus");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteItem(null);
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Gagal menghapus pengeluaran")),
  });

  const resetForm = () => {
    setOpen(false); setEditItem(null); setDesc(""); setAmount(""); setCategory("Petty Cash"); setNotes("");
  };

  const openCreate = () => {
    setEditItem(null); setDesc(""); setAmount(""); setCategory("Petty Cash"); setNotes(""); setOpen(true);
  };

  const openEdit = (ex: Expense) => {
    setEditItem(ex); setDesc(ex.description); setAmount(ex.amount); setCategory(ex.category ?? "Petty Cash"); setNotes(ex.notes ?? ""); setOpen(true);
  };

  const submit = () => {
    if (!branchId) return;
    if (!desc.trim()) { toast.error("Deskripsi wajib diisi"); return; }
    const num = parseFloat(amount);
    if (!num || num <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    const payload = { branchId, description: desc.trim(), amount: num, category: category || "Petty Cash", notes: notes.trim() || null };
    if (editItem) {
      updateMut.mutate({ id: editItem.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const filtered = expenses;
  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const pettyTotal = expenses.filter((e) => e.category === "Petty Cash").reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-3 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mt-3">
        <h1 className="font-bold text-lg tracking-tight">Pengeluaran</h1>
        <Button size="sm" className="ml-auto rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />Catat
        </Button>
      </div>

      <div className="px-4 md:px-6 pt-3 shrink-0">
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">{expenses.length === 0 ? "Belum ada pengeluaran" : "Tidak ada dengan filter ini"}</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="flex-1 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-3 border border-primary/10">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-lg text-primary">{formatRp(total)}</p>
                </div>
                <div className="flex-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-3 border border-amber-200">
                  <p className="text-xs text-amber-700">Petty Cash</p>
                  <p className="font-bold text-lg text-amber-600">{formatRp(pettyTotal)}</p>
                </div>
              </div>
              {filtered.map((ex) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card"
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      ex.category === "Petty Cash" ? "bg-amber-50 text-amber-500" : "bg-red-50 text-red-500"
                    }`}>
                      <ArrowDownRight className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{ex.description}</span>
                        {ex.category && (
                          <Badge variant={ex.category === "Petty Cash" ? "outline" : "secondary"}
                            className={`text-[10px] ${ex.category === "Petty Cash" ? "border-amber-200 text-amber-700 bg-amber-50" : ""}`}
                          >
                            {ex.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(ex.createdAt).toLocaleDateString("id", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {ex.notes && <p className="text-xs text-muted-foreground mt-1 italic">{ex.notes}</p>}
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="font-bold text-base text-red-500">{formatRp(parseFloat(ex.amount))}</span>
                      {canManage && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(ex)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteItem(ex)} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              {editItem ? "Edit Pengeluaran" : "Catat Pengeluaran"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Deskripsi</label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="cth. Beli es batu" autoFocus className="h-12 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jumlah (Rp)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-12 rounded-xl" />
            </div>
            {canManage && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Catatan (opsional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tambahkan catatan..." className="h-12 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={resetForm}>Batal</Button>
            <Button className="rounded-xl" onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Hapus Pengeluaran
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Yakin ingin menghapus <strong>"{deleteItem?.description}"</strong>?
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PengeluaranPage;
