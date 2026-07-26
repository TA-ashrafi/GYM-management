import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users, TrendingUp, AlertTriangle, Wallet, CheckCircle2,
  Activity, ArrowUpRight, Bell, Clock, Radio, GripVertical, Eye, EyeOff, RotateCcw,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import {
  useGym, daysSince, daysUntil, money, gym,
  DEFAULT_LAYOUT, type WidgetId,
} from "@/lib/gym-store";
import { supabase, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — IronSync" },
      { name: "description", content: "Real-time overview of your gym: members, dues, attendance, expenses." },
    ],
  }),
  component: Dashboard,
});

const WIDGET_LABELS: Record<WidgetId, string> = {
  kpi: "KPI Cards",
  money: "Money Row",
  chart: "Footfall & Revenue Chart",
  maintenance: "Maintenance Tasks",
  ghosts: "Scan Bypass / Ghosts",
  expiring: "Expiring Members",
};

function Dashboard() {
  const [members, setMembers] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Real-time fetch from Supabase — current branch only
  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    // Members
    supabase
      .from("members")
      .select("*")
      .eq("branch_id", branchId)
      .then(({ data }) => setMembers(data ?? []));

    // Today's attendance
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("attendance_logs")
      .select("*")
      .eq("branch_id", branchId)
      .gte("checked_in_at", today + "T00:00:00")
      .lte("checked_in_at", today + "T23:59:59")
      .then(({ data }) => setTodayLogs(data ?? []));

    // Todos (open only)
    supabase
      .from("todos")
      .select("*")
      .eq("branch_id", branchId)
      .eq("done", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTodos(data ?? []));

    // Expenses
    supabase
      .from("expenses")
      .select("*")
      .eq("branch_id", branchId)
      .order("date", { ascending: false })
      .then(({ data }) => setExpenses(data ?? []));

    // Real-time attendance
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        (payload) => {
          const row = payload.new as any;
          if (row.branch_id === branchId) {
            setTodayLogs((prev) => [...prev, row]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const settings = useGym((s) => s.settings);
  const layout = settings.dashboardLayout?.length ? settings.dashboardLayout : DEFAULT_LAYOUT;
  const [customize, setCustomize] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);

  const stats = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, pendingAmt = 0, revenue = 0;

    members.forEach((m) => {
      const d = daysUntil(m.expiryDate);
      if (d < 0) {
        expired++;
        pendingAmt += m.feeAmount;
      } else if (d <= 7) {
        expiring++;
      } else {
        active++;
      }
      if (m.feePaid) revenue += m.feeAmount;
    });

    const expenseTotal = expenses.reduce((a: number, e: any) => a + (e.amount ?? 0), 0);
    return { active, expiring, expired, pendingAmt, revenue, expenseTotal };
  }, [members, expenses]);

  const todayCheckIns = useMemo(() => {
    const inMemberIds = new Set(
      todayLogs
        .filter((l: any) => (l.punch_type ?? "in") === "in")
        .map((l: any) => l.member_id)
    );
    return inMemberIds.size;
  }, [todayLogs]);

  const trend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const label = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const visits = todayLogs.filter((l: any) =>
        l.checked_in_at?.startsWith(dateStr) && (l.punch_type ?? "in") === "in"
      ).length;
      const revenue = members
        .filter((m) => m.joinDate?.startsWith(dateStr) && m.feePaid)
        .reduce((sum: number, m: any) => sum + m.feeAmount, 0);
      days.push({ d: label, revenue, visits });
    }
    return days;
  }, [todayLogs, members]);

  const ghostList = useMemo(() => {
    const todayPunchedIn = new Set(
      todayLogs
        .filter((l: any) => (l.punch_type ?? "in") === "in")
        .map((l: any) => l.member_id)
    );
    return members.filter((m) => {
      const d = daysUntil(m.expiryDate);
      return d >= 0 && !todayPunchedIn.has(m.id);
    }).slice(0, 5);
  }, [members, todayLogs]);

  const expiringList = members
    .filter((m) => { const d = daysUntil(m.expiryDate); return d < 0 || d <= 7; })
    .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate))
    .slice(0, 5);

  const openTodos = todos.slice(0, 4);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  function move(from: number, to: number) {
    if (to < 0 || to >= layout.length) return;
    const next = [...layout];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    gym.setLayout(next);
  }
  function toggle(id: WidgetId) {
    gym.setLayout(layout.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }
  function onDrop(targetId: WidgetId) {
    if (!dragId || dragId === targetId) return;
    const from = layout.findIndex((w) => w.id === dragId);
    const to = layout.findIndex((w) => w.id === targetId);
    move(from, to);
    setDragId(null);
  }

  const widgets: Record<WidgetId, React.ReactNode> = {
    kpi: (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi to="/members" label="Total Members" value={members.length} icon={<Users className="size-4" />} />
        <Kpi to="/members" search={{ filter: "active" }} label="Active" value={stats.active} icon={<CheckCircle2 className="size-4" />} accent="text-brand" />
        <Kpi to="/members" search={{ filter: "expiring" }} label="Expiring (7d)" value={stats.expiring} icon={<Clock className="size-4" />} accent="text-warn" />
        <Kpi to="/members" search={{ filter: "expired" }} label="Expired" value={stats.expired} icon={<AlertTriangle className="size-4" />} accent="text-danger" />
        <Kpi to="/members" search={{ filter: "ghost" }} label="Ghosts" value={ghostList.length} icon={<Bell className="size-4" />} accent="text-danger" hint="No-shows 4d+" />
        <Kpi to="/attendance" label="Today In" value={todayCheckIns} icon={<Activity className="size-4" />} accent="text-info" />
      </div>
    ),
    money: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MoneyCard to="/analytics" label="Collected this cycle" value={money(stats.revenue)} sub={`${members.length - stats.expired} paid`} tone="brand" icon={<TrendingUp className="size-5" />} />
        <MoneyCard to="/members" search={{ filter: "expired" }} label="Pending Dues" value={money(stats.pendingAmt)} sub={`${stats.expired} expired members`} tone="danger" icon={<Wallet className="size-5" />} />
        <MoneyCard to="/expenses" label="Monthly Expenses" value={money(stats.expenseTotal)} sub={`${expenses.length} entries`} tone="muted" icon={<Wallet className="size-5" />} />
      </div>
    ),
    chart: (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-lg font-heading text-foreground">Footfall & Revenue</h2>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </div>
          <Link to="/analytics" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
            Open analytics <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="visits" stroke="var(--color-accent)" fill="url(#g2)" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-brand)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    maintenance: (
      <Link to="/todos" className="bg-card border border-border rounded-2xl p-6 hover:border-brand/30 transition-colors block">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-foreground">Maintenance</h3>
          <span className="text-xs text-muted-foreground">All →</span>
        </div>
        <div className="space-y-2">
          {openTodos.length === 0 && <p className="text-sm text-muted-foreground">All caught up 🎉</p>}
          {openTodos.map((t) => (
            <div key={t.id}
              className={"p-3 bg-secondary/40 rounded-lg border-l-2 flex items-start justify-between gap-3 " +
                (t.priority === "high" ? "border-danger" : t.priority === "med" ? "border-warn" : "border-accent")}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
                {t.note && <p className="text-xs text-muted-foreground truncate">{t.note}</p>}
              </div>
              <button onClick={(e) => { e.preventDefault(); }}
                className="text-[10px] uppercase tracking-wider text-brand hover:underline shrink-0">
                Done
              </button>
            </div>
          ))}
        </div>
      </Link>
    ),
    ghosts: (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-heading text-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-danger animate-pulse" />
              Scan Bypass Alerts
            </h2>
            <p className="text-xs text-muted-foreground">Members not punching RFID for 4+ days</p>
          </div>
          <Link to="/members" search={{ filter: "ghost" }} className="text-xs text-brand hover:underline">View all</Link>
        </div>
        {ghostList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sab regular hain. 💪</p>
        ) : (
          <div className="divide-y divide-border">
            {ghostList.map((m) => {
              const last = m.attendance?.[0];
              return (
                <div key={m.id} className="py-3 flex items-center gap-4">
                  <img src={m.photo} alt={m.name} className="size-10 rounded-full object-cover ring-1 ring-border" width={40} height={40} loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.rollNo} · {m.plan}</p>
                  </div>
                  <span className="px-2 py-1 bg-danger/10 text-danger text-[10px] rounded uppercase font-bold tracking-wider">
                    No-show {last ? daysSince(last) : "30+"}d
                  </span>
                  <Link to="/reminders" className="text-xs text-brand hover:underline shrink-0">Remind</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    expiring: (
      <Link to="/members" search={{ filter: "expiring" }} className="bg-card border border-border rounded-2xl p-6 hover:border-brand/30 transition-colors block">
        <h3 className="font-heading text-lg text-foreground mb-4">Expiring / Expired</h3>
        <div className="space-y-3">
          {expiringList.map((m) => {
            const d = daysUntil(m.expiryDate);
            return (
              <div key={m.id} className="flex items-center gap-3">
                <img src={m.photo} alt={m.name} className="size-9 rounded-full object-cover ring-1 ring-border" width={36} height={36} loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d < 0 ? `Expired ${-d}d ago` : d === 0 ? "Expires today" : `${d}d left`}
                  </p>
                </div>
                <button onClick={(e) => {
                    e.preventDefault();
                    const next = new Date();
                    next.setDate(next.getDate() + 30);
                    gym.updateMember(m.id, { expiryDate: next.toISOString(), feePaid: true });
                  }}
                  className="text-[10px] uppercase tracking-wider text-brand hover:underline">
                  Renew
                </button>
              </div>
            );
          })}
        </div>
      </Link>
    ),
  };

  return (
    <div className="p-8 max-w-[1600px]">
      <PageHeader
        title="Gym Overview"
        subtitle={`${greet}, ${settings.ownerName} 🏋️ — ${settings.gymName}`}
        actions={
          <>
            <button onClick={() => setCustomize((v) => !v)}
              className="px-4 py-2.5 bg-secondary text-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 hover:bg-brand/10 hover:text-brand">
              <GripVertical className="size-4" /> {customize ? "Done" : "Customize"}
            </button>
            <Link to="/attendance" className="px-5 py-2.5 bg-secondary text-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 hover:bg-brand/10 hover:text-brand transition">
              <Radio className="size-4" /> Punch In
            </Link>
            <Link to="/members/new" className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl hover:scale-[1.02] active:scale-95 transition-transform text-sm">
              + New Member
            </Link>
          </>
        }
      />

      {customize && (
        <div className="mb-6 p-5 bg-card border border-dashed border-brand/40 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-heading text-base">Customize Dashboard</h3>
              <p className="text-xs text-muted-foreground">Drag widgets to reorder, eye-icon to show/hide</p>
            </div>
            <button onClick={() => gym.setLayout(DEFAULT_LAYOUT)}
              className="text-xs text-muted-foreground hover:text-brand inline-flex items-center gap-1">
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {layout.map((w, i) => (
              <div key={w.id} className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                <GripVertical className="size-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{WIDGET_LABELS[w.id]}</span>
                <button onClick={() => move(i, i - 1)} className="text-xs text-muted-foreground hover:text-brand px-1" aria-label="Move up">↑</button>
                <button onClick={() => move(i, i + 1)} className="text-xs text-muted-foreground hover:text-brand px-1" aria-label="Move down">↓</button>
                <button onClick={() => toggle(w.id)} className="size-7 grid place-items-center rounded hover:bg-secondary" aria-label="Toggle visibility">
                  {w.visible ? <Eye className="size-3.5 text-brand" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {layout.filter((w) => w.visible).map((w) => (
          <div
            key={w.id}
            draggable={customize}
            onDragStart={() => setDragId(w.id)}
            onDragOver={(e) => { if (customize) e.preventDefault(); }}
            onDrop={() => onDrop(w.id)}
            className={customize ? "relative ring-2 ring-dashed ring-border rounded-2xl cursor-move transition " + (dragId === w.id ? "opacity-50" : "") : ""}
          >
            {customize && (
              <div className="absolute -top-3 left-4 px-2 py-0.5 bg-brand text-brand-foreground text-[10px] uppercase tracking-widest rounded font-bold z-10">
                {WIDGET_LABELS[w.id]}
              </div>
            )}
            {widgets[w.id]}
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ to, search, label, value, icon, accent, hint }: {
  to: string; search?: Record<string, string>; label: string; value: number | string;
  icon: React.ReactNode; accent?: string; hint?: string;
}) {
  return (
    <Link to={to as "/"} search={search as never}
      className="p-5 bg-card border border-border rounded-xl hover:border-brand/40 hover:bg-card/80 transition block group">
      <div className="flex items-center justify-between text-muted-foreground mb-2">
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
        <span className="group-hover:text-brand transition">{icon}</span>
      </div>
      <p className={"text-3xl font-heading " + (accent ?? "text-foreground")}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </Link>
  );
}

function MoneyCard({ to, search, label, value, sub, tone, icon }: {
  to: string; search?: Record<string, string>; label: string; value: string; sub: string;
  tone: "brand" | "danger" | "muted"; icon: React.ReactNode;
}) {
  const accent = tone === "brand" ? "text-brand bg-brand/10" : tone === "danger" ? "text-danger bg-danger/10" : "text-muted-foreground bg-secondary";
  return (
    <Link to={to as "/"} search={search as never}
      className="p-6 bg-card border border-border rounded-2xl flex items-center gap-4 hover:border-brand/30 transition">
      <div className={"size-12 rounded-xl grid place-items-center " + accent}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-heading text-foreground mt-1">{value}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </Link>
  );
}