import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import {
  supabase,
  getActiveBranchId,
  fetchBranches,
  setActiveBranchId,
} from "@/lib/supabase";
import { gym } from "@/lib/gym-store";
import { useApplyTheme } from "@/lib/theme";

const PUBLIC_PATHS = ["/auth", "/landing", "/login", "/onboarding"];

// Session-level caching layer to prevent redundant Supabase queries and heavy lag/hang on page transitions
let cachedSession: any = null;
let cachedBranches: any[] | null = null;
let hasLoadedInitialAuth = false;

export function invalidateAuthCache() {
  cachedSession = null;
  cachedBranches = null;
  hasLoadedInitialAuth = false;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "ALPHA FITNESS — Premium Fitness streak" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap",
        },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
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

  // Apply theme & preset globally at root level, ensuring perfect persistence across logins, logouts, reloads, and landing/auth screens instantly!
  useApplyTheme();

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // 1. Run auth check on mount and pathname transitions
  useEffect(() => {
    async function checkAuth() {
      // 1. Password Recovery Bypass
      const isRecovery =
        pathname === "/auth" &&
        (window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery") ||
          window.location.hash.includes("recovery") ||
          window.location.search.includes("recovery"));

      if (isRecovery) {
        setReady(true);
        return;
      }

      let session = cachedSession;
      let branches = cachedBranches;

      if (!hasLoadedInitialAuth) {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        session = currentSession;
        cachedSession = currentSession;

        if (currentSession) {
          branches = await fetchBranches();
          cachedBranches = branches;
        }
        hasLoadedInitialAuth = true;
      }

      // 2. No session
      if (!session) {
        const isPublic = PUBLIC_PATHS.includes(pathname);
        if (!isPublic) {
          router.navigate({ to: "/landing" });
        }
        setReady(true);
        return;
      }

      // 3. Session + 0 branches
      if (!branches || branches.length === 0) {
        localStorage.removeItem("fs_active_branch"); // Safe cleanup
        gym.reset(); // Wipe any old cached records
        if (pathname !== "/onboarding") {
          router.navigate({ to: "/onboarding" });
        }
        setReady(true);
        return;
      }

      // 4. Session + 1 branch
      if (branches.length === 1) {
        const singleBranch = branches[0];
        setActiveBranchId(singleBranch.id);

        const currentSettings = gym.getSettings();
        if (
          currentSettings.gymName !== (singleBranch.gym_name ?? "ALPHA FITNESS") ||
          currentSettings.theme !== (singleBranch.theme ?? "dark") ||
          currentSettings.preset !== (singleBranch.preset ?? "lime")
        ) {
          gym.updateSettings({
            gymName: singleBranch.gym_name ?? "ALPHA FITNESS",
            theme: singleBranch.theme ?? "dark",
            preset: singleBranch.preset ?? "lime",
            slotDurationMin: singleBranch.slot_duration_min ?? 60,
            slotCapacity: singleBranch.slot_capacity ?? 20,
            currency: singleBranch.currency ?? "INR",
            language: singleBranch.language ?? "hinglish",
          });
        }

        const isPublic = PUBLIC_PATHS.includes(pathname);
        if (isPublic) {
          router.navigate({ to: "/" });
        }
        setReady(true);
        return;
      }

      // 5. Session + multiple branches
      if (branches.length > 1) {
        const activeBranchId = getActiveBranchId();
        let validBranch = branches.find((b: any) => b.id === activeBranchId);

        if (!validBranch) {
          if (pathname !== "/branches") {
            router.navigate({ to: "/branches" });
          }
        } else {
          const currentSettings = gym.getSettings();
          if (
            currentSettings.gymName !== (validBranch.gym_name ?? "ALPHA FITNESS") ||
            currentSettings.theme !== (validBranch.theme ?? "dark") ||
            currentSettings.preset !== (validBranch.preset ?? "lime")
          ) {
            gym.updateSettings({
              gymName: validBranch.gym_name ?? "ALPHA FITNESS",
              theme: validBranch.theme ?? "dark",
              preset: validBranch.preset ?? "lime",
              slotDurationMin: validBranch.slot_duration_min ?? 60,
              slotCapacity: validBranch.slot_capacity ?? 20,
              currency: validBranch.currency ?? "INR",
              language: validBranch.language ?? "hinglish",
            });
          }

          const isPublic = PUBLIC_PATHS.includes(pathname);
          if (isPublic) {
            router.navigate({ to: "/" });
          }
        }
        setReady(true);
        return;
      }
    }

    checkAuth();
  }, [pathname]);

  // 2. Track auth state changes only once on mount
  useEffect(() => {
    let currentUserId = "";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) currentUserId = session.user.id;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        cachedSession = null;
        cachedBranches = null;
        hasLoadedInitialAuth = false;
        localStorage.removeItem("fs_active_branch");
        gym.reset();
        router.navigate({ to: "/landing" });
      } else if (event === "SIGNED_IN" && session?.user) {
        const isRecovery =
          window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery");
        if (isRecovery) return;

        cachedSession = session;
        cachedBranches = await fetchBranches();
        hasLoadedInitialAuth = true;

        if (currentUserId && currentUserId !== session.user.id) {
          localStorage.removeItem("fs_active_branch");
          gym.reset();
          window.location.reload();
        }
        currentUserId = session.user.id;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      {isPublic ? (
        <Outlet />
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
      <Toaster position="top-right" />

      {/* Interactive cursor glow trail */}
      <div
        className="custom-cursor-glow hidden sm:block"
        style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      />
    </QueryClientProvider>
  );
}
