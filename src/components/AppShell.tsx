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
} from "lucide-react";
import type { ReactNode } from "react";
import { useGym, gym } from "@/lib/gym-store";
import { useApplyTheme } from "@/lib/theme";
import { NotificationsBell } from "@/components/NotificationsBell";
import { logout } from "@/lib/auth";

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
  const members = useGym((s) => s.members);
  const settings = useGym((s) => s.settings);
  
  // Calculate today's check-in count
  const today = new Date().toDateString();
  const todayCount = members.filter((m) =>
    m.attendance.some((a) => new Date(a).toDateString() === today),
  ).length;
  const capacity = Math.min(100, Math.round((todayCount / Math.max(1, members.length)) * 100));

  // Handle user logout
  async function handleLogout() {
    await logout();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="no-print w-64 shrink-0 border-r border-border flex flex-col p-5 sticky top-0 h-screen">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-6 px-2">
          <div className="size-9 bg-brand rounded-lg grid place-items-center shadow-[0_0_24px_-4px_var(--color-brand)]">
            <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="font-heading text-xl tracking-tight text-foreground leading-none truncate">
              {settings.gymName.split(" ")[0].toUpperCase()}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">Gym OS</div>
          </div>
        </Link>

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
            <span className="text-foreground">{todayCount}</span>{" "}
            <span className="text-muted-foreground">of {members.length} checked in</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <div className="no-print sticky top-0 z-30 flex justify-end gap-2 px-8 py-4 bg-background/80 backdrop-blur border-b border-border/40">
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

        {children}
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
    <header className="flex items-end justify-between gap-4 mb-8 flex-wrap">
      <div>
        <h1 className="text-3xl font-heading text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 no-print">{actions}</div>}
    </header>
  );
}