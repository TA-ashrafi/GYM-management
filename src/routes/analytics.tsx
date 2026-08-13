import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import { fetchMembers, supabase, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — ALPHA FITNESS" }] }),
  component: Analytics,
});

const COLORS = [
  "var(--color-brand)",
  "var(--color-accent)",
  "var(--color-warn)",
  "var(--color-danger)",
  "var(--color-chart-5)",
];

function statusOf(m: any): "active" | "expiring" | "expired" | "ghost" {
  const d = Math.ceil(
    (new Date(m.expiryDate ?? m.expiry_date).getTime() - Date.now()) / 86400000,
  );
  if (d < 0) return "expired";

  // Ghost checks: if no visit in 4 days
  const lastVisit = m.attendance?.[0];
  const since = lastVisit
    ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000)
    : 999;
  if (since >= 4 && d >= 0) return "ghost";

  if (d <= 7) return "expiring";
  return "active";
}

function Analytics() {
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch actual data from Supabase for the active branch
  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetchMembers(),
      supabase
        .from("attendance_logs")
        .select("*")
        .eq("branch_id", branchId)
        .order("checked_in_at", { ascending: false }),
    ])
      .then(([mList, attRes]) => {
        // Attach attendance to members for helper checks
        const logs = attRes.data ?? [];
        const mappedMembers = mList.map((m: any) => {
          const mLogs = logs
            .filter((l: any) => l.member_id === m.id)
            .map((l: any) => l.checked_in_at);
          return { ...m, attendance: mLogs };
        });
        setMembers(mappedMembers);
        setAttendance(logs);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const peakHours = useMemo(() => {
    const hours: Record<string, number> = {};
    for (let h = 5; h <= 22; h++)
      hours[h.toString().padStart(2, "0") + ":00"] = 0;
    attendance.forEach((log) => {
      const h = new Date(log.checked_in_at).getHours();
      const key = h.toString().padStart(2, "0") + ":00";
      if (hours[key] !== undefined) hours[key]++;
    });
    return Object.entries(hours).map(([h, c]) => ({ hour: h, visits: c }));
  }, [attendance]);

  const planSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      const p = m.plan || "Monthly";
      counts[p] = (counts[p] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  const statusSplit = useMemo(() => {
    const counts = { active: 0, expiring: 0, expired: 0, ghost: 0 };
    members.forEach((m) => {
      const st = statusOf(m);
      if (counts[st] !== undefined) counts[st]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  const last30 = useMemo(() => {
    const arr: { d: string; visits: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const visits = attendance.filter((log) => {
        const logDate = log.checked_in_at.split("T")[0];
        return (
          logDate === dateStr && (log.punch_type === "in" || !log.punch_type)
        );
      }).length;
      arr.push({
        d: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        visits,
      });
    }
    return arr;
  }, [attendance]);

  const goalSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      const g = m.goal || "Muscle Gain";
      counts[g] = (counts[g] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  if (loading)
    return (
      <div className="p-8 text-center py-20 text-muted-foreground">
        Loading Analytics...
      </div>
    );

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] w-full">
      <PageHeader
        title="Analytics"
        subtitle="A complete overview of your gym's performance in real-time"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Peak Hours" subtitle="Busiest hours of the day">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakHours}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="hour"
                stroke="var(--color-muted-foreground)"
                fontSize={10}
              />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={tt} />
              <Bar
                dataKey="visits"
                fill="var(--color-brand)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Last 30 Days Footfall">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={last30}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="d"
                stroke="var(--color-muted-foreground)"
                fontSize={9}
                interval={3}
              />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={tt} />
              <Line
                type="monotone"
                dataKey="visits"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Membership Plan Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={planSplit}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
              >
                {planSplit.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Member Status Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusSplit}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
              >
                {statusSplit.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Fitness Goals Split" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={goalSplit} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                type="number"
                stroke="var(--color-muted-foreground)"
                fontSize={10}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                width={115}
              />
              <Tooltip contentStyle={tt} />
              <Bar
                dataKey="value"
                fill="var(--color-accent)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

const tt = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "bg-card border border-border rounded-2xl p-4 sm:p-6 " +
        (className ?? "")
      }
    >
      <div className="mb-4">
        <h3 className="font-heading text-base sm:text-lg text-foreground font-semibold">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
