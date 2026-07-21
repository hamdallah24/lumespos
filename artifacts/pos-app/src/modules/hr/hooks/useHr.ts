import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import type { Employee, Department, Position } from "../types";

export function useEmployees(branchId?: number) {
  return useQuery<Employee[]>({
    queryKey: ["hr", "employees", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/employees${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data karyawan");
      return res.json();
    },
  });
}

export function useDepartments(branchId?: number) {
  return useQuery<Department[]>({
    queryKey: ["hr", "departments", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch(`/api/hr/departments${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data departemen");
      return res.json();
    },
  });
}

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ["hr", "positions"],
    queryFn: async () => {
      const res = await apiFetch("/api/hr/positions");
      if (!res.ok) throw new Error("Gagal mengambil data posisi");
      return res.json();
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/hr/employees", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal membuat karyawan");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
}
