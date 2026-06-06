import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "./components/layout";
import CashierPage from "./pages/cashier";
import OrdersPage from "./pages/orders";
import ProductsPage from "./pages/products";
import DashboardPage from "./pages/dashboard";
import UsersPage from "./pages/users";
import NotFound from "@/pages/not-found";
import { useSyncUser, useGetMe } from "@workspace/api-client-react";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(14, 90%, 48%)",
    colorForeground: "hsl(20, 14%, 10%)",
    colorMutedForeground: "hsl(25, 10%, 40%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(40, 20%, 98%)",
    colorInput: "hsl(40, 10%, 88%)",
    colorInputForeground: "hsl(20, 14%, 10%)",
    colorNeutral: "hsl(40, 10%, 70%)",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold text-xl",
    headerSubtitle: "text-muted-foreground text-sm",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground text-sm font-medium",
    footerActionLink: "text-primary font-semibold hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-foreground",
    logoBox: "flex justify-center mb-2",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-border bg-white hover:bg-muted transition-colors",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-semibold",
    formFieldInput: "border-input bg-white text-foreground",
    footerAction: "border-t border-border pt-4 mt-2",
    dividerLine: "bg-border",
    alert: "border border-destructive/20 bg-destructive/5",
    otpCodeFieldInput: "border-input",
    formFieldRow: "gap-3",
    main: "px-2",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== uid) qc.clear();
      prevRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function UserSyncer() {
  const { user, isLoaded } = useUser();
  const syncUser = useSyncUser();
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || synced.current) return;
    synced.current = true;
    syncUser.mutate({
      data: {
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? user.username ?? "User",
      },
    });
  }, [isLoaded, user]);

  return null;
}

function ProtectedApp() {
  const { data: me, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = me?.role ?? "cashier";
  const canManage = role === "owner" || role === "manager";

  return (
    <Layout role={role} user={me}>
      <Switch>
        <Route path="/" component={CashierPage} />
        <Route path="/orders" component={OrdersPage} />
        {canManage && <Route path="/products" component={ProductsPage} />}
        {canManage && <Route path="/dashboard" component={DashboardPage} />}
        {role === "owner" && <Route path="/users" component={UsersPage} />}
        {!canManage && (
          <Route path="/products">
            {() => <Redirect to="/" />}
          </Route>
        )}
        {!canManage && (
          <Route path="/dashboard">
            {() => <Redirect to="/" />}
          </Route>
        )}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <UserSyncer />
        <ProtectedApp />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Masuk ke Sayq POS",
            subtitle: "Masuk untuk mulai berjualan",
          },
        },
        signUp: {
          start: {
            title: "Buat Akun Sayq POS",
            subtitle: "Daftar untuk memulai",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/orders" component={HomeRedirect} />
            <Route path="/products" component={HomeRedirect} />
            <Route path="/dashboard" component={HomeRedirect} />
            <Route path="/users" component={HomeRedirect} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
