import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, Clock, Ghost, Wallet, CheckSquare, Package, X } from "lucide-react";
import { useGym, gym, computeNotifications, type Notification } from "@/lib/gym-store";

// Map notification types to their respective icons
const ICONS = {
  expiry: Clock,
  ghost: Ghost,
  dues: Wallet,
  task: CheckSquare,
  stock: Package,
} as const;

export function NotificationsBell() {
  const members = useGym((s) => s.members);
  const todos = useGym((s) => s.todos);
  const products = useGym((s) => s.products);
  const settings = useGym((s) => s.settings);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Compute notifications from the current state
  const notifs = useMemo(
    () => computeNotifications({ members, todos, products, settings, expenses: [], slots: {}, sales: [] }),
    [members, todos, products, settings]
  );

  // Generate low stock alerts separately
  const lowStockAlerts: Notification[] = useMemo(() => {
    return products
      .filter((p) => p.stock <= (p.lowStockAt || 3) && p.stock > 0)
      .map((p) => ({
        id: `stock-${p.id}`,
        type: "stock" as const,
        tone: "warn" as const,
        title: `${p.name} - Low Stock`,
        desc: `Only ${p.stock} units remaining`,
        href: "/store",
        ts: Date.now(),
      }));
  }, [products]);

  // Combine all notifications
  const allNotifications = [...notifs, ...lowStockAlerts];

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const count = allNotifications.length;
  
  // Group notifications by type for better organization
  const grouped: Record<string, Notification[]> = {};
  allNotifications.forEach((n) => {
    (grouped[n.type] ||= []).push(n);
  });

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative size-10 rounded-xl bg-card border border-border hover:border-brand/40 grid place-items-center transition"
        aria-label="Notifications"
      >
        <Bell className="size-4 text-foreground" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold grid place-items-center ring-2 ring-background">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[70vh] overflow-hidden bg-popover border border-border rounded-2xl shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base">Notifications</h3>
              <p className="text-[11px] text-muted-foreground">{count} alerts pending</p>
            </div>
            {count > 0 && (
              <button
                onClick={() => {
                  notifs.forEach((n) => gym.dismissNotification(n.id));
                  setOpen(false);
                }}
                className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-brand"
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
                {/* Group Header */}
                <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary/30">
                  {type === "expiry" ? "Membership Expiry" :
                   type === "ghost" ? "Scan Bypass / Ghosts" :
                   type === "dues" ? "Pending Dues" :
                   type === "task" ? "Tasks" : "Low Stock"}
                </div>
                
                {/* Notification Items */}
                {list.slice(0, 8).map((n) => {
                  const Icon = ICONS[n.type as keyof typeof ICONS] ?? AlertTriangle;
                  const toneCls = n.tone === "danger" ? "text-danger bg-danger/10"
                    : n.tone === "warn" ? "text-warn bg-warn/10" : "text-info bg-info/10";

                  return (
                    <div key={n.id} className="px-4 py-3 flex gap-3 hover:bg-secondary/50 border-b border-border/50 last:border-0">
                      <div className={"size-9 rounded-lg grid place-items-center shrink-0 " + toneCls}>
                        <Icon className="size-4" />
                      </div>
                      <Link
                        to={n.href.split("?")[0] as "/"}
                        search={Object.fromEntries(new URLSearchParams(n.href.split("?")[1] ?? "")) as never}
                        onClick={() => setOpen(false)}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                      </Link>
                      <button
                        onClick={() => {
                          if (n.type !== "stock") gym.dismissNotification(n.id);
                        }}
                        className="size-6 rounded grid place-items-center hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
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