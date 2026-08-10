import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Radio, CheckCircle2, XCircle, Search, X, History, Users as UsersIcon, Clock } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { daysSince, type Member } from "@/lib/gym-store";
import { fetchMembers, supabase, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — ALPHA FITNESS" }] }),
  component: Attendance,
});

// Type definition for punch status tracking
type PunchStatus = { in?: string; out?: string; count: number };

function Attendance() {
  const [members, setMembers] = useState<Member[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [last, setLast] = useState<{ name: string; time: string; photo: string; type: "IN" | "OUT" } | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out" | "done">("all");
  const [range, setRange] = useState<1 | 2 | 3 | 7>(1);
  const [historyOf, setHistoryOf] = useState<Member | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  // References to keep state values up-to-date in async callbacks (eliminating React stale closure issues)
  const membersRef = useRef<Member[]>([]);
  const todayLogsRef = useRef<any[]>([]);
  const doPunchRef = useRef<any>(null);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    todayLogsRef.current = todayLogs;
  }, [todayLogs]);

  // Helper to retrieve members current punch status dynamically
  const getLatestMemberStatus = useCallback((memberId: string): PunchStatus => {
    const logs = todayLogsRef.current
      .filter((l) => l.member_id === memberId)
      .sort((a: any, b: any) =>
        new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()
      );

    return {
      count: logs.length,
      in: logs[0]?.checked_in_at,
      out: logs[1]?.checked_in_at,
    };
  }, []);

  // Standard React getMemberStatus for synchronous list rendering
  const getMemberStatus = useCallback((memberId: string): PunchStatus => {
    const logs = todayLogs
      .filter((l) => l.member_id === memberId)
      .sort((a: any, b: any) =>
        new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()
      );

    return {
      count: logs.length,
      in: logs[0]?.checked_in_at,
      out: logs[1]?.checked_in_at,
    };
  }, [todayLogs]);

  // Process punch for a member (flexible and asynchronous execution helper)
  const doPunch = async (m: Member) => {
    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("No active branch found. Please select a branch.");
      return;
    }

    const st = getLatestMemberStatus(m.id);
    if (st.count >= 2) {
      toast.error(`${m.name} — Already punched IN & OUT today (maximum 2 punches allowed)`);
      return;
    }

    const punchType = st.count === 0 ? "in" : "out";

    const { error } = await supabase.from("attendance_logs").insert({
      branch_id: branchId,
      member_id: m.id,
      checked_in_at: new Date().toISOString(),
      punch_type: punchType,
    });

    if (!error) {
      const type: "IN" | "OUT" = punchType === "in" ? "IN" : "OUT";
      setLast({
        name: m.name,
        time: new Date().toLocaleTimeString("en-IN"),
        photo: m.photo || "",
        type,
      });
      toast.success(type === "IN" ? `✓ ${m.name} — Punch IN` : `👋 ${m.name} — Punch OUT`);

      // Trigger Automated WhatsApp Webhook dynamically (Zero-click alert feature)
      supabase
        .from("branches")
        .select("whatsapp_webhook_url")
        .eq("id", branchId)
        .single()
        .then(({ data }) => {
          if (data?.whatsapp_webhook_url) {
            try {
              fetch(data.whatsapp_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  member_id: m.id,
                  name: m.name,
                  phone: m.phone,
                  roll_no: m.rollNo,
                  time: new Date().toLocaleTimeString("en-IN"),
                  date: new Date().toLocaleDateString("en-IN"),
                  type,
                  message: `Hi ${m.name}, welcome to ALPHA FITNESS! Checked ${type} at ${new Date().toLocaleTimeString("en-IN")}.`
                }),
              });
            } catch (e) {
              console.error("Webhook trigger failed", e);
            }
          }
        });

    } else {
      toast.error("Punch failed: " + error.message);
    }
  };

  useEffect(() => {
    doPunchRef.current = doPunch;
  }, [doPunch]);

  // Initialize: fetch members, today's logs, and setup realtime subscription
  useEffect(() => {
    inputRef.current?.focus();

    const branchId = getActiveBranchId();
    if (!branchId) {
      setLoading(false);
      return;
    }

    const fetchSyncData = () => {
      fetchMembers().then((data) => {
        if (data) {
          setMembers(data);
          membersRef.current = data;
        }
      }).catch(console.error);

      // Solve local time shifting / India timezone bugs by using clients start & end of today formatted in proper UTC ISO format
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      supabase
        .from("attendance_logs")
        .select("*")
        .eq("branch_id", branchId)
        .gte("checked_in_at", startOfToday.toISOString())
        .lte("checked_in_at", endOfToday.toISOString())
        .order("checked_in_at", { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setTodayLogs(data);
          }
        });
    };

    // Initial load
    fetchMembers().then((data) => {
      setMembers(data || []);
      membersRef.current = data || [];
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    supabase
      .from("attendance_logs")
      .select("*")
      .eq("branch_id", branchId)
      .gte("checked_in_at", startOfToday.toISOString())
      .lte("checked_in_at", endOfToday.toISOString())
      .order("checked_in_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Error fetching logs:", error);
        else setTodayLogs(data ?? []);
      });

    // Quiet background updater that fetches fresh logs and members every 5 seconds
    const pollInterval = setInterval(() => {
      fetchSyncData();
    }, 5000);

    // Realtime subscription for new attendance logs for this branch
    const logsChannel = supabase
      .channel("attendance-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        (payload) => {
          const row = payload.new as any;
          if (row.branch_id === branchId) {
            setTodayLogs((prev) => [...prev, row]);
          }
        }
      )
      .subscribe();

    // Realtime subscription for physical RFID hardware scans (rfid_pending table)
    const rfidChannel = supabase
      .channel("rfid-pending-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rfid_pending" },
        async (payload) => {
          const row = payload.new as any;
          if (row.branch_id === branchId && !row.claimed) {
            // Claim scan instantly to prevent multiple triggers
            await supabase
              .from("rfid_pending")
              .update({ claimed: true })
              .eq("id", row.id);

            const scannedUid = row.uid?.trim().toLowerCase();
            const matchedMember = membersRef.current.find(
              (m) => m.rfid?.trim().toLowerCase() === scannedUid
            );

            if (matchedMember) {
              if (doPunchRef.current) {
                doPunchRef.current(matchedMember);
              }
            } else {
              toast.error(`Physical card scanned but not assigned to any member: "${row.uid}"`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(rfidChannel);
    };
  }, []);

  // Handle RFID/Card submission
  const punch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const c = code.trim().toLowerCase();
    const m = members.find((x) =>
      x.rfid?.toLowerCase() === c || x.rollNo?.toLowerCase() === c
    );

    if (!m) toast.error(`Unknown card / roll number: ${code}`);
    else doPunch(m);

    setCode("");
    inputRef.current?.focus();
  };

  // Memoized today's attendance list
  const todayList = useMemo(() => 
    members.map((m) => ({ m, st: getMemberStatus(m.id) })), 
    [members, getMemberStatus]
  );

  const inCount = todayList.filter(({ st }) => st.count >= 1).length;
  const outCount = todayList.filter(({ st }) => st.count === 0).length;
  const doneCount = todayList.filter(({ st }) => st.count >= 2).length;

  // Filter members based on search and filter criteria
  const filtered = todayList.filter(({ m, st }) => {
    if (filter === "in" && st.count < 1) return false;
    if (filter === "out" && st.count >= 1) return false;
    if (filter === "done" && st.count < 2) return false;
    if (q && !(m.name + (m.rollNo || "") + (m.rfid || "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  // Toggle member for comparison
  const toggleCompare = (id: string) => {
    setCompareIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length >= 5
        ? ids
        : [...ids, id]
    );
  };

  if (loading) return <div className="p-8 text-center py-20 text-muted-foreground">Loading members...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-[1500px]">
      <PageHeader
        title="Attendance"
        subtitle="RFID punch-in/out · Maximum 2 scans per day"
        actions={
          compareIds.length > 0 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="px-4 py-2 bg-brand text-brand-foreground text-sm font-semibold rounded-xl inline-flex items-center gap-2"
            >
              <UsersIcon className="size-4" /> Compare ({compareIds.length})
            </button>
          )
        }
      />

      {/* RFID Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-brand/15 to-card border border-brand/30 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 text-brand mb-3">
            <Radio className="size-5 animate-pulse" />
            <p className="text-xs uppercase tracking-widest font-bold">RFID Scanner Active</p>
          </div>
          <form onSubmit={punch}>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Tap card or enter RFID / Roll Number, then press Enter…"
              className="w-full px-4 sm:px-5 py-4 sm:py-5 bg-background/60 rounded-xl text-lg sm:text-xl font-mono outline-none focus:ring-2 focus:ring-brand/60 border border-border"
              autoComplete="off"
            />
          </form>
          <p className="text-[11px] text-muted-foreground mt-3">
            1st scan = <span className="text-brand font-bold">IN</span> · 2nd scan = <span className="text-warn font-bold">OUT</span> · 3rd scan blocked
          </p>
        </div>

        {/* Last Punch Display */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Last Punch</p>
          {last ? (
            <div className="flex items-center gap-4">
              {last.photo && <img src={last.photo} alt="" className="size-14 rounded-xl object-cover ring-2 ring-brand" />}
              <div>
                <p className="text-lg font-heading">{last.name}</p>
                <p className={`text-xs font-bold ${last.type === "IN" ? "text-brand" : "text-warn"}`}>
                  {last.type === "IN" ? "✓ Punch IN" : "👋 Punch OUT"} · {last.time}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for first scan…</p>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Total Members" value={todayList.length} tone="muted" />
        <Stat label="Checked In Today" value={inCount} tone="brand" />
        <Stat label="Not Yet In" value={outCount} tone="danger" />
        <Stat label="Completed (IN+OUT)" value={doneCount} tone="brand" />
      </div>

      {/* Members Section */}
      <div className="bg-card border border-border rounded-2xl">
        {/* Section Controls */}
        <div className="p-4 border-b border-border flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, roll number, or RFID"
              className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {(["all", "in", "out", "done"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-lg capitalize ${
                    filter === f ? "bg-brand text-brand-foreground font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "in" ? "Checked In" : f === "out" ? "Not In" : f === "done" ? "Done" : "All"}
                </button>
              ))}
            </div>

            <div className="flex gap-1 items-center border-l border-border pl-3 ml-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1 hidden sm:inline">Range</span>
              {([1, 2, 3, 7] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-xs rounded-lg ${
                    range === r ? "bg-accent/20 text-accent font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === 1 ? "Today" : `${r}d`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">RFID</th>
                <th className="px-4 py-3 font-medium">Slot</th>
                <th className="px-4 py-3 font-medium">IN</th>
                <th className="px-4 py-3 font-medium">OUT</th>
                <th className="px-4 py-3 font-medium">Last {range === 1 ? "Today" : range + "d"}</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(({ m, st }) => {
                const rangeVisits = m.attendance.filter((a) => daysSince(a) < range).length;
                return (
                  <tr key={m.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(m.id)}
                        onChange={() => toggleCompare(m.id)}
                        className="size-4 accent-brand cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setHistoryOf(m)} className="flex items-center gap-3 text-left hover:text-brand">
                        {m.photo ? (
                          <img src={m.photo} alt={m.name} className="size-9 rounded-full object-cover ring-1 ring-border" loading="lazy" />
                        ) : (
                          <div className="size-9 rounded-full bg-brand/20 grid place-items-center text-brand font-bold text-sm">
                            {m.name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.rollNo}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.rfid}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.preferredSlot}</td>
                    <td className="px-4 py-3">
                      {st.in ? (
                        <span className="inline-flex items-center gap-1.5 text-brand text-xs font-bold">
                          <CheckCircle2 className="size-4" /> {new Date(st.in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-danger text-xs font-bold">
                          <XCircle className="size-4" /> Not in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {st.out ? (
                        <span className="inline-flex items-center gap-1.5 text-warn text-xs font-bold">
                          👋 {new Date(st.out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{rangeVisits} visits</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => doPunch(m)}
                        disabled={st.count >= 2}
                        className="text-[10px] uppercase tracking-wider text-brand hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer"
                      >
                        {st.count === 0 ? "Mark IN" : st.count === 1 ? "Mark OUT" : "Done"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No matches found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Grid of Cards */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.map(({ m, st }) => {
            const rangeVisits = m.attendance.filter((a) => daysSince(a) < range).length;
            return (
              <div key={m.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(m.id)}
                      onChange={() => toggleCompare(m.id)}
                      className="size-4 accent-brand cursor-pointer"
                    />
                    <button onClick={() => setHistoryOf(m)} className="flex items-center gap-2.5 text-left">
                      {m.photo ? (
                        <img src={m.photo} alt={m.name} className="size-10 rounded-full object-cover ring-1 ring-border" loading="lazy" />
                      ) : (
                        <div className="size-10 rounded-full bg-brand/20 grid place-items-center text-brand font-bold text-sm">
                          {m.name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.rollNo} · RFID {m.rfid}</p>
                      </div>
                    </button>
                  </div>

                  {/* Status Indicator */}
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {m.preferredSlot}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-secondary/30 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Punch IN</span>
                    {st.in ? (
                      <span className="text-brand font-bold flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> {new Date(st.in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className="text-danger font-bold flex items-center gap-1">
                        <XCircle className="size-3.5" /> Not in
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Punch OUT</span>
                    {st.out ? (
                      <span className="text-warn font-bold">
                        👋 {new Date(st.out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-semibold">—</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Visits ({range === 1 ? "1d" : `${range}d`})</span>
                    <span className="text-foreground font-semibold">{rangeVisits} visit{rangeVisits !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => setHistoryOf(m)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Clock className="size-3.5" /> History
                  </button>
                  <button
                    onClick={() => doPunch(m)}
                    disabled={st.count >= 2}
                    className={
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all " +
                      (st.count === 0
                        ? "bg-brand text-brand-foreground hover:opacity-90"
                        : st.count === 1
                        ? "bg-warn text-white hover:opacity-90"
                        : "bg-secondary text-muted-foreground cursor-not-allowed")
                    }
                  >
                    {st.count === 0 ? "Mark IN" : st.count === 1 ? "Mark OUT" : "Done"}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No matches found.</div>
          )}
        </div>
      </div>

      {/* Modals */}
      {historyOf && <HistoryModal member={historyOf} onClose={() => setHistoryOf(null)} />}
      {compareOpen && (
        <CompareModal
          members={members.filter((m) => compareIds.includes(m.id))}
          onClose={() => setCompareOpen(false)}
          onClear={() => { setCompareIds([]); setCompareOpen(false); }}
        />
      )}
    </div>
  );
}

/* ====================== Modals ====================== */

// History Modal - Shows member's attendance history
function HistoryModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [days, setDays] = useState<5 | 7 | 20 | 30 | 60>(7);
  const cutoff = Date.now() - days * 86400000;
  const visits = member.attendance
    .filter((a) => new Date(a).getTime() >= cutoff)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const byDay: Record<string, string[]> = {};
  visits.forEach((v) => {
    const key = new Date(v).toDateString();
    (byDay[key] ||= []).push(v);
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md grid place-items-center p-4 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-5 border-b border-border flex items-center gap-4">
          {member.photo ? (
            <img src={member.photo} alt="" className="size-12 rounded-xl object-cover ring-1 ring-border" />
          ) : (
            <div className="size-12 rounded-xl bg-brand/20 grid place-items-center text-brand font-bold text-lg">
              {member.name?.[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg flex items-center gap-2 truncate text-foreground">
              <History className="size-4 text-brand shrink-0" /> {member.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{member.rollNo} · {member.rfid}</p>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg bg-secondary grid place-items-center hover:bg-danger/10 hover:text-danger shrink-0">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3 sm:p-4 border-b border-border flex gap-2 items-center flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Last</span>
          {[5, 7, 20, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as any)}
              className={`px-3 py-1 text-xs rounded-lg ${days === d ? "bg-brand text-brand-foreground font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {d}d
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{visits.length} total visits</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-4 sm:p-5 space-y-3">
          {Object.keys(byDay).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No visits in the last {days} days.</p>
          )}
          {Object.entries(byDay).map(([day, times]) => (
            <div key={day} className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start pb-2 border-b border-border/20 last:border-0">
              <div className="w-28 text-xs text-muted-foreground shrink-0 font-medium">
                {new Date(day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </div>
              <div className="flex flex-wrap gap-2">
                {times.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).map((t, i) => (
                  <span
                    key={t}
                    className={`px-2 py-1 rounded text-[11px] font-mono ${i === 0 ? "bg-brand/15 text-brand" : "bg-warn/15 text-warn"}`}
                  >
                    {i === 0 ? "IN" : "OUT"} {new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compare Modal - Compare attendance across multiple members
function CompareModal({ members, onClose, onClear }: { members: Member[]; onClose: () => void; onClear: () => void }) {
  const [days, setDays] = useState<5 | 7 | 10 | 20 | 30>(7);
  const cutoff = Date.now() - days * 86400000;

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md grid place-items-center p-4 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-4xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-5 text-brand" />
            <h3 className="font-heading text-lg text-foreground">Compare Attendance ({members.length})</h3>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-danger">Clear all</button>
            <button onClick={onClose} className="size-9 rounded-lg bg-secondary grid place-items-center hover:bg-danger/10 hover:text-danger">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-4 border-b border-border flex gap-2 items-center flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Last</span>
          {[5, 7, 10, 20, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as any)}
              className={`px-3 py-1.5 text-xs rounded-lg ${days === d ? "bg-brand text-brand-foreground font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {d} days
            </button>
          ))}
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-4 sm:p-5 space-y-4">
          {members.map((m) => {
            const visits = m.attendance.filter((a) => new Date(a).getTime() >= cutoff);
            const dayBuckets: Record<string, number> = {};
            for (let i = 0; i < days; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              dayBuckets[d.toDateString()] = 0;
            }
            visits.forEach((v) => {
              const k = new Date(v).toDateString();
              if (k in dayBuckets) dayBuckets[k]++;
            });
            const dayList = Object.entries(dayBuckets).reverse();
            const rate = Math.round((Object.values(dayBuckets).filter((v) => v > 0).length / days) * 100);

            return (
              <div key={m.id} className="p-4 bg-secondary/40 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  {m.photo ? (
                    <img src={m.photo} alt="" className="size-10 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div className="size-10 rounded-full bg-brand/20 grid place-items-center text-brand font-bold text-sm">
                      {m.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.rollNo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-heading text-brand">{visits.length}</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{rate}% days</p>
                  </div>
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  {dayList.map(([day, count]) => (
                    <div
                      key={day}
                      title={`${new Date(day).toLocaleDateString("en-IN")} · ${count} visit${count !== 1 ? "s" : ""}`}
                      className={`flex-1 min-w-[12px] h-8 rounded ${count === 0 ? "bg-secondary" : count === 1 ? "bg-brand/40" : "bg-brand"}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Statistics Card Component
function Stat({ label, value, tone }: { label: string; value: number; tone: "brand" | "danger" | "muted" }) {
  const cls = tone === "brand" ? "text-brand" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="p-4 sm:p-5 bg-card border border-border rounded-xl">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{label}</p>
      <p className={"text-2xl sm:text-3xl font-heading mt-1 " + cls}>{value}</p>
    </div>
  );
}