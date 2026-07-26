import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Trash2, Star, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/AppShell";
import { useGym, daysUntil, money, generateSlots } from "@/lib/gym-store";
import { fetchMembers, supabase } from "@/lib/supabase";

// Helper function to determine member status
function statusOf(m: any): "active" | "expiring" | "expired" {
  const d = daysUntil(m.expiryDate);
  if (d < 0) return "expired";
  if (d <= 7) return "expiring";
  return "active";
}

// Helper function to get plan badge details
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

// Root component to handle nested routes
function MembersRoot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  
  // Render Outlet for /members/new route
  if (pathname === "/members/new" || pathname.startsWith("/members/new")) {
    return <Outlet />;
  }
  
  return <MembersPage />;
}

const statusStyles = {
  active: "bg-brand/10 text-brand",
  expiring: "bg-warn/10 text-warn",
  expired: "bg-danger/10 text-danger",
} as const;

function MembersPage() {
  const navSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const settings = useGym((s) => s.settings);
  const slots = generateSlots(settings.shifts, settings.slotDurationMin);
  const [q, setQ] = useState("");
  
  const filter = navSearch.filter ?? "all";
  const setFilter = (f: typeof filter) => navigate({ search: { filter: f } });

  // Fetch members on mount
  useEffect(() => {
    fetchMembers().then(setMembers);
  }, []);

  // Delete a member
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (!error) setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  // Renew a member's plan
  async function handleRenew(m: any) {
    const plan = m.plan as "Monthly" | "Quarterly" | "HalfYearly" | "Yearly";
    const DAYS: Record<string, number> = {
      Monthly: 30, Quarterly: 90, HalfYearly: 180, Yearly: 365
    };
    
    // Renew from today or expiry date — whichever is later
    const baseDate = new Date(m.expiryDate) > new Date() 
      ? new Date(m.expiryDate)  // Still active — extend from expiry
      : new Date();              // Expired — start from today
    
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + DAYS[plan]);

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

    if (!error) {
      setMembers((prev) =>
        prev.map((x) =>
          x.id === m.id
            ? { ...x, expiryDate: newExpiry.toISOString(), feePaid: true }
            : x
        )
      );
      toast.success(`${m.name}'s plan renewed successfully! ✓`);
    } else {
      toast.error(error.message);
    }
  }

  // Filter members based on search and filter criteria
  const filtered = members.filter((m) => {
    const s = statusOf(m);
    const matchesSearch = !q ||
      (m.name + m.rollNo + m.phone + m.rfid)
        .toLowerCase()
        .includes(q.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === "active") return s === "active";
    if (filter === "expiring") return s === "expiring";
    if (filter === "expired") return s === "expired";
    if (filter === "unpaid") return !m.feePaid;
    if (filter === "ghost") return false; // To be implemented later
    return true; // all
  });

  return (
    <div className="p-8 max-w-[1600px]">
      <PageHeader
        title="Members"
        subtitle={`${members.length} total • ${filtered.length} shown`}
        actions={
          <Link
            to="/members/new"
            className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl hover:scale-[1.02] active:scale-95 transition-transform text-sm"
          >
            + Add Member
          </Link>
        }
      />

      <div className="bg-card border border-border rounded-2xl">
        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
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
                className={"px-3 py-1.5 text-xs rounded-lg capitalize transition-colors " +
                  (filter === f
                    ? "bg-brand text-brand-foreground font-medium"
                    : "bg-secondary text-muted-foreground hover:text-foreground")}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Members Table */}
        <div className="overflow-x-auto">
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
                const d = daysUntil(m.expiryDate);
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

                return (
                  <tr
                    key={m.id}
                    className={"transition-colors " +
                      (rowRed
                        ? "bg-danger/10 hover:bg-danger/15"
                        : "hover:bg-secondary/30")}
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
                            {m.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="flex items-center gap-1.5">
                            <span className={nameCls}>{m.name}</span>
                            {badge.stars > 0 && (
                              <span className={"inline-flex items-center " + (badge.golden ? "text-yellow-400" : "text-warn")}>
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
                      <div>{m.rollNo}</div>
                      <div className="text-brand">{m.rfid}</div>
                    </td>
                    <td className="px-4 py-3">{m.plan}</td>
                    <td className="px-4 py-3">
                      <span className={m.feePaid ? "text-brand" : "text-danger"}>
                        {money(m.feeAmount)} {m.feePaid ? "✓" : "·due"}
                      </span>
                    </td>
                    <td className={"px-4 py-3 " + expiryCls}>{expiryText}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{m.preferredSlot}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={"px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider inline-block w-fit " + statusStyles[s]}>
                        {s}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          to="/reports"
                          search={{ q: m.rollNo }}
                          className="size-8 rounded-md bg-secondary hover:bg-accent/10 hover:text-accent grid place-items-center text-[10px] font-bold"
                        >
                          R
                        </Link>
                        <button
                          onClick={() => handleRenew(m)}
                          className="size-8 rounded-md bg-secondary hover:bg-brand/10 hover:text-brand grid place-items-center transition"
                          title="Renew Plan"
                        >
                          <RefreshCw className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          className="size-8 rounded-md bg-secondary hover:bg-danger/10 hover:text-danger grid place-items-center transition"
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
      </div>
    </div>
  );
}