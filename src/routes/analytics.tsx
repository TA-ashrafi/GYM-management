import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { useGym, memberStatus } from "@/lib/gym-store";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — IronSync" }] }),
  component: Analytics,
});

const COLORS = ["var(--color-brand)", "var(--color-accent)", "var(--color-warn)", "var(--color-danger)", "var(--color-chart-5)"];

function Analytics() {
  const members = useGym((s) => s.members);

  const peakHours = useMemo(() => {
    const hours: Record<string, number> = {};
    for (let h = 5; h <= 22; h++) hours[h.toString().padStart(2, "0") + ":00"] = 0;
    members.forEach((m) =>
      m.attendance.forEach((a) => {
        const h = new Date(a).getHours();
        const key = h.toString().padStart(2, "0") + ":00";
        if (hours[key] !== undefined) hours[key]++;
      }),
    );
    return Object.entries(hours).map(([h, c]) => ({ hour: h, visits: c }));
  }, [members]);

  const planSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => (counts[m.plan] = (counts[m.plan] ?? 0) + 1));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  const statusSplit = useMemo(() => {
    const counts = { active: 0, expiring: 0, expired: 0, ghost: 0 };
    members.forEach((m) => counts[memberStatus(m)]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  const last30 = useMemo(() => {
    const arr: { d: string; visits: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const visits = members.reduce(
        (sum, m) => sum + m.attendance.filter((a) => new Date(a).toDateString() === date.toDateString()).length,
        0,
      );
      arr.push({ d: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), visits });
    }
    return arr;
  }, [members]);

  const goalSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => (counts[m.goal] = (counts[m.goal] ?? 0) + 1));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  return (
    <div className="p-8 max-w-[1600px]">
      <PageHeader title="Analytics" subtitle="A complete overview of your gym's performance" />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Peak Hours" subtitle="Busiest hours of the day">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="visits" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Last 30 Days Footfall">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={9} interval={3} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={tt} />
              <Line type="monotone" dataKey="visits" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Membership Plan Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={planSplit} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {planSplit.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Member Status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusSplit} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {statusSplit.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Goals Distribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={goalSplit} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} width={110} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 6, 6, 0]} />
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

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"bg-card border border-border rounded-2xl p-6 " + (className ?? "")}>
      <div className="mb-4">
        <h3 className="font-heading text-lg text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}