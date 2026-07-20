import HomeScreen from "@/components/home/HomeScreen";
import { useGetMe } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/csrf";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BranchProvider } from "@/lib/branch";

export default function CloudDesktopPage() {
  const { data: me, isLoading } = useGetMe({
    query: {
      queryKey: ["/api/users/me"],
      retry: 1,
      retryDelay: 500,
    },
  });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.invalidateQueries();
    setLocation("/sign-in");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F6F8FC]">
        <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    setLocation("/sign-in");
    return null;
  }

  return (
    <BranchProvider>
      <HomeScreen user={me} onSignOut={signOut} />
    </BranchProvider>
  );
}
