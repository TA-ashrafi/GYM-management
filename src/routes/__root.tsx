import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext,
  useRouter, useRouterState, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ClerkProvider, useAuth, useUser } from "@clerk/tanstack-react-start";
import appCss from "../styles.css?url";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { supabase, getActiveBranchId, fetchBranchesForUser, setActiveBranchId } from "@/lib/supabase";
import { gym } from "@/lib/gym-store";
import { useApplyTheme } from "@/lib/theme";

const PUBLIC_PATHS = ["/", "/auth", "/landing", "/login", "/onboarding"];

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ALPHA FITNESS — Premium Fitness streak" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

  // Log presence of key in dev
  if (import.meta.env.DEV) {
    console.log("[Dev] Clerk Publishable Key present:", !!publishableKey);
  }

  // Only block in production. In development, allow Clerk's automatic Keyless Mode to boot up
  if (!publishableKey && import.meta.env.PROD) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111] border border-white/10 p-8 rounded-2xl text-center shadow-2xl space-y-4">
          <div className="size-16 bg-[#ed3434]/10 rounded-xl grid place-items-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-heading font-bold text-white uppercase tracking-tight">
            Configuration Error
          </h1>
          <p className="text-sm text-[#8d8d8d]">
            The <code className="text-white bg-white/5 px-1.5 py-0.5 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> is missing from your environment variables.
          </p>
          <p className="text-xs text-[#666]">
            Please add this variable to your environment or <code className="text-white">.env</code> file to enable ALPHA FITNESS console authorization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey || undefined}>
      <RootInner />
    </ClerkProvider>
  );
}

// Safely retrieve token, falling back to standard Clerk token if supabase template is not configured yet
async function safelyGetToken(getToken: any) {
  try {
    const token = await getToken({ template: "supabase" });
    if (token) return token;
  } catch (err) {
    console.warn("Supabase JWT template not configured in Clerk dashboard, falling back to standard session token.", err);
  }
  try {
    return await getToken();
  } catch (err) {
    console.error("Failed to retrieve Clerk session token:", err);
    return null;
  }
}

function RootInner() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState({ x: -100, y: -100 });
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();

  // Apply theme & preset globally at root level, ensuring perfect persistence
  useApplyTheme();

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    async function checkAuthAndSync() {
      // 1. Signed-out handling
      if (!isSignedIn) {
        setSyncedUserId(null);
        const isPublic = PUBLIC_PATHS.includes(pathname);
        if (!isPublic) {
          router.navigate({ to: "/landing" });
        }
        setReady(true);
        return;
      }

      // 2. Signed-in handling
      try {
        // Sync active Clerk session token to Supabase client so RLS rules evaluate correctly
        const token = await safelyGetToken(getToken);
        if (token) {
          await supabase.auth.setSession({
            access_token: token,
            refresh_token: "",
          });
        }

        // Only hit the database (upsert & fetch branches) if not already synced for this user
        // Or if we are transitioning away from onboarding and need to verify the new branch
        if (userId && (syncedUserId !== userId || (pathname !== "/onboarding" && syncedUserId === "onboarding"))) {
          // Upsert gym_owner metadata mapping the Clerk User ID
          if (user) {
            await supabase.from("gym_owners").upsert({
              id: userId,
              name: user.fullName || user.firstName || "",
              email: user.primaryEmailAddress?.emailAddress || "",
            });
          }

          // Fetch branches for active Clerk user
          const branches = await fetchBranchesForUser(userId);

          if (branches.length === 0) {
            localStorage.removeItem("fs_active_branch"); // Safe cleanup
            gym.reset(); // Wipe any old cached records
            setSyncedUserId("onboarding");
            if (pathname !== "/onboarding") {
              router.navigate({ to: "/onboarding" });
            }
            setReady(true);
            return;
          }

          const activeBranchId = getActiveBranchId();
          let validBranch = branches.find((b: any) => b.id === activeBranchId);

          if (!validBranch && branches.length > 0) {
            setActiveBranchId(branches[0].id);
            validBranch = branches[0];
          }

          // Synchronize active branch settings and theme on load
          const currentBranch = validBranch || (branches.length === 1 ? branches[0] : null);
          if (currentBranch) {
            gym.updateSettings({
              gymName: currentBranch.gym_name ?? "ALPHA FITNESS",
              theme: currentBranch.theme ?? "dark",
              preset: currentBranch.preset ?? "lime",
              slotDurationMin: currentBranch.slot_duration_min ?? 60,
              slotCapacity: currentBranch.slot_capacity ?? 20,
              currency: currentBranch.currency ?? "INR",
              language: currentBranch.language ?? "hinglish",
            });
          }

          setSyncedUserId(userId);
        }

        // Route protection checks (always runs on pathname change)
        const isPublic = PUBLIC_PATHS.includes(pathname);
        if (isPublic && pathname !== "/branches" && pathname !== "/onboarding") {
          router.navigate({ to: "/" });
        }
        setReady(true);
      } catch (err) {
        console.error("Error synchronizing Clerk auth with Supabase:", err);
        setReady(true);
      }
    }

    checkAuthAndSync();
  }, [isLoaded, isSignedIn, userId, user, pathname, syncedUserId]);

  // Sync token periodically on session transitions or layout renders
  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(async () => {
      try {
        const token = await safelyGetToken(getToken);
        if (token) {
          await supabase.auth.setSession({
            access_token: token,
            refresh_token: "",
          });
        }
      } catch (err) {
        console.error("Failed to refresh Supabase session token from Clerk:", err);
      }
    }, 4 * 60 * 1000); // 4 minutes
    return () => clearInterval(interval);
  }, [isSignedIn]);

  if (!isPublic && (!isLoaded || !ready)) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#070707] flex items-center justify-center select-none">
          <div className="flex flex-col items-center space-y-4">
            <div className="size-10 border-2 border-t-[#ed3434] border-white/10 rounded-full animate-spin" />
            <div className="text-[10px] text-white/50 tracking-[0.3em] uppercase font-black">
              ALPHA FITNESS
            </div>
          </div>
        </div>
        <Toaster position="top-right" />
      </QueryClientProvider>
    );
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      {isPublic ? <Outlet /> : <AppShell><Outlet /></AppShell>}
      <Toaster position="top-right" />

      {/* Interactive cursor glow trail */}
      <div
        className="custom-cursor-glow hidden sm:block"
        style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      />
    </QueryClientProvider>
  );
}
