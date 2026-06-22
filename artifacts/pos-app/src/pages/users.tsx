import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  useUpdateUserRole,
  useListBranches,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import type { AppUser } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Users, Crown, Shield, UserCheck, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  owner:   { label: "Owner",   icon: Crown,     color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  manager: { label: "Manager", icon: Shield,     color: "text-blue-600 bg-blue-50 border-blue-200" },
  cashier: { label: "Kasir",   icon: UserCheck,  color: "text-green-600 bg-green-50 border-green-200" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG["cashier"];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} flex items-center gap-1 text-xs`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </Badge>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type UserWithBranches = AppUser & { allowedBranches?: number[] };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: usersRaw = [], isLoading } = useListUsers();
  const { data: branchesRaw } = useListBranches();
  const users = usersRaw as UserWithBranches[];
  const branches = Array.isArray(branchesRaw) ? branchesRaw as { id: number; name: string }[] : [];
  const updateRole = useUpdateUserRole();

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserWithBranches | null>(null);
  const [editBranchUser, setEditBranchUser] = useState<UserWithBranches | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [savingBranches, setSavingBranches] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ownerCount = users.filter((u) => u.role === "owner").length;

  const handleRoleChange = (user: UserWithBranches, newRole: string) => {
    if (newRole === user.role) return;
    setUpdatingId(user.id);
    updateRole.mutate(
      { id: user.id, data: { role: newRole as "owner" | "manager" | "cashier" } },
      {
        onSuccess: () => {
          toast.success(`Role ${user.name} diubah ke ${ROLE_CONFIG[newRole]?.label}`);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => toast.error("Gagal mengubah role"),
        onSettled: () => setUpdatingId(null),
      }
    );
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/users/${deleteUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Gagal menghapus pengguna");
      }
      toast.success(`"${deleteUser.name}" berhasil dihapus`);
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Gagal menghapus pengguna"));
    } finally {
      setDeleting(false);
    }
  };

  const openEditBranch = (user: UserWithBranches) => {
    setEditBranchUser(user);
    setSelectedBranches(user.allowedBranches ?? []);
  };

  const toggleBranch = (branchId: number) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((b) => b !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSaveBranches = async () => {
    if (!editBranchUser) return;
    setSavingBranches(true);
    try {
      const res = await apiFetch(`/api/users/${editBranchUser.id}/branches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ branchIds: selectedBranches }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan akses cabang");
      toast.success(`Akses cabang ${editBranchUser.name} diperbarui`);
      setEditBranchUser(null);
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err: any) {
      toast.error(err.message ?? "Gagal menyimpan akses cabang");
    } finally {
      setSavingBranches(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-3 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mx-3 mt-3">
        <h1 className="font-bold text-lg tracking-tight">Manajemen Pengguna</h1>
        <Badge variant="secondary" className="ml-3">{users.length} pengguna</Badge>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>Belum ada pengguna terdaftar</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4 flex-wrap">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      <RoleBadge role={user.role} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.email} · Bergabung {formatDate(user.createdAt)}
                    </p>
                    {user.allowedBranches && user.allowedBranches.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {user.allowedBranches.map((bid) => {
                          const branch = branches.find((b) => b.id === bid);
                          return branch ? (
                            <Badge key={bid} variant="secondary" className="text-[10px]">
                              <Building2 className="w-2.5 h-2.5 mr-1" />{branch.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Edit Cabang — owner & manager */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => openEditBranch(user)}
                    >
                      <Building2 className="w-3.5 h-3.5 mr-1" />Cabang
                    </Button>

                    {/* Ganti Role */}
                    <Select
                      value={user.role}
                      onValueChange={(val) => handleRoleChange(user, val)}
                      disabled={updatingId === user.id || (user.role === "owner" && ownerCount <= 1)}
                    >
                      <SelectTrigger className="w-28 md:w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Kasir</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Hapus User — hanya owner, tidak bisa hapus owner lain */}
                    {user.role !== "owner" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                        onClick={() => setDeleteUser(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="max-w-3xl mx-auto mt-6 p-4 rounded-xl bg-muted/50 border text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Hak Akses per Role</p>
          <div className="space-y-1">
            <p><span className="font-medium text-yellow-600">Owner</span> — Akses penuh semua fitur & cabang</p>
            <p><span className="font-medium text-blue-600">Manager</span> — Kasir, Riwayat, Produk, Laporan</p>
            <p><span className="font-medium text-green-600">Kasir</span> — Kasir & Riwayat saja</p>
          </div>
          <p className="mt-2 text-xs">Gunakan tombol "Cabang" untuk mengatur cabang mana yang bisa diakses kasir.</p>
        </div>
      </ScrollArea>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />Hapus Pengguna
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus <strong>"{deleteUser?.name}"</strong>?
              Pengguna ini tidak akan bisa login lagi. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Cabang */}
      <Dialog open={!!editBranchUser} onOpenChange={(o) => { if (!o) setEditBranchUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />Akses Cabang — {editBranchUser?.name}
            </DialogTitle>
            <DialogDescription>
              Pilih cabang yang bisa diakses oleh pengguna ini. Centang semua untuk akses penuh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada cabang terdaftar.</p>
            ) : (
              branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedBranches.includes(branch.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleBranch(branch.id)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    selectedBranches.includes(branch.id)
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}>
                    {selectedBranches.includes(branch.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{branch.name}</p>
                    <p className="text-xs text-muted-foreground">ID #{branch.id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBranchUser(null)}>Batal</Button>
            <Button onClick={handleSaveBranches} disabled={savingBranches}>
              {savingBranches ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}