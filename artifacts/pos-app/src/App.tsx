import { useState, type FormEvent } from "react";
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "./components/layout";
import CashierPage from "./pages/cashier";
import OrdersPage from "./pages/orders";
import ProductsPage from "./pages/products";
import DashboardPage from "./pages/dashboard";
import BranchesPage from "./pages/branches"; // <-- 1. TAMBAHKAN INI
import UsersPage from "./pages/users";
import InventoryPage from "./pages/inventory";
import ShiftPage from "./pages/shift";
import AuditsPage from "./pages/audits";
import NotFound from "@/pages/not-found";
import { useGetMe } from "@workspace/api-client-react";
import { BranchProvider } from "@/lib/branch";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

async function loginWithPassword(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Login gagal");
  }

  return response.json();
}

async function signupWithPassword(email: string, name: string, password: string) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Pendaftaran gagal");
  }

  return response.json();
}

async function requestPasswordReset(email: string) {
  const response = await fetch("/api/auth/request-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Gagal meminta reset password");
  }

  return response.json();
}

async function resetPassword(email: string, resetToken: string, newPassword: string) {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, resetToken, newPassword }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Reset password gagal");
  }
}

function LoginForm({ mode }: { mode: "signin" | "signup" }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (mode === "signin") {
        await loginWithPassword(email, password);
      } else {
        await signupWithPassword(email, name, password);
      }
      await queryClient.invalidateQueries();
setTimeout(() => setLocation("/"), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            {mode === "signin" ? "Masuk ke Sayq POS" : "Daftar Sayq POS"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Masukkan email dan password Anda untuk masuk."
              : "Buat akun baru dengan email, nama, dan password."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            {mode === "signin" ? "Masuk" : "Buat akun"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground space-y-3">
          {mode === "signin" ? (
            <>
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => setLocation("/reset-password")}
              >
                Lupa password?
              </button>
              <p>
                Belum punya akun?{' '}
                <button
                  type="button"
                  className="font-semibold text-primary underline"
                  onClick={() => setLocation("/sign-up")}
                >
                  Daftar di sini
                </button>
                .
              </p>
            </>
          ) : (
            <p>
              Sudah punya akun?{' '}
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => setLocation("/sign-in")}
              >
                Masuk di sini
              </button>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const data = await requestPasswordReset(email);
      setResetToken(data.resetToken ?? "");
      setMessage("Token reset password dibuat. Simpan token ini untuk melanjutkan.");
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal meminta token reset");
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      await resetPassword(email, resetToken, newPassword);
      setLocation("/sign-in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset password gagal");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan email untuk menerima token reset; lalu ubah password Anda.
          </p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Minta Token Reset
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Token Reset</label>
              <input
                type="text"
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Reset Password
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="font-semibold text-primary underline"
            onClick={() => setLocation("/sign-in")}
          >
            Kembali ke halaman masuk
          </button>
        </p>
      </div>
    </div>
  );
}

function ProtectedApp() {
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
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    queryClient.invalidateQueries();
    setLocation("/sign-in");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    return <Redirect to="/sign-in" />;
  }

  const role = me.role ?? "cashier";
  const canManage = role === "owner" || role === "manager";

  return (
    <BranchProvider>
      <Layout role={role} user={me} onSignOut={signOut}>
        <Switch>
          <Route path="/" component={CashierPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/shift" component={ShiftPage} />
          {canManage && <Route path="/inventory" component={InventoryPage} />}
          {canManage && <Route path="/products" component={ProductsPage} />}
          {canManage && <Route path="/audits" component={AuditsPage} />}
          {canManage && <Route path="/dashboard" component={DashboardPage} />}
          {role === "owner" && <Route path="/branches" component={BranchesPage} />}
          {role === "owner" && <Route path="/users" component={UsersPage} />}
          {role !== "owner" && <Route path="/branches">{() => <Redirect to="/" />}</Route>}
          {role !== "owner" && <Route path="/users">{() => <Redirect to="/" />}</Route>}
          {!canManage && <Route path="/inventory">{() => <Redirect to="/" />}</Route>}
          {!canManage && <Route path="/products">{() => <Redirect to="/" />}</Route>}
          {!canManage && <Route path="/audits">{() => <Redirect to="/" />}</Route>}
          {!canManage && <Route path="/dashboard">{() => <Redirect to="/" />}</Route>}
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </BranchProvider>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={ProtectedApp} />
      <Route path="/orders" component={ProtectedApp} />
      <Route path="/shift" component={ProtectedApp} />
      <Route path="/inventory" component={ProtectedApp} />
      <Route path="/products" component={ProtectedApp} />
      <Route path="/audits" component={ProtectedApp} />
      <Route path="/dashboard" component={ProtectedApp} />
      <Route path="/branches" component={ProtectedApp} />
      <Route path="/users" component={ProtectedApp} />
      <Route path="/sign-in" component={() => <LoginForm mode="signin" />} />
      <Route path="/sign-up" component={() => <LoginForm mode="signup" />} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
