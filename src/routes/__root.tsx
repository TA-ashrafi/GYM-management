import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext,
  useRouter, useRouterState, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { supabase, getActiveBranchId, fetchBranches, setActiveBranchId } from "@/lib/supabase";
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
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState({ x: -100, y: -100 });

  // Apply theme & preset globally at root level, ensuring perfect persistence across logins, logouts, reloads, and landing/auth screens instantly!
  useApplyTheme();

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    // Run only once on initial mount — do not re-run on tab or window switch.
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          const isPublic = PUBLIC_PATHS.includes(pathname);
          if (!isPublic) router.navigate({ to: "/landing" });
          setReady(true);
          return;
        }

        const branches = await fetchBranches();

        if (branches.length === 0) {
          localStorage.removeItem("fs_active_branch"); // Safe cleanup
          gym.reset(); // Wipe any old cached records
          if (pathname !== "/onboarding") router.navigate({ to: "/onboarding" });
          setReady(true);
          return;
        }

        const activeBranchId = getActiveBranchId();
        let validBranch = branches.find((b: any) => b.id === activeBranchId);

        if (!validBranch && branches.length > 0) {
          setActiveBranchId(branches[0].id);
          validBranch = branches[0];
        }

        // Synchronize active branch settings and theme on load so appearance stays persisted
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

        const isPublic = PUBLIC_PATHS.includes(pathname);
        if (isPublic && pathname !== "/branches" && pathname !== "/onboarding") {
          router.navigate({ to: "/" });
        }
      } catch (err) {
        console.error("Authentication error during boot phase:", err);
        const isPublic = PUBLIC_PATHS.includes(pathname);
        if (!isPublic) router.navigate({ to: "/landing" });
      } finally {
        setReady(true);
      }
    }

    checkAuth();

    // Track user session changes to prevent profile cross-leakage on same browser
    let currentUserId = "";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) currentUserId = session.user.id;
    });

    // Listen only for authentication events (login/logout), not tab switching.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("fs_active_branch");
        gym.reset();
        router.navigate({ to: "/landing" });
      } else if (event === "SIGNED_IN" && session?.user) {
        if (currentUserId && currentUserId !== session.user.id) {
          localStorage.removeItem("fs_active_branch");
          gym.reset();
          window.location.reload();
        }
        currentUserId = session.user.id;
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Run only once when the component mounts.

  if (!ready) {
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