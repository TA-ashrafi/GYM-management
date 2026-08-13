import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  ShieldCheck,
  Dumbbell,
  LineChart as ChartIcon,
  Plus,
  Save,
  Trash2,
  X,
  PlusCircle,
} from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/AppShell";
import { memberStatus, daysUntil, daysSince, money } from "@/lib/gym-store";
import { fetchMembers, supabase, getActiveBranchId } from "@/lib/supabase";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — ALPHA FITNESS" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ q: z.string().optional() }).parse(s),
  component: Reports,
});

function getMonthRange(offset: number) {
  const now = new Date();
  now.setMonth(now.getMonth() + offset);
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function Reports() {
  const [tab, setTab] = useState<"monthly" | "member">("monthly");

  return (
    <div className="p-4 sm:p-8 max-w-5xl w-full">
      <PageHeader
        title="Reports & Analytics Console"
        subtitle="Monthly gym summary + member diet and exercise profiles"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 no-print w-fit">
        <button
          onClick={() => setTab("monthly")}
          className={
            "px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer " +
            (tab === "monthly"
              ? "bg-card shadow text-foreground"
              : "text-muted-foreground")
          }
        >
          Monthly Report
        </button>
        <button
          onClick={() => setTab("member")}
          className={
            "px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer " +
            (tab === "member"
              ? "bg-card shadow text-foreground"
              : "text-muted-foreground")
          }
        >
          Member Progress OS
        </button>
      </div>

      {tab === "monthly" ? <MonthlyReport /> : <MemberReport />}
    </div>
  );
}

/* ===================== MONTHLY REPORT ===================== */
function MonthlyReport() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [newMembers, setNewMembers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = getMonthRange(monthOffset);
  const monthLabel = start.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;
    setLoading(true);

    const s = start.toISOString();
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    const eStr = e.toISOString();

    Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("branch_id", branchId)
        .gte("payment_date", s)
        .lte("payment_date", eStr),
      supabase
        .from("sales")
        .select("*")
        .eq("branch_id", branchId)
        .gte("created_at", s)
        .lte("created_at", eStr),
      supabase
        .from("expenses")
        .select("*")
        .eq("branch_id", branchId)
        .gte("date", s)
        .lte("date", eStr),
      supabase
        .from("members")
        .select("*")
        .eq("branch_id", branchId)
        .gte("created_at", s)
        .lte("created_at", eStr),
      supabase
        .from("products")
        .select("id, cost, price")
        .eq("branch_id", branchId),
    ]).then(([p, sa, ex, m, pr]) => {
      setPayments(p.data ?? []);
      setSales(sa.data ?? []);
      setExpenses(ex.data ?? []);
      setNewMembers(m.data ?? []);
      setProducts(pr.data ?? []);
      setLoading(false);
    });
  }, [monthOffset]);

  const memberRevenue = payments.reduce((a, p) => a + (p.amount ?? 0), 0);

  // Store profit = (sell - cost) × qty
  const storeRevenue = useMemo(() => {
    return sales.reduce((total: number, sale: any) => {
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
  }, [sales, products]);

  const totalRevenue = memberRevenue + storeRevenue;

  const expCats = [
    "Rent",
    "Electricity",
    "Water",
    "Equipment",
    "Staff",
    "Other",
  ];
  const expByCat = expCats
    .map((cat) => ({
      cat,
      amount: expenses
        .filter((e) => e.category === cat)
        .reduce((a, e) => a + (e.amount ?? 0), 0),
    }))
    .filter((e) => e.amount > 0);
  const totalExpenses = expenses.reduce((a, e) => a + (e.amount ?? 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <>
      <div className="flex items-center justify-between mb-6 no-print flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="size-9 bg-secondary rounded-lg grid place-items-center hover:bg-brand/10 hover:text-brand cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-lg sm:text-xl font-heading flex-1 text-center font-bold">
            {monthLabel}
          </h2>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={monthOffset >= 0}
            className="size-9 bg-secondary rounded-lg grid place-items-center hover:bg-brand/10 hover:text-brand disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-xl text-sm hover:bg-brand/10 hover:text-brand cursor-pointer"
        >
          <Printer className="size-4" /> Print
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-heading text-lg mb-4 text-brand">
              Revenue (Collected This Cycle)
            </h3>
            <div className="space-y-3">
              <Row
                label="Member Fees / Renewals"
                value={money(memberRevenue)}
              />
              <Row
                label="Supplement Store (Estimated Profit Only)"
                value={money(storeRevenue)}
              />
              <div className="border-t border-border pt-3">
                <Row
                  label="Total Revenue (Cycle Profits)"
                  value={money(totalRevenue)}
                  bold
                />
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-heading text-lg mb-4 text-danger">Expenses</h3>
            {expByCat.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expenses this month
              </p>
            ) : (
              <div className="space-y-3">
                {expByCat.map((e) => (
                  <Row key={e.cat} label={e.cat} value={money(e.amount)} />
                ))}
                <div className="border-t border-border pt-3">
                  <Row
                    label="Total Expenses"
                    value={money(totalExpenses)}
                    bold
                  />
                </div>
              </div>
            )}
          </div>

          {/* Net Profit */}
          <div
            className={
              "bg-card border rounded-2xl p-4 sm:p-6 " +
              (netProfit >= 0 ? "border-brand/40" : "border-danger/40")
            }
          >
            <h3 className="font-heading text-lg mb-4">Net Profit</h3>
            <div className="space-y-3">
              <Row label="Total Revenue" value={money(totalRevenue)} />
              <Row label="Total Expenses" value={`− ${money(totalExpenses)}`} />
              <div className="border-t border-border pt-3">
                <Row
                  label="Net Profit"
                  value={money(netProfit)}
                  bold
                  accent={netProfit >= 0 ? "text-brand" : "text-danger"}
                />
              </div>
            </div>
          </div>

          {/* New Members */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-heading text-lg mb-4">
              New Members This Month
            </h3>
            {newMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No new members this month
              </p>
            ) : (
              <div className="space-y-2">
                {newMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {m.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.roll_no ?? m.rollNo} · {m.plan}
                      </p>
                    </div>
                    <span className="text-brand font-semibold text-sm">
                      {money(m.fee_amount ?? m.feeAmount ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
              <h3 className="font-heading text-lg mb-4">Payment History</h3>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {p.note ?? "Payment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.payment_date).toLocaleDateString("en-IN")} ·{" "}
                        {p.plan}
                      </p>
                    </div>
                    <span className="text-brand font-semibold text-sm">
                      {money(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className={
          "text-sm " +
          (bold ? "font-semibold text-foreground" : "text-muted-foreground")
        }
      >
        {label}
      </span>
      <span
        className={
          "text-sm " +
          (bold ? "font-semibold " : "") +
          (accent ?? "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}

/* ===================== MEMBER REPORT ===================== */
const DEFAULT_WORKOUTS = [
  {
    name: "Push-Pull-Legs (PPL) Split",
    desc: "Hypertrophy 6-day split",
    days: [
      "Flat Bench Press 4x8 · Shoulder Press 3x10 · Cable Flyes 3x12 · Overhead Tricep Extension 3x12",
      "Conventional Deadlift 3x5 · Lat Pulldowns 3x10 · Hammer Bicep Curls 3x12 · Face Pulls 3x15",
      "Barbell Squats 4x8 · Leg Press 3x12 · Calf Raises 4x15 · Lying Leg Curls 3x12",
      "Incline DB Press 4x10 · Military Press 3x8 · Tricep Pushdowns 3x12 · Lateral Raises 4x15",
      "Bent Over Rows 3x8 · Pullups 3x8 · Cable Bicep Curls 3x12 · DB Shrugs 3x12",
      "Romanian Deadlift 4x10 · Leg Extensions 3x15 · Hanging Leg Raises 3x15 · Planks 3x1min",
    ],
  },
  {
    name: "Classic Bro Split",
    desc: "Target 1 muscle group per day",
    days: [
      "Bench Press 4x8 · Incline DB Press 3x10 · Pec Deck Flyes 3x12 · Dips 3x12",
      "Deadlifts 3x5 · Lat Pulldowns 4x10 · Seated Cable Rows 3x10 · DB Pullovers 3x12",
      "Overhead Press 4x8 · Lateral Raises 4x15 · Front Raises 3x12 · Shrugs 3x15",
      "Squats 4x10 · Leg Press 3x12 · Hamstring Curls 3x12 · Calf Raises 4x15",
      "Barbell Curls 4x10 · Skullcrushers 4x12 · Hammer Curls 3x12 · Cable Tricep Pushdowns 3x15",
      "Hanging Leg Raises 4x15 · Cable Crunches 3x20 · Incline Walk 25min (HIIT)",
    ],
  },
  {
    name: "HIIT Cardio & Abs Plan",
    desc: "Calorie-burning steady cardio plan",
    days: [
      "Burpees 3x15 · Jump Squats 3x20 · Pushups 3x15 · Kettlebell Swings 3x20 · Treadmill 15min",
      "Low Intensity Steady State Walking/Jogging on 6% Incline - 45 Minutes",
      "Mountain Climbers 4x30s · Russian Twists 4x25 · Bicycle Crunches 4x20 · Planks 4x1min",
      "Stationary Cycling - 30 minutes (Alternating 1min Sprint / 1min Recovery)",
      "Dumbbell Thrusters 3x12 · Dumbbell Rows 3x15 · Ab Wheel Rollouts 3x12 · HIIT Rower 15min",
      "Stretching & Yoga Recovery Workout - 45 Minutes (Flexibility & Joint Health)",
    ],
  },
];

function MemberReport() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const [members, setMembers] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  // States for Modals
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [branchTemplates, setBranchTemplates] =
    useState<any[]>(DEFAULT_WORKOUTS);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<number>(0);

  const [progressOpen, setProgressOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [chest, setChest] = useState("");
  const [biceps, setBiceps] = useState("");
  const [waist, setWaist] = useState("");

  const loadData = () => {
    fetchMembers().then((data) => setMembers(data || []));
  };

  useEffect(() => {
    loadData();
  }, []);

  const matches = q
    ? members.filter((m) =>
        (
          (m.rollNo ?? m.roll_no ?? "") +
          m.name +
          (m.phone ?? "") +
          (m.rfid ?? "")
        )
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : [];

  const m = matches[0];

  useEffect(() => {
    if (!m?.id) {
      setAttendanceLogs([]);
      return;
    }
    supabase
      .from("attendance_logs")
      .select("*")
      .eq("member_id", m.id)
      .order("checked_in_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setAttendanceLogs(data ?? []));

    // Fetch customizable branch templates dynamically from Supabase
    const branchId = getActiveBranchId();
    if (branchId) {
      supabase
        .from("branches")
        .select("workout_templates")
        .eq("id", branchId)
        .single()
        .then(({ data }) => {
          if (
            data?.workout_templates &&
            Array.isArray(data.workout_templates) &&
            data.workout_templates.length > 0
          ) {
            setBranchTemplates(data.workout_templates);
          } else {
            setBranchTemplates(DEFAULT_WORKOUTS);
          }
        })
        .catch(() => {});
    }
  }, [m?.id]);

  const status = m ? memberStatus(m) : null;

  const punchHistory = Object.entries(
    attendanceLogs.reduce<Record<string, string[]>>((acc, log) => {
      const day = new Date(log.checked_in_at).toDateString();
      (acc[day] ??= []).push(log.checked_in_at);
      return acc;
    }, {}),
  )
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .slice(0, 30);

  const diet = m ? computeDiet(m) : null;

  const last30 = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });
  }, []);

  const dayMap = useMemo(() => {
    return attendanceLogs.reduce<Record<string, { in?: string; out?: string }>>(
      (acc, log) => {
        const day = log.checked_in_at.split("T")[0];
        if (!acc[day]) acc[day] = {};
        const time = new Date(log.checked_in_at).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        if (log.punch_type === "in" || !log.punch_type) acc[day].in = time;
        else acc[day].out = time;
        return acc;
      },
      {},
    );
  }, [attendanceLogs]);

  // Robust Cache Fallbacks for Schema Missing errors
  const workoutRoutine = useMemo(() => {
    if (!m) return [];
    const cached = localStorage.getItem(`fs_workout_${m.id}`);
    if (Array.isArray(m.workout_routine) && m.workout_routine.length > 0)
      return m.workout_routine;
    return cached ? JSON.parse(cached) : [];
  }, [m?.workout_routine, m?.id]);

  const progressLogs = useMemo(() => {
    if (!m) return [];
    const cached = localStorage.getItem(`fs_progress_${m.id}`);
    if (Array.isArray(m.progress_logs) && m.progress_logs.length > 0)
      return m.progress_logs;
    return cached ? JSON.parse(cached) : [];
  }, [m?.progress_logs, m?.id]);

  // Handle Workout Plan save
  const handleSaveWorkout = async () => {
    if (!m) return;
    const template = branchTemplates[selectedTemplateIdx];
    const routine = template.days.map((item: string, index: number) => ({
      day: `Day ${index + 1}`,
      items: item,
    }));

    localStorage.setItem(`fs_workout_${m.id}`, JSON.stringify(routine));

    const { error } = await supabase
      .from("members")
      .update({ workout_routine: routine })
      .eq("id", m.id);

    if (!error) {
      toast.success("Workout Routine builder updated successfully! ✓");
      loadData();
      setWorkoutOpen(false);
    } else if (error.message.includes("schema cache")) {
      toast.success(
        "Workout saved locally! Run Supabase SQL Editor migration in SUPABASE_SQL.md to enable cross-device sync.",
      );
      loadData();
      setWorkoutOpen(false);
    } else {
      toast.error(error.message);
    }
  };

  // Handle Progress entry save
  const handleSaveProgress = async () => {
    if (!m) return;
    if (!weight) {
      toast.error("Weight is required");
      return;
    }

    const newLog = {
      date: new Date().toLocaleDateString("en-IN"),
      weight: +weight,
      body_fat: bodyFat ? +bodyFat : null,
      muscle_mass: muscleMass ? +muscleMass : null,
      chest: chest ? +chest : null,
      biceps: biceps ? +biceps : null,
      waist: waist ? +waist : null,
    };

    const existingLogs = progressLogs;
    const updatedLogs = [...existingLogs, newLog].slice(-100); // keep last 100 entries

    localStorage.setItem(`fs_progress_${m.id}`, JSON.stringify(updatedLogs));

    const { error } = await supabase
      .from("members")
      .update({ progress_logs: updatedLogs })
      .eq("id", m.id);

    if (!error) {
      toast.success("Physical Progress assessment recorded! 📉");
      setWeight("");
      setBodyFat("");
      setMuscleMass("");
      setChest("");
      setBiceps("");
      setWaist("");
      loadData();
      setProgressOpen(false);
    } else if (error.message.includes("schema cache")) {
      toast.success(
        "Assessment saved locally! Run Supabase SQL Editor migration in SUPABASE_SQL.md to enable cross-device sync.",
      );
      setWeight("");
      setBodyFat("");
      setMuscleMass("");
      setChest("");
      setBiceps("");
      setWaist("");
      loadData();
      setProgressOpen(false);
    } else {
      toast.error(error.message);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 no-print">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Roll No, RFID, Name, Phone..."
            className="w-full pl-9 pr-3 py-3 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
        {q && matches.length > 1 && (
          <p className="text-xs text-muted-foreground mt-3">
            {matches.length} matches — showing first. Refine search for exact
            match.
          </p>
        )}
      </div>

      {m && diet ? (
        <article className="bg-card border border-border rounded-2xl p-4 sm:p-8 print:bg-white print:text-black space-y-6">
          <div className="flex justify-between items-center no-print mb-2 flex-wrap gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setWorkoutOpen(true)}
                className="px-4 py-2 bg-brand text-brand-foreground rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 transition"
              >
                <Dumbbell className="size-4" /> Assign Workout Plan
              </button>
              <button
                onClick={() => setProgressOpen(true)}
                className="px-4 py-2 bg-secondary text-foreground border border-border rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 transition"
              >
                <PlusCircle className="size-4" /> Add Progress Log
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-secondary border border-border text-foreground rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Printer className="size-4" /> Print Report
            </button>
          </div>

          <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pb-6 border-b border-border">
            {m.photo ? (
              <img
                src={m.photo}
                alt={m.name}
                className="size-24 sm:size-28 rounded-2xl object-cover ring-2 ring-brand"
                width={112}
                height={112}
              />
            ) : (
              <div className="size-24 sm:size-28 rounded-2xl bg-brand/20 grid place-items-center text-brand font-bold text-3xl">
                {m.name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Complete Member Report
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading mt-1 text-foreground">
                {m.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {m.rollNo ?? m.roll_no} · RFID {m.rfid} · {m.phone}
              </p>
              {m.email && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {m.email}
                </p>
              )}
              <span
                className={`inline-block mt-2 px-2.5 py-0.5 text-[9px] rounded uppercase font-bold tracking-wider ${
                  status === "active"
                    ? "bg-brand/10 text-brand"
                    : status === "expiring"
                      ? "bg-warn/10 text-warn"
                      : "bg-danger/10 text-danger"
                }`}
              >
                {status}
              </span>
            </div>
          </header>

          <Block title="Personal Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Info
                label="Gender"
                value={
                  m.gender === "M"
                    ? "Male"
                    : m.gender === "F"
                      ? "Female"
                      : "Other"
                }
              />
              <Info label="Age" value={`${m.age} years`} />
              <Info label="Address" value={m.address || "Not provided"} />
              <Info
                label="Emergency Contact"
                value={
                  (m.emergencyContact ?? m.emergency_contact) || "Not provided"
                }
              />
              <Info
                label="Joined"
                value={new Date(
                  m.joinDate ?? m.join_date ?? m.joining_date,
                ).toLocaleDateString("en-IN")}
              />
              <Info
                label="Preferred Slot"
                value={m.preferredSlot ?? m.preferred_slot}
              />
            </div>
          </Block>

          <Block title="Body Details">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Info label="Height" value={`${m.heightCm ?? m.height_cm} cm`} />
              <Info label="Weight" value={`${m.weightKg ?? m.weight_kg} kg`} />
              <Info
                label="BMI"
                value={diet.bmi.toFixed(1) + " · " + diet.bmiClass}
              />
              <Info label="BMR" value={`${diet.bmr} kcal`} />
              <Info label="TDEE" value={`${diet.tdee} kcal`} />
              <Info label="Goal" value={m.goal} />
              <Info
                label="Target Calories"
                value={`${diet.targetKcal} kcal/day`}
              />
              <Info label="Medical" value={m.medical || "None reported"} />
            </div>
          </Block>

          {/* Member's Assigned 6-Day Workout Routine */}
          <Block title="Assigned 6-Day Workout Routine">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {workoutRoutine.length > 0 ? (
                workoutRoutine.map((w: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 bg-secondary/30 border border-border/40 rounded-xl flex flex-col gap-1.5"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-brand">
                      {w.day || `Day ${index + 1}`}
                    </span>
                    <p className="text-xs text-foreground font-medium leading-relaxed">
                      {w.items || "Rest Day / Active Stretching"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center bg-secondary/20 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
                  No exercise plan assigned yet. Click the "Assign Workout Plan"
                  button above to template a premium routine instantly!
                </div>
              )}
            </div>
          </Block>

          {/* Member's Physical Progress Line Charts */}
          <Block title="Physical Progress Progression Chart (Last 10 entries)">
            {progressLogs.length > 0 ? (
              <div className="space-y-6">
                {/* Weight and Muscle progression */}
                <div className="bg-secondary/20 border border-border/40 rounded-2xl p-4 sm:p-5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block font-bold">
                    Weight & Muscle Progression (kg)
                  </span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressLogs.slice(-10)}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                        />
                        <XAxis
                          dataKey="date"
                          stroke="var(--color-muted-foreground)"
                          fontSize={10}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={10}
                        />
                        <Tooltip contentStyle={tt} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone"
                          name="Weight (kg)"
                          dataKey="weight"
                          stroke="var(--color-brand)"
                          strokeWidth={2.5}
                        />
                        <Line
                          type="monotone"
                          name="Muscle Mass (kg)"
                          dataKey="muscle_mass"
                          stroke="var(--color-accent)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Body Fat & Chest/Waist dimensions */}
                <div className="bg-secondary/20 border border-border/40 rounded-2xl p-4 sm:p-5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block font-bold">
                    Body Fat % and Core Dimensions (inches)
                  </span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressLogs.slice(-10)}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                        />
                        <XAxis
                          dataKey="date"
                          stroke="var(--color-muted-foreground)"
                          fontSize={10}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={10}
                        />
                        <Tooltip contentStyle={tt} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone"
                          name="Body Fat %"
                          dataKey="body_fat"
                          stroke="var(--color-danger)"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          name="Chest (in)"
                          dataKey="chest"
                          stroke="var(--color-warn)"
                          strokeWidth={1.5}
                        />
                        <Line
                          type="monotone"
                          name="Waist (in)"
                          dataKey="waist"
                          stroke="var(--color-info)"
                          strokeWidth={1.5}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-secondary/20 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
                No progress evaluations recorded yet. Log measurements to
                generate progression lines automatically!
              </div>
            )}
          </Block>

          <Block title="Membership & Payments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 sm:p-5 bg-secondary/40 rounded-xl">
                <p className="text-xl sm:text-2xl font-heading text-foreground">
                  {m.plan}
                </p>
                <p className="text-sm mt-1">
                  Fee: {money(m.feeAmount ?? m.fee_amount)} ·{" "}
                  {(m.feePaid ?? m.fee_paid) ? (
                    <span className="text-brand font-semibold">Paid</span>
                  ) : (
                    <span className="text-danger font-bold">Pending</span>
                  )}
                </p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Expiry:{" "}
                  {new Date(m.expiryDate ?? m.expiry_date).toLocaleDateString(
                    "en-IN",
                  )}{" "}
                  ·{" "}
                  {daysUntil(m.expiryDate ?? m.expiry_date) >= 0
                    ? `${daysUntil(m.expiryDate ?? m.expiry_date)}d left`
                    : `Expired ${-daysUntil(m.expiryDate ?? m.expiry_date)}d ago`}
                </p>
              </div>
              <div className="p-4 sm:p-5 bg-secondary/40 rounded-xl">
                <p className="text-xl sm:text-2xl font-heading text-foreground">
                  {attendanceLogs.length} visits
                </p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Last seen:{" "}
                  {attendanceLogs[0]
                    ? `${daysSince(attendanceLogs[0].checked_in_at)}d ago`
                    : "Never"}
                </p>
              </div>
            </div>
          </Block>

          <Block title="Attendance Heatmap (last 30 days)">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mt-2">
              {last30.map((day) => {
                const data = dayMap[day];
                const present = !!data?.in;
                const dateNum = new Date(day).getDate();
                return (
                  <div
                    key={day}
                    title={`${day}${data?.in ? " IN: " + data.in : ""}${data?.out ? " OUT: " + data.out : ""}`}
                    className={
                      "rounded-lg p-1.5 text-center text-[9px] font-bold transition " +
                      (present
                        ? "bg-brand text-brand-foreground"
                        : "bg-secondary text-muted-foreground")
                    }
                  >
                    <div>{dateNum}</div>
                    {data?.in && (
                      <div className="text-[8px] mt-0.5 opacity-80">
                        {data.in}
                      </div>
                    )}
                    {data?.out && (
                      <div className="text-[8px] opacity-60">{data.out}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Block>

          <Block title="Punch-in History (last 30 days)">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {punchHistory.length === 0 && (
                <p className="text-muted-foreground p-2">
                  No punch-in records found.
                </p>
              )}
              {punchHistory.map(([day, times]) => (
                <div key={day} className="p-3 bg-secondary/40 rounded-lg">
                  <p className="font-semibold text-foreground">
                    {new Date(day).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {times
                      .sort()
                      .map((t) =>
                        new Date(t).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      )
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Personalized Diet Plan">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Info label="Protein" value={`${diet.protein} g`} />
              <Info label="Carbs" value={`${diet.carbs} g`} />
              <Info label="Fats" value={`${diet.fats} g`} />
              <Info label="Water" value={`${diet.water} L`} />
            </div>
            <div className="space-y-2 text-sm">
              {diet.meals.map((meal: any) => (
                <div
                  key={meal.name}
                  className="flex flex-col sm:flex-row items-start gap-1 sm:gap-3 p-3 bg-secondary/40 rounded-lg"
                >
                  <span className="text-[10px] uppercase tracking-widest text-brand w-24 shrink-0 font-bold">
                    {meal.name}
                  </span>
                  <span className="text-foreground text-xs sm:text-sm">
                    {meal.items}
                  </span>
                </div>
              ))}
            </div>
          </Block>

          <footer className="pt-4 border-t border-border text-[10px] text-muted-foreground flex justify-between">
            <span>Generated {new Date().toLocaleString("en-IN")}</span>
          </footer>
        </article>
      ) : q ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          No member matches "{q}"
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          Start typing to search for a member...
        </div>
      )}

      {/* Assign Workout Plan Modal */}
      {workoutOpen && m && (
        <div
          className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4"
          onClick={() => setWorkoutOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
          >
            <button
              onClick={() => setWorkoutOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Dumbbell className="size-6 text-brand" />
              <div>
                <h3 className="font-heading text-lg text-foreground">
                  Assign Workout Plan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Assign workout routine template for {m.name}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2 font-bold">
                  Select Template Preset
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {branchTemplates.map((temp, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTemplateIdx(index)}
                      className={
                        "p-3 rounded-xl border text-left transition w-full " +
                        (selectedTemplateIdx === index
                          ? "border-brand bg-brand/10"
                          : "border-border bg-secondary/40 hover:border-brand/40")
                      }
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {temp.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {temp.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setWorkoutOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkout}
                  className="flex-1 py-2.5 bg-brand text-brand-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Save className="size-4" /> Save Routine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Progress Logs Modal */}
      {progressOpen && m && (
        <div
          className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4"
          onClick={() => setProgressOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl relative"
          >
            <button
              onClick={() => setProgressOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <ChartIcon className="size-6 text-brand" />
              <div>
                <h3 className="font-heading text-lg text-foreground">
                  Log Physical Assessment
                </h3>
                <p className="text-xs text-muted-foreground">
                  Log weight, fat %, and muscular measurements for {m.name}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (kg) *">
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70.5"
                    className={input_field}
                    required
                  />
                </Field>
                <Field label="Body Fat %">
                  <input
                    type="number"
                    step="0.1"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    placeholder="15.2"
                    className={input_field}
                  />
                </Field>
                <Field label="Muscle Mass (kg)">
                  <input
                    type="number"
                    step="0.1"
                    value={muscleMass}
                    onChange={(e) => setMuscleMass(e.target.value)}
                    placeholder="58.1"
                    className={input_field}
                  />
                </Field>
                <Field label="Chest (inches)">
                  <input
                    type="number"
                    step="0.1"
                    value={chest}
                    onChange={(e) => setChest(e.target.value)}
                    placeholder="39.5"
                    className={input_field}
                  />
                </Field>
                <Field label="Biceps (inches)">
                  <input
                    type="number"
                    step="0.1"
                    value={biceps}
                    onChange={(e) => setBiceps(e.target.value)}
                    placeholder="14.2"
                    className={input_field}
                  />
                </Field>
                <Field label="Waist (inches)">
                  <input
                    type="number"
                    step="0.1"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder="31.2"
                    className={input_field}
                  />
                </Field>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setProgressOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProgress}
                  className="flex-1 py-2.5 bg-brand text-brand-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Save className="size-4" /> Save Progress Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const input_field =
  "px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-semibold">
        {title}
      </p>
      {children}
    </section>
  );
}

// Reusable Info field
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
        {label}
      </p>
      <p className="text-xs sm:text-sm font-medium mt-0.5 text-foreground">
        {value}
      </p>
    </div>
  );
}

// Reusable Field wrapper
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const tt = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
};

function computeDiet(m: any) {
  const weight = m.weightKg ?? m.weight_kg ?? 70;
  const height = m.heightCm ?? m.height_cm ?? 170;
  const age = m.age ?? 25;
  const gender = m.gender ?? "M";

  const bmi = weight / Math.pow(height / 100, 2);
  const bmiClass =
    bmi < 18.5
      ? "Underweight"
      : bmi < 25
        ? "Healthy"
        : bmi < 30
          ? "Overweight"
          : "Obese";

  const bmr = Math.round(
    gender === "F"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5,
  );

  const tdee = Math.round(bmr * 1.55);
  const goal = (m.goal || "").toLowerCase();
  const targetKcal = goal.includes("loss")
    ? tdee - 500
    : goal.includes("gain") || goal.includes("muscle")
      ? tdee + 400
      : tdee;

  const protein = Math.round(
    weight * (goal.includes("muscle") || goal.includes("strength") ? 2.0 : 1.6),
  );
  const fats = Math.round((targetKcal * 0.25) / 9);
  const carbs = Math.max(
    0,
    Math.round((targetKcal - protein * 4 - fats * 9) / 4),
  );
  const water = +(weight * 0.033).toFixed(1);

  const meals = [
    {
      name: "Breakfast",
      items:
        "4 egg whites + 2 whole eggs, oats 60g with milk, 1 banana, black coffee",
    },
    {
      name: "Mid-morning",
      items: "Handful almonds (15) + greek yogurt 150g + apple",
    },
    {
      name: "Lunch",
      items:
        "Grilled chicken/paneer 180g, brown rice 1 cup, mixed vegetables, salad, dal 1 bowl",
    },
    {
      name: "Pre-workout",
      items: "Black coffee + 1 banana + 5g creatine (30 minutes before)",
    },
    {
      name: "Post-workout",
      items: "Whey protein 1 scoop + 1 banana + 250ml milk",
    },
    {
      name: "Dinner",
      items:
        "Grilled fish/tofu 180g, 2 chapati, sautéed vegetables, curd 1 bowl",
    },
  ];

  return {
    bmi,
    bmiClass,
    bmr,
    tdee,
    targetKcal,
    protein,
    carbs,
    fats,
    water,
    meals,
  };
}
