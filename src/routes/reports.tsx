import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Printer, Search } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/AppShell";
import { memberStatus, daysUntil, daysSince, money } from "@/lib/gym-store";
import { fetchMembers, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — IronSync" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ q: z.string().optional() }).parse(s),
  component: Reports,
});

function Reports() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const [members, setMembers] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  // Fetch all members on component mount
  useEffect(() => {
    fetchMembers().then((data) => setMembers(data || []));
  }, []);

  // Find matching members based on search query
  const matches = q
    ? members.filter((m) =>
        (m.rollNo + m.name + m.phone + m.rfid).toLowerCase().includes(q.toLowerCase())
      )
    : [];

  const m = matches[0];

  // Fetch attendance logs for selected member
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

  // Punch History from attendance logs
  const punchHistory = Object.entries(
    attendanceLogs.reduce<Record<string, string[]>>((acc, log) => {
      const day = new Date(log.checked_in_at).toDateString();
      (acc[day] ??= []).push(log.checked_in_at);
      return acc;
    }, {})
  )
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .slice(0, 30);

  // Diet plan calculation
  const diet = m ? computeDiet(m) : null;

  // Generate last 30 days for heatmap
  const last30 = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });
  }, []);

  // Map attendance logs by day with IN/OUT times
  const dayMap = useMemo(() => {
    return attendanceLogs.reduce<Record<string, { in?: string; out?: string }>>((acc, log) => {
      const day = log.checked_in_at.split("T")[0];
      if (!acc[day]) acc[day] = {};
      const time = new Date(log.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      if (log.punch_type === "in" || !log.punch_type) {
        acc[day].in = time;
      } else {
        acc[day].out = time;
      }
      return acc;
    }, {});
  }, [attendanceLogs]);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Member Report"
        subtitle="Complete profile, punch-in history, body & diet"
        actions={
          m && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-brand text-brand-foreground rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <Printer className="size-4" /> Print Complete Report
            </button>
          )
        }
      />

      {/* Search Input */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 no-print">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Roll No (IRN-1003), RFID (RF100123), Name, Phone..."
            className="w-full pl-9 pr-3 py-3 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
        {q && matches.length > 1 && (
          <p className="text-xs text-muted-foreground mt-3">
            {matches.length} matches found — showing first result. Refine your search for exact match.
          </p>
        )}
      </div>

      {/* Member Report */}
      {m && diet ? (
        <article className="bg-card border border-border rounded-2xl p-8 print:bg-white print:text-black space-y-6">
          {/* Header */}
          <header className="flex items-center gap-6 pb-6 border-b border-border">
            <img
              src={m.photo}
              alt={m.name}
              className="size-28 rounded-2xl object-cover ring-2 ring-brand"
              width={112}
              height={112}
            />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Complete Member Report
              </p>
              <h2 className="text-3xl font-heading mt-1">{m.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {m.rollNo} · RFID {m.rfid} · {m.phone}
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

          {/* Personal Information */}
          <Block title="Personal Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Info label="Gender" value={m.gender === "M" ? "Male" : m.gender === "F" ? "Female" : "Other"} />
              <Info label="Age" value={`${m.age} years`} />
              <Info label="Address" value={m.address || "Not provided"} />
              <Info label="Emergency Contact" value={m.emergencyContact || "Not provided"} />
              <Info label="Joined" value={new Date(m.joinDate).toLocaleDateString("en-IN")} />
              <Info label="Preferred Slot" value={m.preferredSlot} />
            </div>
          </Block>

          {/* Body Details */}
          <Block title="Body Details">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Info label="Height" value={`${m.heightCm} cm`} />
              <Info label="Weight" value={`${m.weightKg} kg`} />
              <Info label="BMI" value={diet.bmi.toFixed(1) + " · " + diet.bmiClass} />
              <Info label="BMR" value={`${diet.bmr} kcal`} />
              <Info label="TDEE" value={`${diet.tdee} kcal`} />
              <Info label="Goal" value={m.goal} />
              <Info label="Target Calories" value={`${diet.targetKcal} kcal/day`} />
              <Info label="Medical" value={m.medical || "None reported"} />
            </div>
          </Block>

          {/* Membership & Payments */}
          <Block title="Membership & Payments">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 bg-secondary/40 rounded-xl">
                <p className="text-2xl font-heading">{m.plan}</p>
                <p className="text-sm mt-1">
                  Fee: {money(m.feeAmount)} ·{" "}
                  {m.feePaid ? <span className="text-brand">Paid</span> : <span className="text-danger">Pending</span>}
                </p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Expiry: {new Date(m.expiryDate).toLocaleDateString("en-IN")} ·{" "}
                  {daysUntil(m.expiryDate) >= 0
                    ? `${daysUntil(m.expiryDate)}d left`
                    : `Expired ${-daysUntil(m.expiryDate)}d ago`}
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

          {/* Attendance Heatmap */}
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

          {/* Punch History */}
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

          {/* Diet Plan */}
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

          {/* Footer */}
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
    </div>
  );
}

// Helper Components
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

// Diet Calculation Function
function computeDiet(m: any) {
  const bmi = m.weightKg / Math.pow(m.heightCm / 100, 2);
  const bmiClass = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";

  const bmr = Math.round(
    m.gender === "F"
      ? 10 * m.weightKg + 6.25 * m.heightCm - 5 * m.age - 161
      : 10 * m.weightKg + 6.25 * m.heightCm - 5 * m.age + 5
  );

  const tdee = Math.round(bmr * 1.55);
  const goal = (m.goal || "").toLowerCase();
  const targetKcal = goal.includes("loss") ? tdee - 500 : goal.includes("gain") || goal.includes("muscle") ? tdee + 400 : tdee;

  const protein = Math.round(m.weightKg * (goal.includes("muscle") || goal.includes("strength") ? 2.0 : 1.6));
  const fats = Math.round((targetKcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((targetKcal - protein * 4 - fats * 9) / 4));
  const water = +(m.weightKg * 0.033).toFixed(1);

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