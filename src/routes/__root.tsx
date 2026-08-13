import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext,
  useRouter, useRouterState, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
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
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState({ x: -100, y: -100 });
  const [session, setSession] = useState<any>(null);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  // Apply theme & preset globally at root level, ensuring perfect persistence
  useApplyTheme();

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Subscribe and manage Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function checkAuthAndSync() {
      // 1. Signed-out handling
      if (!session) {
        setSyncedUserId(null);
        const isPublic = PUBLIC_PATHS.includes(pathname);
        if (!isPublic) {
          router.navigate({ to: "/landing" });
        }
        setReady(true);
        return;
      }

      // 2. Recovery handling (CRITICAL PASSWORD RESET FIX: lock them to /auth without redirect)
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const searchParams = typeof window !== "undefined" ? window.location.search : "";
      const isRecovery = hash.includes("type=recovery") || searchParams.includes("type=recovery") || pathname.includes("type=recovery");

      if (isRecovery) {
        setReady(true);
        return;
      }

      // 3. Signed-in handling
      try {
        const userId = session.user?.id;

        // Only hit the database (fetch branches) if not already synced for this user
        // Or if we are transitioning away from onboarding and need to verify the new branch
        if (userId && (syncedUserId !== userId || (pathname !== "/onboarding" && syncedUserId === "onboarding"))) {

          // Fetch branches for active user
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
        console.error("Error synchronizing Supabase auth state:", err);
        setReady(true);
      }
    }

    checkAuthAndSync();
  }, [session, pathname, syncedUserId]);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!isPublic && !ready) {
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
