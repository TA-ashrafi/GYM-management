import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, FileJson, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useGym, gym, memberStatus, daysUntil, money } from "@/lib/gym-store";

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [{ title: "Backup & Export — ALPHA FITNESS" }] }),
  component: BackupPage,
});

// CSV utility functions
function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  return lines.join("\n");
}

// Download helper
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function BackupPage() {
  const state = useGym((s) => s);
  const fileRef = useRef<HTMLInputElement>(null);
  const [autoBackup, setAutoBackup] = useState(false);

  const stamp = new Date().toISOString().slice(0, 10);

  // Export full backup as JSON
  function backupJson() {
    download(`ironsync-backup-${stamp}.json`, JSON.stringify(state, null, 2), "application/json");
    toast.success("Backup JSON downloaded successfully");
  }

  // Export members data
  function exportMembers() {
    const rows = state.members.map((m) => ({
      RollNo: m.rollNo, RFID: m.rfid, Name: m.name, Phone: m.phone, Email: m.email ?? "",
      Gender: m.gender, Age: m.age, Height_cm: m.heightCm, Weight_kg: m.weightKg,
      Goal: m.goal, Plan: m.plan, Fee: m.feeAmount, FeePaid: m.feePaid ? "Yes" : "No",
      JoinDate: new Date(m.joinDate).toLocaleDateString(),
      ExpiryDate: new Date(m.expiryDate).toLocaleDateString(),
      DaysToExpiry: daysUntil(m.expiryDate),
      Status: memberStatus(m), PreferredSlot: m.preferredSlot,
      LastPunch: m.attendance[0] ? new Date(m.attendance[0]).toLocaleString() : "Never",
      TotalVisits: m.attendance.length,
      Address: m.address ?? "", Emergency: m.emergencyContact ?? "",
    }));
    download(`members-${stamp}.csv`, toCsv(rows), "text/csv");
    toast.success(`${rows.length} members exported successfully`);
  }

  // Export attendance records
  function exportAttendance() {
    const rows: Record<string, unknown>[] = [];
    state.members.forEach((m) => {
      m.attendance.forEach((ts) => {
        const d = new Date(ts);
        rows.push({
          RollNo: m.rollNo, Name: m.name, Date: d.toLocaleDateString(),
          Time: d.toLocaleTimeString(), Slot: m.preferredSlot,
        });
      });
    });
    rows.sort((a, b) => String(b.Date).localeCompare(String(a.Date)));
    download(`attendance-${stamp}.csv`, toCsv(rows), "text/csv");
    toast.success(`${rows.length} punch records exported successfully`);
  }

  // Export expenses
  function exportExpenses() {
    const rows = state.expenses.map((e) => ({
      Date: new Date(e.date).toLocaleDateString(), Title: e.title,
      Category: e.category, Amount: e.amount,
    }));
    download(`expenses-${stamp}.csv`, toCsv(rows), "text/csv");
    toast.success(`${rows.length} expenses exported successfully`);
  }

  // Export sales data
  function exportSales() {
    const rows: Record<string, unknown>[] = [];
    state.sales.forEach((s) => {
      s.items.forEach((it) => {
        rows.push({
          Date: new Date(s.date).toLocaleString(), SaleID: s.id,
          Product: it.name, Qty: it.qty, Price: it.price, LineTotal: it.qty * it.price,
          PaymentMode: s.paymentMode, Customer: s.customer ?? s.memberId ?? "Walk-in",
        });
      });
    });
    download(`sales-${stamp}.csv`, toCsv(rows), "text/csv");
    toast.success(`${rows.length} sale lines exported successfully`);
  }

  // Export inventory
  function exportInventory() {
    const rows = state.products.map((p) => ({
      Name: p.name, Category: p.category, Cost: p.cost, Price: p.price,
      Margin: p.price - p.cost, Stock: p.stock, LowStockAt: p.lowStockAt,
      StockValue: p.stock * p.cost,
    }));
    download(`inventory-${stamp}.csv`, toCsv(rows), "text/csv");
    toast.success(`${rows.length} products exported successfully`);
  }

  // Import backup from JSON file
  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.members || !data.settings) throw new Error("Invalid backup file");
        if (!confirm("Replace ALL current data with this backup?")) return;
        gym.setState(data);
        toast.success("Backup restored successfully ✓");
      } catch (e) {
        toast.error("Invalid backup file");
        console.error(e);
      }
    };
    reader.readAsText(file);
  }

  // Toggle auto-backup
  function toggleAutoBackup(v: boolean) {
    setAutoBackup(v);
    if (typeof window === "undefined") return;
    if (v) {
      localStorage.setItem("ironsync_autobackup", "1");
      toast.success("Auto-backup enabled (browser localStorage already saves continuously)");
    } else {
      localStorage.removeItem("ironsync_autobackup");
    }
  }

  const sizeKb = Math.round(JSON.stringify(state).length / 1024);
  const totalRevenue = state.sales.reduce((s, x) => s + x.total, 0);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Backup & Export"
        subtitle="Download all data, restore from backup, or export to CSV"
        actions={
          <button onClick={backupJson} className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2">
            <Download className="size-4" /> Full Backup (JSON)
          </button>
        }
      />

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Members" value={state.members.length} />
        <Stat label="Punch Records" value={state.members.reduce((s, m) => s + m.attendance.length, 0)} />
        <Stat label="Sales Recorded" value={`${state.sales.length} · ${money(totalRevenue)}`} />
        <Stat label="Backup Size" value={`${sizeKb} KB`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* CSV Exports Section */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading text-lg mb-1 flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-brand" /> CSV Exports
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Can be opened in Excel or Google Sheets</p>
          <div className="grid gap-2">
            <ExportRow label="Members (with status, BMI, expiry)" count={state.members.length} onClick={exportMembers} />
            <ExportRow label="Attendance / Punch History" count={state.members.reduce((s, m) => s + m.attendance.length, 0)} onClick={exportAttendance} />
            <ExportRow label="Expenses" count={state.expenses.length} onClick={exportExpenses} />
            <ExportRow label="Store Sales" count={state.sales.length} onClick={exportSales} />
            <ExportRow label="Store Inventory" count={state.products.length} onClick={exportInventory} />
          </div>
        </section>

        {/* Backup & Restore Section */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading text-lg mb-1 flex items-center gap-2">
            <FileJson className="size-5 text-brand" /> Full Backup / Restore
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Complete state — restore on any device</p>

          <button onClick={backupJson} className="w-full mb-2 py-2.5 bg-secondary hover:bg-brand/10 hover:text-brand rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2">
            <Download className="size-4" /> Download backup.json
          </button>

          <button onClick={() => fileRef.current?.click()} className="w-full py-2.5 bg-secondary hover:bg-brand/10 hover:text-brand rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2">
            <Upload className="size-4" /> Restore from file
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />

          {/* Auto-save Toggle */}
          <label className="flex items-center justify-between mt-5 p-3 bg-secondary/40 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium">Auto-save (local)</p>
              <p className="text-[11px] text-muted-foreground">Browser already saves on every change</p>
            </div>
            <input type="checkbox" checked={autoBackup} onChange={(e) => toggleAutoBackup(e.target.checked)} className="size-5 accent-current" />
          </label>

          {/* Cloud Backup Tip */}
          <div className="mt-4 p-3 bg-warn/10 border border-warn/30 rounded-lg flex gap-2 text-xs">
            <AlertTriangle className="size-4 text-warn shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              <strong className="text-foreground">Cloud backup tip:</strong> Download weekly JSON backup and store it on Google Drive / Dropbox.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Export Row Component
function ExportRow({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between gap-3 p-3 bg-secondary/40 rounded-lg hover:bg-brand/10 hover:text-brand transition group text-left">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-[11px] text-muted-foreground">{count} rows</p>
      </div>
      <Download className="size-4 text-muted-foreground group-hover:text-brand" />
    </button>
  );
}

// Statistics Card Component
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-xl font-heading mt-1">{value}</p>
    </div>
  );
}