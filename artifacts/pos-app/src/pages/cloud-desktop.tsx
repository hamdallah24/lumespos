import { useIsMobile } from "@/hooks/use-mobile";
import CloudDesktopShell from "@/components/desktop/CloudDesktopShell";
import MobileLauncher from "@/components/desktop/MobileLauncher";
import { useGetMe } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/csrf";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function CloudDesktopPage() {
  const { data: me, isLoading } = useGetMe({
    query: {
      queryKey: ["/api/users/me"],
      retry: 1,
      retryDelay: 500,
    },
  });
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.invalidateQueries();
    setLocation("/sign-in");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#071426]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    setLocation("/sign-in");
    return null;
  }

  if (isMobile) {
    return <MobileLauncher user={me} onSignOut={signOut} />;
  }

  return <CloudDesktopShell user={me} onSignOut={signOut} />;
}
