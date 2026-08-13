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
import { NotificationsBell } from "@/components/NotificationsBell";
import { supabase, getActiveBranchId, clearActiveBranch } from "@/lib/supabase";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const settings = useGym((s) => s.settings);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Real-time capacity statistics from Supabase
  const [liveMemberCount, setLiveMemberCount] = useState(0);
  const [liveCheckInCount, setLiveCheckInCount] = useState(0);

  // Load user session
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    // Fetch unique checked-in members count for today
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
    clearActiveBranch();
    gym.reset(); // Completely wipe the local cache state on log out
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  // Close mobile menu on pathname change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "Gym Owner";
  const initials = (name[0] || "O").toUpperCase();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300">
      {/* Mobile Top Bar - Clean Grid with perfect centring */}
      <div className="no-print md:hidden grid grid-cols-3 items-center px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/60 sticky top-0 z-40 transition-colors">
        {/* Left: Mobile Menu Trigger */}
        <div className="flex justify-start">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="size-10 rounded-xl bg-card border border-border/80 grid place-items-center cursor-pointer shadow-sm hover:scale-95 active:scale-90 transition-transform"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Center: Full Brand Logo & Centered Title */}
        <div className="flex justify-center min-w-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="size-8 bg-brand rounded-lg grid place-items-center shadow-[0_0_16px_-4px_var(--color-brand)] shrink-0 animate-pulse">
              <Dumbbell className="size-4 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-sm sm:text-base tracking-tight text-foreground uppercase truncate font-bold">
              {settings.gymName}
            </span>
          </Link>
        </div>

        {/* Right: Notifications Button */}
        <div className="flex justify-end">
          <NotificationsBell />
        </div>
      </div>

      {/* Sidebar for Desktop / Collapsible Overlay for Mobile */}
      <aside
        className={
          "no-print shrink-0 border-r border-border/60 flex flex-col p-5 bg-background transition-all duration-300 z-40 " +
          "md:w-64 md:sticky md:top-0 md:h-screen md:flex " +
          (mobileMenuOpen
            ? "fixed inset-y-0 left-0 w-72 flex h-full border-r border-border shadow-2xl"
            : "hidden")
        }
      >
        {/* Logo and Mobile Close Button */}
        <div className="flex items-center justify-between mb-6 px-2">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="size-9 bg-brand rounded-lg grid place-items-center shadow-[0_0_24px_-4px_var(--color-brand)] shrink-0">
              <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-heading text-base tracking-tight text-foreground leading-none truncate uppercase font-bold" title={settings.gymName}>
                {settings.gymName}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">ALPHA FITNESS</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden size-8 rounded-lg bg-secondary grid place-items-center text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as "/"}
                className={
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group relative overflow-hidden " +
                  (active
                    ? "bg-brand/10 text-brand font-bold shadow-[inset_4px_0_0_0_var(--color-brand)]"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")
                }
              >
                <Icon className="size-4.5 group-hover:scale-110 transition-transform shrink-0" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Capacity Widget */}
        <div className="mt-4 p-4 bg-card border border-border/80 rounded-2xl shadow-sm">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-semibold">Today's Capacity</p>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${capacity}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold">
            <span className="text-foreground">{liveCheckInCount}</span>{" "}
            <span className="text-muted-foreground">of {liveMemberCount} checked in</span>
          </p>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-border/40" />

        {/* Sidebar Account Section */}
        <div className="p-3 bg-secondary/40 border border-border/40 rounded-2xl flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 bg-brand/10 text-brand rounded-lg grid place-items-center text-[10px] font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-foreground truncate">
                {name}
              </p>
              <p className="text-[9px] text-muted-foreground truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => gym.updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
              className="size-8 rounded-lg bg-card border border-border/80 hover:border-brand/40 grid place-items-center cursor-pointer transition"
              title="Toggle theme"
            >
              {settings.theme === "dark" ? <Sun className="size-4 text-muted-foreground hover:text-foreground" /> : <Moon className="size-4 text-muted-foreground hover:text-foreground" />}
            </button>
            <button
              onClick={handleLogout}
              className="size-8 rounded-lg bg-card border border-border/80 hover:bg-danger/10 hover:text-danger grid place-items-center cursor-pointer transition"
              title="Log out"
            >
              <LogOut className="size-4 text-muted-foreground hover:text-danger" />
            </button>
          </div>
        </div>
      </aside>

      {/* Dimmed backdrop when mobile menu is open */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top Bar */}
        <div className="no-print hidden md:flex sticky top-0 z-30 justify-end gap-2 px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/40">
          {/* Theme Toggle */}
          <button
            onClick={() => gym.updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
            className="size-10 rounded-xl bg-card border border-border/80 hover:border-brand/40 grid place-items-center transition cursor-pointer hover:scale-95 shadow-sm"
            aria-label="Toggle theme"
          >
            {settings.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          
          {/* Notifications */}
          <NotificationsBell />
          
          {/* Account Profile Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="h-10 px-3.5 rounded-xl bg-card border border-border/80 hover:border-brand/40 flex items-center gap-2 text-sm transition cursor-pointer hover:scale-95 shadow-sm font-semibold text-foreground select-none"
              aria-label="Account Menu"
            >
              <div className="size-6 bg-brand/10 text-brand rounded-lg grid place-items-center text-xs font-bold">
                {initials}
              </div>
              <span className="hidden sm:inline">Account</span>
            </button>

            {userDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-2xl p-4 shadow-2xl z-50 animate-fade-in text-left">
                  <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                    <div className="size-10 bg-brand/10 text-brand rounded-xl grid place-items-center text-sm font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>

                  <div className="py-2.5 my-1 text-xs space-y-1 text-muted-foreground font-semibold">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-brand font-bold">Authenticated</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Branch:</span>
                      <span className="text-foreground max-w-[150px] truncate">{settings.gymName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full mt-2 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="size-4" />
                    Sign Out Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Children Render Area */}
        <div className="flex-1 w-full animate-fade-in">
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
      <div className="space-y-0.5">
        <h1 className="text-2xl sm:text-3xl font-heading text-foreground font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 no-print flex-wrap w-full sm:w-auto">{actions}</div>}
    </header>
  );
}
