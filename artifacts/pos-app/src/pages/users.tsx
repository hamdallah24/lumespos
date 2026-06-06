import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  useUpdateUserRole,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import type { AppUser } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  manager: { label: "Manager", icon: Shield, color: "text-blue-600 bg-blue-50 border-blue-200" },
  cashier: { label: "Kasir", icon: UserCheck, color: "text-green-600 bg-green-50 border-green-200" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG["cashier"];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} flex items-center gap-1 text-xs`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleRoleChange = (user: AppUser, newRole: string) => {
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

  const ownerCount = users.filter((u) => u.role === "owner").length;

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 border-b px-6 flex items-center bg-card shrink-0">
        <h1 className="font-bold text-xl tracking-tight">Manajemen Pengguna</h1>
        <Badge variant="secondary" className="ml-3">{users.length} pengguna</Badge>
      </div>

      <ScrollArea className="flex-1 p-6">
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
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{user.name}</p>
                      <RoleBadge role={user.role} />
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email} · Bergabung {formatDate(user.createdAt)}</p>
                  </div>
                  <div className="shrink-0">
                    <Select
                      value={user.role}
                      onValueChange={(val) => handleRoleChange(user, val)}
                      disabled={updatingId === user.id || (user.role === "owner" && ownerCount <= 1)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Kasir</SelectItem>
                      </SelectContent>
                    </Select>
                    {user.role === "owner" && ownerCount <= 1 && (
                      <p className="text-xs text-muted-foreground mt-1 text-right">Owner terakhir</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="max-w-3xl mx-auto mt-6 p-4 rounded-xl bg-muted/50 border text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Hak Akses per Role</p>
          <div className="space-y-1">
            <p><span className="font-medium text-yellow-600">Owner</span> — Akses penuh: Kasir, Riwayat, Produk, Laporan, Pengguna</p>
            <p><span className="font-medium text-blue-600">Manager</span> — Kasir, Riwayat, Produk, Laporan</p>
            <p><span className="font-medium text-green-600">Kasir</span> — Kasir & Riwayat saja</p>
          </div>
          <p className="mt-2 text-xs">Pengguna baru otomatis menjadi Kasir. Owner pertama mendapat role Owner.</p>
        </div>
      </ScrollArea>
    </div>
  );
}
