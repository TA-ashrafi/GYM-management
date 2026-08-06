import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Trash2, Star, RefreshCw, Phone, User, Calendar, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/AppShell";
import { useGym, daysUntil, money, generateSlots } from "@/lib/gym-store";
import { fetchMembers, supabase, getActiveBranchId } from "@/lib/supabase";

function statusOf(m: any): "active" | "expiring" | "expired" {
  const d = daysUntil(m.expiryDate ?? m.expiry_date);
  if (d < 0) return "expired";
  if (d <= 7) return "expiring";
  return "active";
}

function planBadge(plan: string) {
  if (plan === "Yearly") return { stars: 3, golden: true };
  if (plan === "HalfYearly") return { stars: 2, golden: false };
  if (plan === "Quarterly") return { stars: 1, golden: false };
  return { stars: 0, golden: false };
}

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [{ title: "Members — Fitness Streak" }],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({
      filter: z.enum(["all", "active", "expiring", "expired", "ghost", "unpaid"]).optional(),
    }).parse(s),
  component: MembersRoot,
});

function MembersRoot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/members/new" || pathname.startsWith("/members/new")) {
    return <Outlet />;
  }

  return <MembersPage />;
}

const statusStyles = {
  active: "bg-brand/10 text-brand border border-brand/20",
  expiring: "bg-warn/10 text-warn border border-warn/20",
  expired: "bg-danger/10 text-danger border border-danger/20",
} as const;

