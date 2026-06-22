import { useEffect, useState, type FormEvent } from "react";
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Layout } from "./components/layout";
import CashierPage from "./pages/cashier";
import OrdersPage from "./pages/orders";
import ProductsPage from "./pages/products";
import DashboardPage from "./pages/dashboard";
import BranchesPage from "./pages/branches";
import UsersPage from "./pages/users";
import InventoryPage from "./pages/inventory";
import ShiftPage from "./pages/shift";
import PengeluaranPage from "./pages/pengeluaran";
import AuditsPage from "./pages/audits";
import NotFound from "@/pages/not-found";
import { useGetMe } from "@workspace/api-client-react";
import { BranchProvider } from "@/lib/branch";
import { initCsrf, apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";
import { motion } from "framer-motion";

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

    if (mode === "signup") {
      if (password.length < 8) { setError("Password minimal 8 karakter"); return; }
      if (!/[a-zA-Z]/.test(password)) { setError("Password harus mengandung huruf"); return; }
      if (!/[0-9]/.test(password)) { setError("Password harus mengandung angka"); return; }
    }

    try {
      if (mode === "signin") {
        await loginWithPassword(email, password);
      } else {
        await signupWithPassword(email, name, password);
      }
      await queryClient.invalidateQueries();
setTimeout(() => setLocation("/"), 300);
    } catch (err) {
      setError(getErrorMessage(err, "Login gagal"));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1565FF]/5 via-[#F8FBFF] to-[#8ED8FF]/10 px-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#1565FF]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#8ED8FF]/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-40 h-40 rounded-full bg-[#F4C95D]/10 blur-2xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 shadow-xl">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center shadow-lg"
            >
              <span className="text-2xl font-bold text-white">L</span>
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">Lume's Everywhere</h1>
            <p className="mt-1 text-sm text-muted-foreground font-medium tracking-wide">Fresh. Fast. Everywhere.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 touch-target"
                placeholder="nama@email.com"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-foreground/80">Nama</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 touch-target"
                  placeholder="Nama lengkap"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground/80">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 touch-target"
                placeholder="••••••••"
              />
              {mode === "signup" && (
                <p className="mt-1 text-xs text-muted-foreground">Minimal 8 karakter, mengandung huruf &amp; angka</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 touch-target"
            >
              {mode === "signin" ? "Masuk" : "Buat akun"}
            </motion.button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-muted-foreground">atau</span>
              </div>
            </div>
            <a
              href="/api/auth/google"
              className="w-full rounded-xl border border-border bg-white/80 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition flex items-center justify-center gap-2 touch-target"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login dengan Google
            </a>
            {mode === "signin" ? (
              <>
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setLocation("/reset-password")}
                >
                  Lupa password?
                </button>
                <p>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => setLocation("/sign-up")}
                  >
                    Daftar di sini
                  </button>
                </p>
              </>
            ) : (
              <p>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setLocation("/sign-in")}
                >
                  Masuk di sini
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [tokenFromLink, setTokenFromLink] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const emailFromUrl = params.get("email");

    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setEmail(emailFromUrl ?? "");
      setStep("confirm");
      setTokenFromLink(true);
    }
  }, []);

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const data = await requestPasswordReset(email);
      setMessage(data?.message ?? "Jika akun ada, link reset telah dikirim ke email.");
    } catch (err) {
      setError(getErrorMessage(err, "Gagal meminta reset password"));
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) { setError("Password minimal 8 karakter"); return; }
    if (!/[a-zA-Z]/.test(newPassword)) { setError("Password harus mengandung huruf"); return; }
    if (!/[0-9]/.test(newPassword)) { setError("Password harus mengandung angka"); return; }

    try {
      await resetPassword(email, resetToken, newPassword);
      setLocation("/sign-in");
    } catch (err) {
      setError(getErrorMessage(err, "Reset password gagal"));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1565FF]/5 via-[#F8FBFF] to-[#8ED8FF]/10 px-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#1565FF]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#8ED8FF]/10 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary mx-auto mb-3 flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold text-white">L</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "request"
                ? "Masukkan email untuk menerima link reset password."
                : "Masukkan password baru untuk akun Anda."}
            </p>
          </div>

          {step === "request" ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 touch-target"
                  placeholder="nama@email.com"
                />
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}
              {message && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2">{message}</p>}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 touch-target"
              >
                Kirim Link Reset
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 touch-target"
                  placeholder="nama@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80">Token Reset</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  required
                  readOnly={tokenFromLink}
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 touch-target"
                  placeholder="Masukkan token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 touch-target"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}
              {message && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2">{message}</p>}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 touch-target"
              >
                Reset Password
              </motion.button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setLocation("/sign-in")}
            >
              Kembali ke halaman masuk
            </button>
          </p>
        </div>
      </motion.div>
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

  useEffect(() => { initCsrf(); }, []);

  const signOut = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
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
          <Route path="/pengeluaran" component={PengeluaranPage} />
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
      <Route path="/pengeluaran" component={ProtectedApp} />
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
