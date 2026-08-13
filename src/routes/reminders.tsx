import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageCircle, Phone, Check } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import {
  useGym,
  memberStatus,
  daysUntil,
  daysSince,
  money,
} from "@/lib/gym-store";

export const Route = createFileRoute("/reminders")({
  head: () => ({ meta: [{ title: "WhatsApp Reminders — ALPHA FITNESS" }] }),
  component: RemindersPage,
});

type Bucket = "expiring" | "expired" | "ghost" | "unpaid";
const TABS: { id: Bucket; label: string; tone: string }[] = [
  { id: "expiring", label: "Expiring Soon", tone: "text-warn" },
  { id: "expired", label: "Expired", tone: "text-danger" },
  { id: "ghost", label: "Ghosts (no-show)", tone: "text-danger" },
  { id: "unpaid", label: "Unpaid Dues", tone: "text-warn" },
];

// Generate default message based on bucket type
function defaultMessage(
  bucket: Bucket,
  opts: {
    name: string;
    gymName: string;
    ownerName: string;
    days?: number;
    amount?: number;
  },
) {
  const first = opts.name.split(" ")[0];
  switch (bucket) {
    case "expiring":
      return `Hi ${first},\n\nYour ${opts.gymName} membership expires in ${opts.days} days. Please renew to keep your fitness routine uninterrupted.\n\nRegards,\n${opts.ownerName}`;
    case "expired":
      return `Hi ${first},\n\nYour ${opts.gymName} membership expired ${opts.days} days ago. We miss you at the gym. Please visit and renew today.\n\nRegards,\n${opts.ownerName}`;
    case "ghost":
      return `Hey ${first},\n\nWe noticed you haven't checked in for ${opts.days} days. Everything okay? Don't miss out on your fitness routine. Visit us today.\n\nRegards,\n${opts.ownerName} (${opts.gymName})`;
    case "unpaid":
      return `Hi ${first},\n\nYour ${opts.gymName} membership fee of ${money(opts.amount ?? 0)} is pending. Please clear the dues at your earliest convenience.\n\nThanks,\n${opts.ownerName}`;
  }
}

// Generate WhatsApp link
function waLink(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function RemindersPage() {
  const members = useGym((s) => s.members);
  const settings = useGym((s) => s.settings);
  const [bucket, setBucket] = useState<Bucket>("ghost");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [tmpl, setTmpl] = useState<string>("");

  // Filter members based on selected bucket
  const list = useMemo(() => {
    return members.filter((m) => {
      const st = memberStatus(m);
      if (bucket === "expiring") return st === "expiring";
      if (bucket === "expired") return st === "expired";
      if (bucket === "ghost") return st === "ghost";
      if (bucket === "unpaid") return !m.feePaid;
      return false;
    });
  }, [members, bucket]);

  // Generate message for a specific member
  function msgFor(m: (typeof members)[number]) {
    if (tmpl.trim()) {
      return tmpl
        .replaceAll("{name}", m.name.split(" ")[0])
        .replaceAll("{gym}", settings.gymName)
        .replaceAll("{owner}", settings.ownerName)
        .replaceAll("{amount}", money(m.feeAmount));
    }
    if (bucket === "ghost") {
      const last = m.attendance[0];
      return defaultMessage("ghost", {
        name: m.name,
        gymName: settings.gymName,
        ownerName: settings.ownerName,
        days: last ? daysSince(last) : 30,
      });
    }
    if (bucket === "expiring")
      return defaultMessage("expiring", {
        name: m.name,
        gymName: settings.gymName,
        ownerName: settings.ownerName,
        days: Math.max(1, daysUntil(m.expiryDate)),
      });
    if (bucket === "expired")
      return defaultMessage("expired", {
        name: m.name,
        gymName: settings.gymName,
        ownerName: settings.ownerName,
        days: Math.abs(daysUntil(m.expiryDate)),
      });
    return defaultMessage("unpaid", {
      name: m.name,
      gymName: settings.gymName,
      ownerName: settings.ownerName,
      amount: m.feeAmount,
    });
  }

  // Broadcast messages to all members in the list
  function broadcast() {
    list.forEach((m, i) => {
      setTimeout(() => {
        window.open(waLink(m.phone, msgFor(m)), "_blank");
        setSent((s) => new Set(s).add(m.id));
      }, i * 400);
    });
  }

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="WhatsApp Reminders"
        subtitle="Send WhatsApp nudges to members with one click - no API key required"
        actions={
          <button
            onClick={broadcast}
            disabled={list.length === 0}
            className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <MessageCircle className="size-4" /> Broadcast to {list.length}
          </button>
        }
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => {
          const count = members.filter((m) => {
            const st = memberStatus(m);
            if (t.id === "expiring") return st === "expiring";
            if (t.id === "expired") return st === "expired";
            if (t.id === "ghost") return st === "ghost";
            return !m.feePaid;
          }).length;
          const active = bucket === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setBucket(t.id);
                setTmpl("");
              }}
              className={
                "px-4 py-2 rounded-lg text-sm border " +
                (active
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}{" "}
              <span className={"ml-1 text-xs " + (active ? "" : t.tone)}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Template */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Custom Template (optional)
          </label>
          <span className="text-[10px] text-muted-foreground">
            Placeholders: {"{name}"} {"{gym}"} {"{owner}"} {"{amount}"}
          </span>
        </div>
        <textarea
          value={tmpl}
          onChange={(e) => setTmpl(e.target.value)}
          rows={3}
          placeholder="Leave empty to use default English message..."
          className="w-full px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 font-mono"
        />
      </div>

      {/* Members Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No members in this category
                  </td>
                </tr>
              )}
              {list.map((m) => {
                const last = m.attendance[0];
                const link = waLink(m.phone, msgFor(m));
                const wasSent = sent.has(m.id);
                return (
                  <tr
                    key={m.id}
                    className="border-t border-border hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3 flex items-center gap-3">
                      <img
                        src={m.photo}
                        alt={m.name}
                        className="size-9 rounded-full object-cover ring-1 ring-border"
                      />
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.rollNo}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {m.phone}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {bucket === "ghost" && (
                        <span className="text-danger">
                          No-show {last ? daysSince(last) : "30+"}d
                        </span>
                      )}
                      {bucket === "expiring" && (
                        <span className="text-warn">
                          {daysUntil(m.expiryDate)}d left
                        </span>
                      )}
                      {bucket === "expired" && (
                        <span className="text-danger">
                          Expired {Math.abs(daysUntil(m.expiryDate))}d ago
                        </span>
                      )}
                      {bucket === "unpaid" && (
                        <span className="text-warn">
                          {money(m.feeAmount)} pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2 justify-end">
                        <a
                          href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}
                          className="size-9 grid place-items-center rounded-lg bg-secondary hover:bg-brand/10 hover:text-brand"
                          aria-label="Call"
                        >
                          <Phone className="size-4" />
                        </a>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setSent((s) => new Set(s).add(m.id))}
                          className={
                            "px-3 h-9 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold shrink-0 " +
                            (wasSent
                              ? "bg-brand/20 text-brand"
                              : "bg-[#25D366] text-white hover:opacity-90")
                          }
                        >
                          {wasSent ? (
                            <Check className="size-3.5" />
                          ) : (
                            <MessageCircle className="size-3.5" />
                          )}
                          WhatsApp
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Note: WhatsApp Web/App will open with the pre-filled message. Click send
        to deliver - no API setup or Twilio costs required.
      </p>
    </div>
  );
}
