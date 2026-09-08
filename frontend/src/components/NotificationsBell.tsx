import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, Clock, Ghost, Wallet, CheckSquare, Package, X } from "lucide-react";
import { supabase, getActiveBranchId } from "@/lib/supabase";
import { daysUntil } from "@/lib/gym-store";

type Notif = {
  id: string;
  type: "expiry" | "ghost" | "dues" | "task" | "stock" | "slot";
  tone: "danger" | "warn" | "info";
  title: string;
  desc: string;
  href?: string;
};

const ICONS = {
  expiry: Clock,
  ghost: Ghost,
  dues: Wallet,
  task: CheckSquare,
  stock: Package,
  slot: AlertTriangle,
} as const;

function useNotifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    async function load() {
      const branchId = getActiveBranchId();
      if (!branchId) return;

      const out: Notif[] = [];

      // Members
      const { data: members } = await supabase
        .from("members")
        .select("*")
        .eq("branch_id", branchId);

      // Today attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: logs } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("branch_id", branchId)
        .gte("checked_in_at", today + "T00:00:00");

      // Products
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("branch_id", branchId);

      // Todos (open only)
      const { data: todos } = await supabase
        .from("todos")
        .select("*")
        .eq("branch_id", branchId)
        .eq("done", false);

      members?.forEach((m: any) => {
        const expiry = m.expiry_date ?? m.expiryDate;
        const d = daysUntil(expiry);

        // Expiry
        if (d < 0) {
          out.push({
            id: `exp_${m.id}`,
            type: "expiry",
            tone: "danger",
            title: `${m.name}'s membership expired`,
            desc: `${Math.abs(d)} days ago — renewal pending`,
            href: "/members?filter=expired",
          });
        } else if (d <= 7) {
          out.push({
            id: `expg_${m.id}`,
            type: "expiry",
            tone: "warn",
            title: `${m.name}'s membership expiring`,
            desc: `${d} days left`,
            href: "/members?filter=expiring",
          });
        }

        // Unpaid dues
        if (!m.fee_paid && !m.feePaid) {
          out.push({
            id: `dues_${m.id}`,
            type: "dues",
            tone: "warn",
            title: `Dues pending: ${m.name}`,
            desc: `₹${m.fee_amount ?? m.feeAmount ?? 0} unpaid`,
            href: "/members?filter=unpaid",
          });
        }

        // Wrong time slot
        const preferredSlot = m.preferred_slot ?? m.preferredSlot;
        if (preferredSlot && logs) {
          const memberPunchedToday = logs.find((l: any) => l.member_id === m.id);
          if (memberPunchedToday) {
            const [startStr, endStr] = preferredSlot.split("-");
            if (startStr && endStr) {
              const [sh, sm] = startStr.split(":").map(Number);
              const [eh, em] = endStr.split(":").map(Number);
              const slotStart = sh * 60 + (sm || 0);
              const slotEnd = eh * 60 + (em || 0);
              const punchTime = new Date(memberPunchedToday.checked_in_at);
              const punchMin = punchTime.getHours() * 60 + punchTime.getMinutes();

              if (punchMin < slotStart || punchMin > slotEnd) {
                out.push({
                  id: `slot_${m.id}_${today}`,
                  type: "slot",
                  tone: "warn",
                  title: `Wrong slot: ${m.name}`,
                  desc: `Expected ${preferredSlot}, checked in at ${punchTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`,
                  href: "/attendance",
                });
              }
            }
          }
        }
      });

      // Low stock
      products?.forEach((p: any) => {
        const lowAt = p.low_stock_at ?? p.lowStockAt ?? 3;
        if (p.stock <= lowAt) {
          out.push({
            id: `stock_${p.id}`,
            type: "stock",
            tone: p.stock === 0 ? "danger" : "warn",
            title: `Low stock: ${p.name}`,
            desc: `Only ${p.stock} units left (alert at ${lowAt})`,
            href: "/store",
          });
        }
      });

      // Todos
      todos?.forEach((t: any) => {
        out.push({
          id: `todo_${t.id}`,
          type: "task",
          tone: t.priority === "high" ? "danger" : t.priority === "med" ? "warn" : "info",
          title: `Task pending: ${t.title}`,
          desc: t.note ?? `Priority: ${t.priority}`,
          href: "/todos",
        });
      });

      setNotifs(out);
    }

    load();
  }, []);

  return notifs;
}

export function NotificationsBell() {
  const notifs = useNotifications();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const visible = notifs.filter((n) => !dismissed.has(n.id));

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const count = visible.length;

  // Group by type
  const grouped: Record<string, Notif[]> = {};
  visible.forEach((n) => {
    (grouped[n.type] ||= []).push(n);
  });

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative size-10 rounded-xl bg-card border border-border hover:border-brand/40 grid place-items-center transition cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="size-4 text-foreground" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold grid place-items-center ring-2 ring-background">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Solved mobile overflow using fixed responsive viewport positioning */}
      {open && (
        <div className="fixed md:absolute top-16 left-4 right-4 md:left-auto md:right-0 md:top-full mt-2 w-auto md:w-[360px] max-h-[70vh] overflow-hidden bg-popover border border-border rounded-2xl shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base text-foreground">Notifications</h3>
              <p className="text-[11px] text-muted-foreground">{count} alerts pending</p>
            </div>
            {count > 0 && (
              <button
                onClick={() => {
                  setDismissed(new Set(notifs.map((n) => n.id)));
                  setOpen(false);
                }}
                className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-brand cursor-pointer font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {count === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                All clear! No pending alerts.
              </div>
            )}

            {Object.entries(grouped).map(([type, list]) => (
              <div key={type}>
                <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary/30 font-bold">
                  {type === "expiry" ? "Membership Expiry" :
                   type === "ghost" ? "Scan Bypass / Ghosts" :
                   type === "dues" ? "Pending Dues" :
                   type === "task" ? "Tasks" :
                   type === "slot" ? "Wrong Slot" : "Low Stock"}
                </div>

                {list.slice(0, 8).map((n) => {
                  const Icon = ICONS[n.type] ?? AlertTriangle;
                  const toneCls =
                    n.tone === "danger" ? "text-danger bg-danger/10" :
                    n.tone === "warn" ? "text-warn bg-warn/10" :
                    "text-info bg-info/10";

                  return (
                    <div key={n.id} className="px-4 py-3 flex gap-3 hover:bg-secondary/50 border-b border-border/50 last:border-0">
                      <div className={"size-9 rounded-lg grid place-items-center shrink-0 " + toneCls}>
                        <Icon className="size-4" />
                      </div>
                      <Link
                        to={(n.href?.split("?")[0] ?? "/") as "/"}
                        search={Object.fromEntries(new URLSearchParams(n.href?.split("?")[1] ?? "")) as never}
                        onClick={() => setOpen(false)}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium truncate text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                      </Link>
                      <button
                        onClick={() => setDismissed((prev) => new Set([...prev, n.id]))}
                        className="size-6 rounded grid place-items-center hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}