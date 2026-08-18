import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Trash2, Star, RefreshCw, Phone, User, Calendar, ShieldCheck, X, Save, CreditCard, Copy, Eye, SlidersHorizontal, ArrowUpDown, Columns, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/AppShell";
import { useGym, daysUntil, money, generateSlots, type PlanType } from "@/lib/gym-store";
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
    meta: [{ title: "Members — ALPHA FITNESS" }],
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

const PLAN_ORDER: PlanType[] = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

function MembersPage() {
  const navSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [renewingMember, setRenewingMember] = useState<any | null>(null);
  const settings = useGym((s) => s.settings);
  const slots = generateSlots(settings.shifts, settings.slotDurationMin);
  const [q, setQ] = useState("");

  const filter = navSearch.filter ?? "all";
  const setFilter = (f: typeof filter) => navigate({ search: { filter: f } });

  const loadMembersData = () => {
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
  };

  useEffect(() => {
    loadMembersData();

    // Quiet background updater that fetches members list and recent ghost scanner activity log every 5 seconds
    const pollInterval = setInterval(() => {
      loadMembersData();
    }, 5000);

    const branchId = getActiveBranchId();
    if (!branchId) return () => clearInterval(pollInterval);

    // Live Supabase subscription on 'members' table for real-time updates
    const membersChannel = supabase
      .channel("members-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row?.branch_id || row.branch_id === branchId) {
            loadMembersData();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(membersChannel);
    };
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (!error) setMembers((prev) => prev.filter((m) => m.id !== id));
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

        {/* HeroUI Top Toolbar */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-secondary/80 rounded-full text-foreground font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-secondary">
              <SlidersHorizontal className="size-3.5" /> Filter
            </span>
            <span className="px-3 py-1.5 bg-secondary/80 rounded-full text-foreground font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-secondary">
              <ArrowUpDown className="size-3.5" /> Sort
            </span>
            <span className="px-3 py-1.5 bg-secondary/80 rounded-full text-foreground font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-secondary">
              <Columns className="size-3.5" /> Columns
            </span>
          </div>
          <div className="font-semibold text-foreground">
            Total Members: <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand font-bold">{filtered.length}</span>
          </div>
        </div>

        {/* Desktop View Table - HeroUI Styled */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border bg-secondary/20">
                <th className="px-6 py-3.5">Worker ID</th>
                <th className="px-6 py-3.5">Member</th>
                <th className="px-4 py-3.5">Role / Plan</th>
                <th className="px-4 py-3.5">Fee Status</th>
                <th className="px-4 py-3.5">Expiry</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((m) => {
                const s = statusOf(m);
                const d = daysUntil(m.expiryDate ?? m.expiry_date);
                const overdueDays = d < 0 ? -d : 0;
                const rowRed = d < 0 && overdueDays >= 5;
                const badge = planBadge(m.plan);
                const displayId = `#${(m.rollNo ?? m.roll_no ?? m.id ?? "1001").toString().replace(/[^0-9]/g, "").padStart(7, "0")}`;
                const nameCls =
                  "font-bold text-foreground text-sm " +
                  (badge.golden
                    ? "px-2 py-0.5 rounded-md bg-gradient-to-r from-yellow-500/30 to-amber-400/30 text-yellow-200 ring-1 ring-yellow-400/50"
                    : "");
                const expiryText =
                  d < 0 ? `+${overdueDays}d overdue` : d === 0 ? "Today" : `${d}d remaining`;
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
                      "transition-colors group " +
                      (rowRed ? "bg-danger/10 hover:bg-danger/15" : "hover:bg-secondary/40")
                    }
                  >
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{displayId}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(displayId);
                            toast.success(`Copied ${displayId} to clipboard`);
                          }}
                          className="size-6 rounded bg-secondary/80 hover:bg-brand/20 hover:text-brand grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-muted-foreground"
                          title="Copy ID"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {m.photo ? (
                          <img
                            src={m.photo}
                            alt={m.name}
                            className="size-10 rounded-full object-cover ring-2 ring-border/80 shadow-sm"
                            width={40}
                            height={40}
                            loading="lazy"
                          />
                        ) : (
                          <div className="size-10 rounded-full bg-gradient-to-br from-brand/30 to-brand/10 grid place-items-center text-brand font-black text-sm ring-2 ring-border/80 shadow-sm">
                            {m.name?.[0] ?? "?"}
                          </div>
                        )}
                        <div className="min-w-0">
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
                          <p className="text-[11px] text-muted-foreground truncate font-medium">
                            {m.phone || "No phone"} · {m.rfid ? `RFID: ${m.rfid}` : "No RFID"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-foreground">{m.plan || "Member"}</div>
                      <div className="text-[11px] text-muted-foreground">{m.preferredSlot || "Any Time"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={"inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-full " + (feePaid ? "bg-brand/10 text-brand" : "bg-danger/10 text-danger")}>
                        {money(feeAmount)} {feePaid ? "✓ Paid" : "· Unpaid"}
                      </span>
                    </td>
                    <td className={"px-4 py-4 font-semibold text-xs " + expiryCls}>{expiryText}</td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          "px-2.5 py-1 text-[10px] rounded-full uppercase font-extrabold tracking-wider inline-block w-fit shadow-xs " +
                          statusStyles[s]
                        }
                      >
                        {s}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to="/reports"
                          search={{ q: m.rollNo ?? m.roll_no }}
                          className="size-8 rounded-full bg-secondary/80 hover:bg-brand/20 hover:text-brand grid place-items-center text-muted-foreground transition cursor-pointer"
                          title="View Full Profile Report"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <button
                          onClick={() => setRenewingMember(m)}
                          className="size-8 rounded-full bg-secondary/80 hover:bg-brand/20 hover:text-brand grid place-items-center text-muted-foreground transition cursor-pointer"
                          title="Renew Membership"
                        >
                          <RefreshCw className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          className="size-8 rounded-full bg-secondary/80 hover:bg-danger/20 hover:text-danger grid place-items-center text-muted-foreground transition cursor-pointer"
                          title="Delete Member"
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
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
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
                      onClick={() => setRenewingMember(m)}
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

      {/* Plan Renewal Modal */}
      {renewingMember && (
        <RenewModal
          member={renewingMember}
          onClose={() => setRenewingMember(null)}
          onRenewed={() => {
            loadMembersData();
            setRenewingMember(null);
          }}
        />
      )}
    </div>
  );
}

// Reusable Renewal Modal directly embedded to avoid circular dependencies
function RenewModal({ member, onClose, onRenewed }: { member: any; onClose: () => void; onRenewed: () => void }) {
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