function MembersPage() {
  const navSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const settings = useGym((s) => s.settings);
  const slots = generateSlots(settings.shifts, settings.slotDurationMin);
  const [q, setQ] = useState("");

  const filter = navSearch.filter ?? "all";
  const setFilter = (f: typeof filter) => navigate({ search: { filter: f } });

  useEffect(() => {
    fetchMembers().then(setMembers);

    const branchId = getActiveBranchId();
    if (!branchId) return;

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    fourDaysAgo.setHours(0, 0, 0, 0);

    supabase
      .from("attendance_logs")
      .select("member_id, checked_in_at")
      .eq("branch_id", branchId)
      .gte("checked_in_at", fourDaysAgo.toISOString())
      .then(({ data }) => setRecentLogs(data ?? []));
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (!error) setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleRenew(m: any) {
    const plan = m.plan as "Monthly" | "Quarterly" | "HalfYearly" | "Yearly";
    const DAYS: Record<string, number> = {
      Monthly: 30, Quarterly: 90, HalfYearly: 180, Yearly: 365,
    };

    const expiryRaw = m.expiryDate ?? m.expiry_date;
    const baseDate = new Date(expiryRaw) > new Date()
      ? new Date(expiryRaw)
      : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + DAYS[plan]);

    const amount = m.feeAmount ?? m.fee_amount ?? 0;

    const confirmed = confirm(
      `Renew ${m.name}'s ${plan} plan?\n` +
      `New expiry: ${newExpiry.toLocaleDateString("en-IN")}`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("members")
      .update({
        expiry_date: newExpiry.toISOString(),
        fee_paid: true,
      })
      .eq("id", m.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    const branchId = getActiveBranchId();
    if (branchId) {
      const { error: payError } = await supabase.from("payments").insert({
        branch_id: branchId,
        member_id: m.id,
        amount,
        plan: m.plan,
        payment_date: new Date().toISOString(),
        note: "Plan renewal",
      });
      if (payError) console.error("Payment insert error:", payError);
    }

    setMembers((prev) =>
      prev.map((x) =>
        x.id === m.id
          ? { ...x, expiryDate: newExpiry.toISOString(), feePaid: true }
          : x
      )
    );
    toast.success(`${m.name}'s plan renewed successfully! ✓`);
  }

  const recentMemberIds = new Set(recentLogs.map((l: any) => l.member_id));

  const filtered = members.filter((m) => {
    const s = statusOf(m);
    const matchesSearch =
      !q ||
      ((m.name ?? "") + (m.rollNo ?? m.roll_no ?? "") + (m.phone ?? "") + (m.rfid ?? ""))
        .toLowerCase()
        .includes(q.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "active") return s === "active";
    if (filter === "expiring") return s === "expiring";
    if (filter === "expired") return s === "expired";
    if (filter === "unpaid") return !(m.feePaid ?? m.fee_paid);
    if (filter === "ghost") {
      // Active member who has NOT punched in last 4 days
      const d = daysUntil(m.expiryDate ?? m.expiry_date);
      return d >= 0 && !recentMemberIds.has(m.id);
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] w-full">
      <PageHeader
        title="Members"
        subtitle={`${members.length} total • ${filtered.length} shown`}
        actions={
          <Link
            to="/members/new"
            className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl hover:scale-[1.02] active:scale-95 transition-transform text-sm w-full sm:w-auto text-center"
          >
            + Add Member
          </Link>
        }
      />

      <div className="bg-card border border-border rounded-2xl">
        <div className="p-4 border-b border-border flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, roll number, RFID or phone"
              className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "active", "expiring", "expired", "ghost", "unpaid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "px-3 py-1.5 text-xs rounded-lg capitalize transition-colors cursor-pointer " +
                  (filter === f
                    ? "bg-brand text-brand-foreground font-medium"
                    : "bg-secondary text-muted-foreground hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="px-6 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Roll / RFID</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Fee</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Slot</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => {
                const s = statusOf(m);
                const d = daysUntil(m.expiryDate ?? m.expiry_date);
                const overdueDays = d < 0 ? -d : 0;
                const rowRed = d < 0 && overdueDays >= 5;
                const badge = planBadge(m.plan);
                const nameCls =
                  "font-semibold " +
                  (badge.golden
                    ? "px-2 py-0.5 rounded-md bg-gradient-to-r from-yellow-500/30 to-amber-400/30 text-yellow-200 ring-1 ring-yellow-400/50"
                    : "");
                const expiryText =
                  d < 0 ? `+${overdueDays}d` : d === 0 ? "Today" : `${d}d`;
                const expiryCls =
                  d < 0
                    ? "text-danger font-bold"
                    : d <= 7
                      ? "text-warn font-semibold"
                      : "text-brand";
                const feePaid = m.feePaid ?? m.fee_paid;
                const feeAmount = m.feeAmount ?? m.fee_amount ?? 0;

                return (
                  <tr
                    key={m.id}
                    className={
                      "transition-colors " +
                      (rowRed ? "bg-danger/10 hover:bg-danger/15" : "hover:bg-secondary/30")
                    }
                  >
                    <td className="px-6 py-3">
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
                        <div>
                          <p className="flex items-center gap-1.5 flex-wrap">
                            <span className={nameCls}>{m.name}</span>
                            {badge.stars > 0 && (
                              <span
                                className={
                                  "inline-flex items-center " +
                                  (badge.golden ? "text-yellow-400" : "text-warn")
                                }
                              >
                                {Array.from({ length: badge.stars }).map((_, i) => (
                                  <Star key={i} className="size-3 fill-current" />
                                ))}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {m.phone} · {m.gender} · {m.age}y
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      <div>{m.rollNo ?? m.roll_no}</div>
                      <div className="text-brand">{m.rfid}</div>
                    </td>
                    <td className="px-4 py-3">{m.plan}</td>
                    <td className="px-4 py-3">
                      <span className={feePaid ? "text-brand" : "text-danger"}>
                        {money(feeAmount)} {feePaid ? "✓" : "·due"}
                      </span>
                    </td>
                    <td className={"px-4 py-3 " + expiryCls}>{expiryText}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {m.preferredSlot ?? m.preferred_slot}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider inline-block w-fit " +
                          statusStyles[s]
                        }
                      >
                        {s}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          to="/reports"
                          search={{ q: m.rollNo ?? m.roll_no }}
                          className="size-8 rounded-md bg-secondary hover:bg-accent/10 hover:text-accent grid place-items-center text-[10px] font-bold"
                        >
                          R
                        </Link>
                        <button
                          onClick={() => handleRenew(m)}
                          className="size-8 rounded-md bg-secondary hover:bg-brand/10 hover:text-brand grid place-items-center transition cursor-pointer"
                          title="Renew Plan"
                        >
                          <RefreshCw className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          className="size-8 rounded-md bg-secondary hover:bg-danger/10 hover:text-danger grid place-items-center transition cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    {members.length === 0
                      ? "No members found. Click + Add Member!"
                      : "No members match your search criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card Grid */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.map((m) => {
            const s = statusOf(m);
            const d = daysUntil(m.expiryDate ?? m.expiry_date);
            const overdueDays = d < 0 ? -d : 0;
            const rowRed = d < 0 && overdueDays >= 5;
            const badge = planBadge(m.plan);
            const nameCls =
              "font-semibold text-foreground " +
              (badge.golden
                ? "px-1.5 py-0.5 rounded bg-gradient-to-r from-yellow-500/20 to-amber-400/20 text-yellow-300 ring-1 ring-yellow-400/30 text-xs"
                : "");
            const expiryText =
              d < 0 ? `Expired ${overdueDays}d ago` : d === 0 ? "Expires today" : `${d}d left`;
            const expiryCls =
              d < 0
                ? "text-danger font-bold"
                : d <= 7
                  ? "text-warn font-semibold"
                  : "text-brand";
            const feePaid = m.feePaid ?? m.fee_paid;
            const feeAmount = m.feeAmount ?? m.fee_amount ?? 0;

            return (
              <div
                key={m.id}
                className={
                  "p-4 flex flex-col gap-3 transition-colors " +
                  (rowRed ? "bg-danger/5" : "")
                }
              >
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {m.photo ? (
                      <img
                        src={m.photo}
                        alt={m.name}
                        className="size-11 rounded-full object-cover ring-1 ring-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-11 rounded-full bg-brand/20 grid place-items-center text-brand font-bold text-base">
                        {m.name?.[0] ?? "?"}
                      </div>
                    )}
                    <div>
                      <h4 className="flex items-center gap-1 flex-wrap">
                        <span className={nameCls}>{m.name}</span>
                        {badge.stars > 0 && (
                          <span
                            className={
                              "inline-flex items-center gap-0.5 " +
                              (badge.golden ? "text-yellow-400" : "text-warn")
                            }
                          >
                            {Array.from({ length: badge.stars }).map((_, i) => (
                              <Star key={i} className="size-3 fill-current" />
                            ))}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Phone className="size-3" /> {m.phone}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={
                      "px-2 py-0.5 text-[9px] rounded uppercase font-bold tracking-wider " +
                      statusStyles[s]
                    }
                  >
                    {s}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/35 p-3 rounded-xl border border-border/10">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="size-3.5" />
                    <span>{m.gender} · {m.age} years</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldCheck className="size-3.5" strokeWidth={2.5} />
                    <span>RFID: <span className="font-mono text-[10px] text-brand">{m.rfid || "None"}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span className={expiryCls}>{expiryText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-bold text-[10px] bg-secondary px-1.5 py-0.5 rounded text-foreground uppercase tracking-wider">{m.plan}</span>
                    <span className={feePaid ? "text-brand font-semibold" : "text-danger font-bold"}>
                      {money(feeAmount)} {feePaid ? "Paid" : "Due"}
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ID: {m.rollNo ?? m.roll_no}
                  </span>

                  <div className="flex gap-1.5">
                    <Link
                      to="/reports"
                      search={{ q: m.rollNo ?? m.roll_no }}
                      className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold inline-flex items-center gap-1 hover:bg-secondary/80"
                    >
                      Report
                    </Link>
                    <button
                      onClick={() => handleRenew(m)}
                      className="p-1.5 rounded-lg bg-secondary text-brand hover:bg-brand/10 transition cursor-pointer"
                      title="Renew Plan"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="p-1.5 rounded-lg bg-secondary text-danger hover:bg-danger/10 transition cursor-pointer"
                      title="Delete Member"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {members.length === 0
                ? "No members found. Click + Add Member!"
                : "No members match your search criteria."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}