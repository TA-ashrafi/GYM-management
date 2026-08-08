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

const PUBLIC_PATHS = ["/auth", "/landing", "/login", "/onboarding"];

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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
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
      setReady(true);
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
        <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden select-none">
          {/* Subtle dark grid background texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px]" />

          <div className="text-center relative z-10 space-y-6">
            <div className="relative inline-block px-8 py-6 rounded-[24px] bg-zinc-900/50 border border-zinc-800 shadow-3xl backdrop-blur-md overflow-hidden group">
              {/* Sliding shine streak animation */}
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60 animate-shine" />

              {/* Embossed high-contrast text */}
              <h1 className="text-4xl sm:text-5xl font-heading font-black tracking-widest text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] shadow-inner text-shadow-embossed select-none">
                ALPHA FITNESS
              </h1>

              <div className="h-[2px] w-24 bg-brand/40 mx-auto my-3 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-brand animate-ping opacity-60" />
              </div>

              <p className="text-[10px] text-brand font-black uppercase tracking-[0.3em]">
                YOUR GYM OPERATING SYSTEM
              </p>
            </div>

            <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase animate-pulse">
              Securing Session...
            </p>
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