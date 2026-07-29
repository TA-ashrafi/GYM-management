import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Printer, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/AppShell";
import { memberStatus, daysUntil, daysSince, money } from "@/lib/gym-store";
import { fetchMembers, supabase, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Fitness Streak" }] }),
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
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Reports"
        subtitle="Monthly gym summary + individual member reports"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 no-print w-fit">
        <button
          onClick={() => setTab("monthly")}
          className={"px-4 py-2 rounded-lg text-sm font-medium transition " +
            (tab === "monthly" ? "bg-card shadow text-foreground" : "text-muted-foreground")}
        >
          Monthly Report
        </button>
        <button
          onClick={() => setTab("member")}
          className={"px-4 py-2 rounded-lg text-sm font-medium transition " +
            (tab === "member" ? "bg-card shadow text-foreground" : "text-muted-foreground")}
        >
          Member Report
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
  const [loading, setLoading] = useState(true);

  const { start, end } = getMonthRange(monthOffset);
  const monthLabel = start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;
    setLoading(true);

    const s = start.toISOString();
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    const eStr = e.toISOString();

    Promise.all([
      supabase.from("payments").select("*").eq("branch_id", branchId).gte("payment_date", s).lte("payment_date", eStr),
      supabase.from("sales").select("*").eq("branch_id", branchId).gte("created_at", s).lte("created_at", eStr),
      supabase.from("expenses").select("*").eq("branch_id", branchId).gte("date", s).lte("date", eStr),
      supabase.from("members").select("*").eq("branch_id", branchId).gte("created_at", s).lte("created_at", eStr),
    ]).then(([p, sa, ex, m]) => {
      setPayments(p.data ?? []);
      setSales(sa.data ?? []);
      setExpenses(ex.data ?? []);
      setNewMembers(m.data ?? []);
      setLoading(false);
    });
  }, [monthOffset]);

  const memberRevenue = payments.reduce((a, p) => a + (p.amount ?? 0), 0);
  const storeRevenue = sales.reduce((a, s) => a + (s.total ?? 0), 0);
  const totalRevenue = memberRevenue + storeRevenue;

  const expCats = ["Rent", "Electricity", "Water", "Equipment", "Staff", "Other"];
  const expByCat = expCats
    .map((cat) => ({
      cat,
      amount: expenses.filter((e) => e.category === cat).reduce((a, e) => a + (e.amount ?? 0), 0),
    }))
    .filter((e) => e.amount > 0);
  const totalExpenses = expenses.reduce((a, e) => a + (e.amount ?? 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <>
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="size-9 bg-secondary rounded-lg grid place-items-center hover:bg-brand/10 hover:text-brand"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-xl font-heading flex-1 text-center">{monthLabel}</h2>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={monthOffset >= 0}
            className="size-9 bg-secondary rounded-lg grid place-items-center hover:bg-brand/10 hover:text-brand disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="ml-4 flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-xl text-sm hover:bg-brand/10 hover:text-brand"
        >
          <Printer className="size-4" /> Print
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Revenue */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-heading text-lg mb-4 text-brand">Revenue</h3>
            <div className="space-y-3">
              <Row label="Member Fees" value={money(memberRevenue)} />
              <Row label="Supplement Store" value={money(storeRevenue)} />
              <div className="border-t border-border pt-3">
                <Row label="Total Revenue" value={money(totalRevenue)} bold />
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-heading text-lg mb-4 text-danger">Expenses</h3>
            {expByCat.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses this month</p>
            ) : (
              <div className="space-y-3">
                {expByCat.map((e) => (
                  <Row key={e.cat} label={e.cat} value={money(e.amount)} />
                ))}
                <div className="border-t border-border pt-3">
                  <Row label="Total Expenses" value={money(totalExpenses)} bold />
                </div>
              </div>
            )}
          </div>

          {/* Net Profit */}
          <div className={"bg-card border rounded-2xl p-6 " + (netProfit >= 0 ? "border-brand/40" : "border-danger/40")}>
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
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-heading text-lg mb-4">New Members This Month</h3>
            {newMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new members this month</p>
            ) : (
              <div className="space-y-2">
                {newMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.roll_no ?? m.rollNo} · {m.plan}</p>
                    </div>
                    <span className="text-brand font-semibold text-sm">{money(m.fee_amount ?? m.feeAmount ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-heading text-lg mb-4">Payment History</h3>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.note ?? "Payment"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.payment_date).toLocaleDateString("en-IN")} · {p.plan}
                      </p>
                    </div>
                    <span className="text-brand font-semibold">{money(p.amount)}</span>
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

function Row({ label, value, bold, accent }: {
  label: string; value: string; bold?: boolean; accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-sm " + (bold ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={"text-sm " + (bold ? "font-semibold " : "") + (accent ?? "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

/* ===================== MEMBER REPORT ===================== */
function MemberReport() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const [members, setMembers] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchMembers().then((data) => setMembers(data || []));
  }, []);

  const matches = q
    ? members.filter((m) =>
        ((m.rollNo ?? m.roll_no ?? "") + m.name + (m.phone ?? "") + (m.rfid ?? ""))
          .toLowerCase()
          .includes(q.toLowerCase())
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
  }, [m?.id]);

  const status = m ? memberStatus(m) : null;

  const punchHistory = Object.entries(
    attendanceLogs.reduce<Record<string, string[]>>((acc, log) => {
      const day = new Date(log.checked_in_at).toDateString();
      (acc[day] ??= []).push(log.checked_in_at);
      return acc;
    }, {})
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
    return attendanceLogs.reduce<Record<string, { in?: string; out?: string }>>((acc, log) => {
      const day = log.checked_in_at.split("T")[0];
      if (!acc[day]) acc[day] = {};
      const time = new Date(log.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      if (log.punch_type === "in" || !log.punch_type) acc[day].in = time;
      else acc[day].out = time;
      return acc;
    }, {});
  }, [attendanceLogs]);

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
            {matches.length} matches — showing first. Refine search for exact match.
          </p>
        )}
      </div>

      {m && diet ? (
        <article className="bg-card border border-border rounded-2xl p-8 print:bg-white print:text-black space-y-6">
          <div className="flex justify-end no-print mb-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-brand text-brand-foreground rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <Printer className="size-4" /> Print Report
            </button>
          </div>

          <header className="flex items-center gap-6 pb-6 border-b border-border">
            <img
              src={m.photo}
              alt={m.name}
              className="size-28 rounded-2xl object-cover ring-2 ring-brand"
              width={112}
              height={112}
            />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Complete Member Report</p>
              <h2 className="text-3xl font-heading mt-1">{m.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {m.rollNo ?? m.roll_no} · RFID {m.rfid} · {m.phone}
              </p>
              {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
              <span
                className={`inline-block mt-2 px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${
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
              <Info label="Gender" value={m.gender === "M" ? "Male" : m.gender === "F" ? "Female" : "Other"} />
              <Info label="Age" value={`${m.age} years`} />
              <Info label="Address" value={m.address || "Not provided"} />
              <Info label="Emergency Contact" value={(m.emergencyContact ?? m.emergency_contact) || "Not provided"} />
              <Info label="Joined" value={new Date(m.joinDate ?? m.join_date ?? m.joining_date).toLocaleDateString("en-IN")} />
              <Info label="Preferred Slot" value={m.preferredSlot ?? m.preferred_slot} />
            </div>
          </Block>

          <Block title="Body Details">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Info label="Height" value={`${m.heightCm ?? m.height_cm} cm`} />
              <Info label="Weight" value={`${m.weightKg ?? m.weight_kg} kg`} />
              <Info label="BMI" value={diet.bmi.toFixed(1) + " · " + diet.bmiClass} />
              <Info label="BMR" value={`${diet.bmr} kcal`} />
              <Info label="TDEE" value={`${diet.tdee} kcal`} />
              <Info label="Goal" value={m.goal} />
              <Info label="Target Calories" value={`${diet.targetKcal} kcal/day`} />
              <Info label="Medical" value={m.medical || "None reported"} />
            </div>
          </Block>

          <Block title="Membership & Payments">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 bg-secondary/40 rounded-xl">
                <p className="text-2xl font-heading">{m.plan}</p>
                <p className="text-sm mt-1">
                  Fee: {money(m.feeAmount ?? m.fee_amount)} ·{" "}
                  {(m.feePaid ?? m.fee_paid) ? <span className="text-brand">Paid</span> : <span className="text-danger">Pending</span>}
                </p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Expiry: {new Date(m.expiryDate ?? m.expiry_date).toLocaleDateString("en-IN")} ·{" "}
                  {daysUntil(m.expiryDate ?? m.expiry_date) >= 0
                    ? `${daysUntil(m.expiryDate ?? m.expiry_date)}d left`
                    : `Expired ${-daysUntil(m.expiryDate ?? m.expiry_date)}d ago`}
                </p>
              </div>
              <div className="p-5 bg-secondary/40 rounded-xl">
                <p className="text-2xl font-heading">{attendanceLogs.length} visits</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Last seen: {attendanceLogs[0] ? `${daysSince(attendanceLogs[0].checked_in_at)}d ago` : "Never"}
                </p>
              </div>
            </div>
          </Block>

          <Block title="Attendance Heatmap (last 30 days)">
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 mt-4">
              {last30.map((day) => {
                const data = dayMap[day];
                const present = !!data?.in;
                const dateNum = new Date(day).getDate();
                return (
                  <div
                    key={day}
                    title={`${day}${data?.in ? " IN: " + data.in : ""}${data?.out ? " OUT: " + data.out : ""}`}
                    className={"rounded-lg p-1.5 text-center text-[9px] font-bold transition " +
                      (present ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground")}
                  >
                    <div>{dateNum}</div>
                    {data?.in && <div className="text-[8px] mt-0.5 opacity-80">{data.in}</div>}
                    {data?.out && <div className="text-[8px] opacity-60">{data.out}</div>}
                  </div>
                );
              })}
            </div>
          </Block>

          <Block title="Punch-in History (last 30 days)">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {punchHistory.length === 0 && <p className="text-muted-foreground">No punch-in records found.</p>}
              {punchHistory.map(([day, times]) => (
                <div key={day} className="p-3 bg-secondary/40 rounded-lg">
                  <p className="font-semibold">
                    {new Date(day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {times
                      .sort()
                      .map((t) => new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Personalized Diet Plan">
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <Info label="Protein" value={`${diet.protein} g`} />
              <Info label="Carbs" value={`${diet.carbs} g`} />
              <Info label="Fats" value={`${diet.fats} g`} />
              <Info label="Water" value={`${diet.water} L`} />
            </div>
            <div className="space-y-2 text-sm">
              {diet.meals.map((meal: any) => (
                <div key={meal.name} className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                  <span className="text-[10px] uppercase tracking-widest text-brand w-24 shrink-0">{meal.name}</span>
                  <span className="text-foreground">{meal.items}</span>
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
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{title}</p>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function computeDiet(m: any) {
  const weight = m.weightKg ?? m.weight_kg ?? 70;
  const height = m.heightCm ?? m.height_cm ?? 170;
  const age = m.age ?? 25;
  const gender = m.gender ?? "M";

  const bmi = weight / Math.pow(height / 100, 2);
  const bmiClass = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";

  const bmr = Math.round(
    gender === "F"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5
  );

  const tdee = Math.round(bmr * 1.55);
  const goal = (m.goal || "").toLowerCase();
  const targetKcal = goal.includes("loss") ? tdee - 500 : goal.includes("gain") || goal.includes("muscle") ? tdee + 400 : tdee;

  const protein = Math.round(weight * (goal.includes("muscle") || goal.includes("strength") ? 2.0 : 1.6));
  const fats = Math.round((targetKcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((targetKcal - protein * 4 - fats * 9) / 4));
  const water = +(weight * 0.033).toFixed(1);

  const meals = [
    { name: "Breakfast", items: "4 egg whites + 2 whole eggs, oats 60g with milk, 1 banana, black coffee" },
    { name: "Mid-morning", items: "Handful almonds (15) + greek yogurt 150g + apple" },
    { name: "Lunch", items: "Grilled chicken/paneer 180g, brown rice 1 cup, mixed vegetables, salad, dal 1 bowl" },
    { name: "Pre-workout", items: "Black coffee + 1 banana + 5g creatine (30 minutes before)" },
    { name: "Post-workout", items: "Whey protein 1 scoop + 1 banana + 250ml milk" },
    { name: "Dinner", items: "Grilled fish/tofu 180g, 2 chapati, sautéed vegetables, curd 1 bowl" },
  ];

  return { bmi, bmiClass, bmr, tdee, targetKcal, protein, carbs, fats, water, meals };
}