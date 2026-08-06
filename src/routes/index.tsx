import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users, TrendingUp, AlertTriangle, Wallet, CheckCircle2,
  Activity, ArrowUpRight, Bell, Clock, Radio, GripVertical, Eye, EyeOff, RotateCcw, X, CreditCard, Save
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import {
  useGym, daysUntil, money, gym,
  DEFAULT_LAYOUT, type WidgetId, type PlanType
} from "@/lib/gym-store";
import { supabase, getActiveBranchId } from "@/lib/supabase";
import { toast } from "sonner";

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

const PLAN_ORDER: PlanType[] = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

function Dashboard() {
  const [members, setMembers] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [chartLogs, setChartLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [storeSales, setStoreSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [renewingMember, setRenewingMember] = useState<any | null>(null);

  const [cycleStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchDashboardData = () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    supabase
      .from("members")
      .select("*")
      .eq("branch_id", branchId)
      .then(({ data }) => setMembers(data ?? []));

    // Products — cost lookup ke liye
    supabase
      .from("products")
      .select("id, cost, price")
      .eq("branch_id", branchId)
      .then(({ data }) => setProducts(data ?? []));

    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("attendance_logs")
      .select("*")
      .eq("branch_id", branchId)
      .gte("checked_in_at", today + "T00:00:00")
      .lte("checked_in_at", today + "T23:59:59")
      .then(({ data }) => setTodayLogs(data ?? []));

    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - 13);
    chartStart.setHours(0, 0, 0, 0);
    supabase
      .from("attendance_logs")
      .select("*")
      .eq("branch_id", branchId)
      .gte("checked_in_at", chartStart.toISOString())
      .then(({ data }) => setChartLogs(data ?? []));

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    fourDaysAgo.setHours(0, 0, 0, 0);
    supabase
      .from("attendance_logs")
      .select("member_id, checked_in_at")
      .eq("branch_id", branchId)
      .gte("checked_in_at", fourDaysAgo.toISOString())
      .then(({ data }) => setAllLogs(data ?? []));

    supabase
      .from("todos")
      .select("*")
      .eq("branch_id", branchId)
      .eq("done", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTodos(data ?? []));

    // Monthly expenses — date field ke gte se (fixing 0 entries bug)
    supabase
      .from("expenses")
      .select("*")
      .eq("branch_id", branchId)
      .gte("date", cycleStart.toISOString())
      .order("date", { ascending: false })
      .then(({ data }) => setExpenses(data ?? []));

    Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("branch_id", branchId)
        .gte("payment_date", cycleStart.toISOString()),
      supabase
        .from("sales")
        .select("*")
        .eq("branch_id", branchId)
        .gte("created_at", cycleStart.toISOString()),
      supabase
        .from("members")
        .select("id, fee_amount, fee_paid, created_at")
        .eq("branch_id", branchId)
        .gte("created_at", cycleStart.toISOString()),
    ]).then(([payRes, salesRes, membersRes]) => {
      const payData = payRes.data ?? [];
      const salesData = salesRes.data ?? [];
      const newMembers = membersRes.data ?? [];

      const existingPaymentMemberIds = new Set(payData.map((p: any) => p.member_id));

      const extraPayments = newMembers
        .filter((m: any) => {
          const paid = m.fee_paid ?? false;
          return paid && !existingPaymentMemberIds.has(m.id);
        })
        .map((m: any) => ({
          amount: m.fee_amount ?? 0,
          member_id: m.id,
          note: "Legacy join (no payment row)",
        }));

      setPayments([...payData, ...extraPayments]);
      setStoreSales(salesData);
    });
  };

  useEffect(() => {
    fetchDashboardData();

    const branchId = getActiveBranchId();
    if (!branchId) return;

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        (payload) => {
          const row = payload.new as any;
          if (row.branch_id === branchId) {
            setTodayLogs((prev) => [...prev, row]);
            setChartLogs((prev) => [...prev, row]);
            setAllLogs((prev) => [...prev, { member_id: row.member_id, checked_in_at: row.checked_in_at }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleStart]);

  const settings = useGym((s) => s.settings);
  const layout = settings.dashboardLayout?.length ? settings.dashboardLayout : DEFAULT_LAYOUT;
  const [customize, setCustomize] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);

  // Store profit = (sell - cost) × qty — cost products table se
  const storeRevenue = useMemo(() => {
    return storeSales.reduce((total: number, sale: any) => {
      const items = Array.isArray(sale.items) ? sale.items : [];
      if (items.length === 0) return total + (sale.total ?? 0);

      return (
        total +
        items.reduce((sum: number, item: any) => {
          const productId = item.productId ?? item.product_id;
          const product = products.find((p: any) => p.id === productId);
          const cost = product?.cost ?? item.cost ?? 0;
          const sellPrice = item.price ?? 0;
          const qty = item.qty ?? item.quantity ?? 1;
          return sum + (sellPrice - cost) * qty;
        }, 0)
      );
    }, 0);
  }, [storeSales, products]);

  const stats = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, pendingAmt = 0;

    members.forEach((m: any) => {
      const expiryDate = m.expiry_date ?? m.expiryDate;
      const feePaid = m.fee_paid ?? m.feePaid;
      const feeAmount = m.fee_amount ?? m.feeAmount ?? 0;

      const d = daysUntil(expiryDate);
      if (d < 0) {
        expired++;
        pendingAmt += feeAmount;
      } else if (d <= 7) {
        expiring++;
      } else {
        active++;
      }
      if (!feePaid && d >= 0) pendingAmt += feeAmount;
    });

    const memberRevenue = payments.reduce((a: number, p: any) => a + (p.amount ?? 0), 0);
    const totalCycleRevenue = memberRevenue + storeRevenue;
    const expenseTotal = expenses.reduce((a: number, e: any) => a + (e.amount ?? 0), 0);

    return {
      active,
      expiring,
      expired,
      pendingAmt,
      memberRevenue,
      storeRevenue,
      totalCycleRevenue,
      expenseTotal,
      paymentCount: payments.length,
    };
  }, [members, expenses, payments, storeRevenue]);

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

      const visits = chartLogs.filter((l: any) => {
        const logDate = new Date(l.checked_in_at).toISOString().split("T")[0];
        return logDate === dateStr && (l.punch_type ?? "in") === "in";
      }).length;

      const dayRevenue = payments
        .filter((p: any) => {
          const raw = p.payment_date ?? p.created_at;
          if (!raw) return false;
          const pDate = new Date(raw).toISOString().split("T")[0];
          return pDate === dateStr;
        })
        .reduce((a: number, p: any) => a + (p.amount ?? 0), 0);

      days.push({ d: label, revenue: dayRevenue, visits });
    }
    return days;
  }, [chartLogs, payments]);

  const ghostList = useMemo(() => {
    const activeMembers = members.filter((m: any) => {
      const d = daysUntil(m.expiry_date ?? m.expiryDate);
      return d >= 0;
    });

    const recentMemberIds = new Set(allLogs.map((l: any) => l.member_id));

    return activeMembers
      .filter((m: any) => !recentMemberIds.has(m.id))
      .slice(0, 5);
  }, [members, allLogs]);

  const expiringList = members
    .filter((m) => {
      const d = daysUntil(m.expiry_date ?? m.expiryDate);
      return d < 0 || d <= 7;
    })
    .sort(
      (a, b) =>
        daysUntil(a.expiry_date ?? a.expiryDate) - daysUntil(b.expiry_date ?? b.expiryDate)
    )
    .slice(0, 5);

  const openTodos = todos.slice(0, 4);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const cycleLabel = cycleStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Kpi to="/members" label="Total Members" value={members.length} icon={<Users className="size-4" />} />
        <Kpi to="/members" search={{ filter: "active" }} label="Active" value={stats.active} icon={<CheckCircle2 className="size-4" />} accent="text-brand" />
        <Kpi to="/members" search={{ filter: "expiring" }} label="Expiring (7d)" value={stats.expiring} icon={<Clock className="size-4" />} accent="text-warn" />
        <Kpi to="/members" search={{ filter: "expired" }} label="Expired" value={stats.expired} icon={<AlertTriangle className="size-4" />} accent="text-danger" />
        <Kpi to="/members" search={{ filter: "ghost" }} label="Ghosts" value={ghostList.length} icon={<Bell className="size-4" />} accent="text-danger" hint="No-shows 4d+" />
        <Kpi to="/attendance" label="Today In" value={todayCheckIns} icon={<Activity className="size-4" />} accent="text-info" />
      </div>
    ),
    money: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <MoneyCard
          to="/analytics"
          label="Collected This Cycle"
          value={money(stats.totalCycleRevenue)}
          sub={`${stats.paymentCount} payments · ₹${stats.storeRevenue.toLocaleString("en-IN")} store profit · ${cycleLabel}`}
          tone="brand"
          icon={<TrendingUp className="size-5" />}
        />
        <MoneyCard
          to="/members"
          search={{ filter: "expired" }}
          label="Pending Dues"
          value={money(stats.pendingAmt)}
          sub={`${stats.expired} expired members`}
          tone="danger"
          icon={<Wallet className="size-5" />}
        />
        <MoneyCard
          to="/expenses"
          label="Monthly Expenses"
          value={money(stats.expenseTotal)}
          sub={`${expenses.length} entries`}
          tone="muted"
          icon={<Wallet className="size-5" />}
        />
      </div>
    ),
    chart: (
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
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
            <AreaChart data={trend} margin={{ left: -25, right: 8, top: 8, bottom: 0 }}>
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
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="visits" stroke="var(--color-accent)" fill="url(#g2)" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-brand)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    maintenance: (
      <Link to="/todos" className="bg-card border border-border rounded-2xl p-4 sm:p-6 hover:border-brand/30 transition-colors block">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-foreground">Maintenance</h3>
          <span className="text-xs text-muted-foreground">All →</span>
        </div>
        <div className="space-y-2">
          {openTodos.length === 0 && <p className="text-sm text-muted-foreground">All caught up 🎉</p>}
          {openTodos.map((t) => (
            <div
              key={t.id}
              className={
                "p-3 bg-secondary/40 rounded-lg border-l-2 flex items-start justify-between gap-3 " +
                (t.priority === "high" ? "border-danger" : t.priority === "med" ? "border-warn" : "border-accent")
              }
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
                {t.note && <p className="text-xs text-muted-foreground truncate">{t.note}</p>}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="text-[10px] uppercase tracking-wider text-brand hover:underline shrink-0"
              >
                Done
              </button>
            </div>
          ))}
        </div>
      </Link>
    ),
    ghosts: (
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-heading text-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-danger animate-pulse" />
              Scan Bypass Alerts
            </h2>
            <p className="text-xs text-muted-foreground">Active members with no RFID punch in last 4 days</p>
          </div>
          <Link to="/members" search={{ filter: "ghost" }} className="text-xs text-brand hover:underline">
            View all
          </Link>
        </div>
        {ghostList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Everyone is regular. 💪</p>
        ) : (
          <div className="divide-y divide-border">
            {ghostList.map((m) => (
              <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="size-10 rounded-full object-cover ring-1 ring-border"
                      width={40}
                      height={40}
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-brand/20 grid place-items-center text-brand font-bold">
                      {m.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.roll_no ?? m.rollNo} · {m.plan}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="px-2 py-0.5 bg-danger/10 text-danger text-[9px] rounded uppercase font-bold tracking-wider">
                    4d+ no show
                  </span>
                  <Link to="/reminders" className="text-xs text-brand hover:underline shrink-0">
                    Remind
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    expiring: (
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 block">
        <h3 className="font-heading text-lg text-foreground mb-4">Expiring / Expired</h3>
        <div className="space-y-3">
          {expiringList.map((m) => {
            const d = daysUntil(m.expiry_date ?? m.expiryDate);
            return (
              <div key={m.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="size-9 rounded-full object-cover ring-1 ring-border"
                      width={36}
                      height={36}
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-9 rounded-full bg-brand/20 grid place-items-center text-brand font-bold text-sm">
                      {m.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d < 0 ? `Expired ${-d}d ago` : d === 0 ? "Expires today" : `${d}d left`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setRenewingMember(m);
                  }}
                  className="text-[10px] uppercase tracking-wider text-brand hover:underline shrink-0 cursor-pointer"
                >
                  Renew
                </button>
              </div>
            );
          })}
        </div>
      </div>
    ),
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] w-full">
      <PageHeader
        title="Gym Overview"
        subtitle={`${greet}, ${settings.ownerName} 🏋️ — ${settings.gymName}`}
        actions={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCustomize((v) => !v)}
              className="px-4 py-2.5 bg-secondary text-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 hover:bg-brand/10 hover:text-brand flex-1 sm:flex-initial justify-center"
            >
              <GripVertical className="size-4" /> {customize ? "Done" : "Customize"}
            </button>
            <Link
              to="/attendance"
              className="px-5 py-2.5 bg-secondary text-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 hover:bg-brand/10 hover:text-brand transition flex-1 sm:flex-initial justify-center"
            >
              <Radio className="size-4" /> Punch In
            </Link>
            <Link
              to="/members/new"
              className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl hover:scale-[1.02] active:scale-95 transition-transform text-sm w-full sm:w-auto text-center"
            >
              + New Member
            </Link>
          </div>
        }
      />

      {customize && (
        <div className="mb-6 p-4 sm:p-5 bg-card border border-dashed border-brand/40 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-heading text-base">Customize Dashboard</h3>
              <p className="text-xs text-muted-foreground">Drag widgets to reorder, eye-icon to show/hide</p>
            </div>
            <button
              onClick={() => gym.setLayout(DEFAULT_LAYOUT)}
              className="text-xs text-muted-foreground hover:text-brand inline-flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {layout.map((w, i) => (
              <div key={w.id} className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{WIDGET_LABELS[w.id]}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(i, i - 1)} className="text-xs text-muted-foreground hover:text-brand px-1" aria-label="Move up">
                    ↑
                  </button>
                  <button onClick={() => move(i, i + 1)} className="text-xs text-muted-foreground hover:text-brand px-1" aria-label="Move down">
                    ↓
                  </button>
                  <button onClick={() => toggle(w.id)} className="size-7 grid place-items-center rounded hover:bg-secondary" aria-label="Toggle visibility">
                    {w.visible ? <Eye className="size-3.5 text-brand" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {layout
          .filter((w) => w.visible)
          .map((w) => (
            <div
              key={w.id}
              draggable={customize}
              onDragStart={() => setDragId(w.id)}
              onDragOver={(e) => {
                if (customize) e.preventDefault();
              }}
              onDrop={() => onDrop(w.id)}
              className={
                customize
                  ? "relative ring-2 ring-dashed ring-border rounded-2xl cursor-move transition " +
                  (dragId === w.id ? "opacity-50" : "")
                  : ""
              }
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

      {/* Beautiful Plan Renewal Modal */}
      {renewingMember && (
        <RenewModal
          member={renewingMember}
          onClose={() => setRenewingMember(null)}
          onRenewed={() => {
            fetchDashboardData();
            setRenewingMember(null);
          }}
        />
      )}
    </div>
  );
}

// Reusable Plan Renewal Modal Component
export function RenewModal({ member, onClose, onRenewed }: { member: any; onClose: () => void; onRenewed: () => void }) {
  const [plan, setPlan] = useState<PlanType>(member.plan as PlanType || "Monthly");
  const [planPrices, setPlanPrices] = useState<Record<PlanType, number>>({
    Monthly: 1500,
    Quarterly: 4000,
    HalfYearly: 7500,
    Yearly: 13000,
  });
  const [feeAmount, setFeeAmount] = useState<number>(1500);
  const [feePaid, setFeePaid] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    supabase
      .from("branches")
      .select("plan_prices")
      .eq("id", branchId)
      .single()
      .then(({ data }) => {
        if (data?.plan_prices) {
          setPlanPrices(data.plan_prices);
          setFeeAmount(data.plan_prices[plan] ?? 1500);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setFeeAmount(planPrices[plan] ?? 0);
  }, [plan, planPrices]);

  const handleSave = async () => {
    setSaving(true);
    const DAYS: Record<string, number> = {
      Monthly: 30, Quarterly: 90, HalfYearly: 180, Yearly: 365,
    };

    const expiryRaw = member.expiry_date ?? member.expiryDate;
    const baseDate = new Date(expiryRaw) > new Date()
      ? new Date(expiryRaw)
      : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + DAYS[plan]);

    const { error } = await supabase
      .from("members")
      .update({
        plan,
        expiry_date: newExpiry.toISOString(),
        fee_amount: feeAmount,
        fee_paid: feePaid,
      })
      .eq("id", member.id);

    if (error) {
      toast.error("Failed to renew: " + error.message);
      setSaving(false);
      return;
    }

    const branchId = getActiveBranchId();
    if (branchId && feePaid) {
      const { error: payError } = await supabase.from("payments").insert({
        branch_id: branchId,
        member_id: member.id,
        amount: feeAmount,
        plan: plan,
        payment_date: new Date().toISOString(),
        note: `Plan renewal: ${plan}`,
      });
      if (payError) console.error("Payment insert error:", payError);
    }

    toast.success(`${member.name}'s plan renewed successfully! ✓`);
    onRenewed();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 bg-brand/10 text-brand rounded-xl grid place-items-center">
            <CreditCard className="size-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg text-foreground">Renew Plan</h3>
            <p className="text-xs text-muted-foreground">Select plan for {member.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Select Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_ORDER.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPlan(p)}
                  className={"p-3 rounded-xl border text-left transition " + (plan === p ? "border-brand bg-brand/10" : "border-border bg-secondary/40 hover:border-brand/40")}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p}</p>
                  <p className="text-base font-heading mt-0.5">₹{planPrices[p]?.toLocaleString("en-IN") ?? "—"}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Fee Amount (INR)</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-bold">₹</span>
              <input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(+e.target.value)}
                className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
            <input
              type="checkbox"
              checked={feePaid}
              onChange={(e) => setFeePaid(e.target.checked)}
              className="accent-brand size-4"
            />
            <span>Mark Fee as Paid Upfront</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-semibold">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-brand text-brand-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <Save className="size-4" /> {saving ? "Renewing..." : "Renew Plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  to,
  search,
  label,
  value,
  icon,
  accent,
  hint,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <Link
      to={to as "/"}
      search={search as never}
      className="p-4 sm:p-5 bg-card border border-border rounded-xl hover:border-brand/40 hover:bg-card/80 transition block group"
    >
      <div className="flex items-center justify-between text-muted-foreground mb-2">
        <span className="text-[10px] uppercase tracking-widest truncate">{label}</span>
        <span className="group-hover:text-brand transition shrink-0">{icon}</span>
      </div>
      <p className={"text-2xl sm:text-3xl font-heading " + (accent ?? "text-foreground")}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</p>}
    </Link>
  );
}

function MoneyCard({
  to,
  search,
  label,
  value,
  sub,
  tone,
  icon,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  value: string;
  sub: string;
  tone: "brand" | "danger" | "muted";
  icon: React.ReactNode;
}) {
  const accent =
    tone === "brand"
      ? "text-brand bg-brand/10"
      : tone === "danger"
        ? "text-danger bg-danger/10"
        : "text-muted-foreground bg-secondary";
  return (
    <Link
      to={to as "/"}
      search={search as never}
      className="p-4 sm:p-6 bg-card border border-border rounded-2xl flex items-center gap-4 hover:border-brand/30 transition"
    >
      <div className={"size-12 rounded-xl grid place-items-center shrink-0 " + accent}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-widest truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-heading text-foreground mt-1">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </Link>
  );
}