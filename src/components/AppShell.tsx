import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BarChart3,
  Calculator,
  FileText,
  Wallet,
  CheckSquare,
  Clock,
  Dumbbell,
  Radio,
  Settings as SettingsIcon,
  MessageCircle,
  ShoppingBag,
  Download,
  Sun,
  Moon,
  LogOut,
  Building2,
  LifeBuoy,
  Menu,
  X,
} from "lucide-react";
import { type ReactNode, useState, useEffect } from "react";
import { useGym, gym } from "@/lib/gym-store";
import { useApplyTheme } from "@/lib/theme";
import { NotificationsBell } from "@/components/NotificationsBell";
import { logout } from "@/lib/auth";
import { supabase, getActiveBranchId } from "@/lib/supabase";

// Navigation configuration
type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/attendance", label: "Attendance", icon: Radio },
  { to: "/members", label: "Members", icon: Users },
  { to: "/members/new", label: "Add Member", icon: UserPlus },
  { to: "/reminders", label: "WhatsApp Reminders", icon: MessageCircle },
  { to: "/store", label: "Supplement Store", icon: ShoppingBag },
  { to: "/schedule", label: "Time Slots", icon: Clock },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/tools", label: "Fitness Tools", icon: Calculator },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/todos", label: "To-Do", icon: CheckSquare },
  { to: "/backup", label: "Backup & Export", icon: Download },
  { to: "/branches", label: "Branches", icon: Building2 },
  { to: "/help", label: "Help & Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

/**
 * Main application shell component that provides the sidebar layout
 * and global navigation for the gym management application.
 * 
 * @param children - The page content to render within the shell
 */
export function AppShell({ children }: { children: ReactNode }) {
  useApplyTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const settings = useGym((s) => s.settings);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Real-time capacity statistics from Supabase
  const [liveMemberCount, setLiveMemberCount] = useState(0);
  const [liveCheckInCount, setLiveCheckInCount] = useState(0);

  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    // Fetch total live member count
    supabase
      .from("members")
      .select("id", { count: "exact" })
      .eq("branch_id", branchId)
      .then(({ count }) => {
        setLiveMemberCount(count ?? 0);
      })
      .catch(err => console.error(err));

    const today = new Date().toISOString().split("T")[0];

    // Fetch uniquechecked-in members count for today
    const loadCheckInCount = () => {
      supabase
        .from("attendance_logs")
        .select("member_id")
        .eq("branch_id", branchId)
        .gte("checked_in_at", today + "T00:00:00")
        .lte("checked_in_at", today + "T23:59:59")
        .then(({ data }) => {
          const uniqueMemberIds = new Set(data?.map((log: any) => log.member_id));
          setLiveCheckInCount(uniqueMemberIds.size);
        })
        .catch(err => console.error(err));
    };

    loadCheckInCount();

    // Subscribe to real-time check-in log creations
    const channel = supabase
      .channel("appshell-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        (payload) => {
          const row = payload.new as any;
          if (row.branch_id === branchId) {
            loadCheckInCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname]); // Refresh on navigation changes

  const capacity = Math.min(100, Math.round((liveCheckInCount / Math.max(1, liveMemberCount)) * 100));

  // Handle user logout
  async function handleLogout() {
    await logout();
    navigate({ to: "/auth" });
  }

  // Close mobile menu on pathname change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Mobile Top Bar */}
      <div className="no-print md:hidden flex items-center justify-between px-4 py-3 bg-background border-b border-border sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 bg-brand rounded-lg grid place-items-center shadow-[0_0_16px_-4px_var(--color-brand)]">
            <Dumbbell className="size-4.5 text-brand-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-heading text-lg tracking-tight text-foreground uppercase">
            {settings.gymName.split(" ")[0]}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="size-10 rounded-xl bg-card border border-border grid place-items-center"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop / Collapsible Overlay for Mobile */}
      <aside
        className={
          "no-print shrink-0 border-r border-border flex flex-col p-5 bg-background transition-all duration-300 z-40 " +
          "md:w-64 md:sticky md:top-0 md:h-screen md:flex " +
          (mobileMenuOpen
            ? "fixed inset-y-0 left-0 w-72 flex h-full border-r border-border"
            : "hidden")
        }
      >
        {/* Logo and Mobile Close Button */}
        <div className="flex items-center justify-between mb-6 px-2">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-9 bg-brand rounded-lg grid place-items-center shadow-[0_0_24px_-4px_var(--color-brand)]">
              <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="font-heading text-xl tracking-tight text-foreground leading-none truncate uppercase">
                {settings.gymName.split(" ")[0]}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">Gym OS</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden size-8 rounded-lg bg-secondary grid place-items-center text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-0.5 flex-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as "/"}
                className={
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " +
                  (active
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                }
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Capacity Widget */}
        <div className="mt-4 p-4 bg-card rounded-xl border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Today's Capacity</p>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-brand transition-all" style={{ width: `${capacity}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium">
            <span className="text-foreground">{liveCheckInCount}</span>{" "}
            <span className="text-muted-foreground">of {liveMemberCount} checked in</span>
          </p>
        </div>
      </aside>

      {/* Dimmed backdrop when mobile menu is open */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top Bar */}
        <div className="no-print hidden md:flex sticky top-0 z-30 justify-end gap-2 px-8 py-4 bg-background/80 backdrop-blur border-b border-border/40">
          {/* Theme Toggle */}
          <button
            onClick={() => gym.updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
            className="size-10 rounded-xl bg-card border border-border hover:border-brand/40 grid place-items-center transition"
            aria-label="Toggle theme"
          >
            {settings.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          
          {/* Notifications */}
          <NotificationsBell />
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="h-10 px-4 rounded-xl bg-card border border-border hover:border-danger/40 hover:text-danger flex items-center gap-2 text-sm transition"
            aria-label="Logout"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Children Render Area */}
        <div className="flex-1 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Page header component with title, subtitle, and optional action buttons
 * 
 * @param title - The main page title
 * @param subtitle - Optional subtitle text
 * @param actions - Optional action buttons or elements
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 flex-wrap">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 no-print flex-wrap">{actions}</div>}
    </header>
  );
}