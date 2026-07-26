import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Sun, Moon, Palette } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useGym, gym, type Settings, type Shift, type ThemePreset, type ThemeMode } from "@/lib/gym-store";
import { supabase } from "@/lib/supabase";
import { getActiveBranchId } from "@/lib/supabase"; 

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — IronSync" }] }),
  component: SettingsPage,
});

const CURRENCIES: Settings["currency"][] = ["INR", "USD", "AED", "PKR", "EUR", "GBP"];
const LANGS: { v: Settings["language"]; label: string }[] = [
  { v: "en", label: "English" },
  { v: "hi", label: "हिंदी" },
  { v: "hinglish", label: "Hinglish" },
];
const PRESETS: { v: ThemePreset; label: string; swatch: string }[] = [
  { v: "lime", label: "Stealth Lime", swatch: "oklch(0.94 0.21 113)" },
  { v: "red", label: "Power Red", swatch: "oklch(0.62 0.24 25)" },
  { v: "blue", label: "Electric Blue", swatch: "oklch(0.6 0.2 255)" },
];

const PLAN_ORDER: PlanType[] = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

function SettingsPage() {
  const settings = useGym((s) => s.settings);
  const [form, setForm] = useState<Settings>(settings);

  // Plan Prices
  const [planPrices, setPlanPrices] = useState({
    Monthly: 1500,
    Quarterly: 4000,
    HalfYearly: 7500,
    Yearly: 13000,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function updateShift(i: number, patch: Partial<Shift>) {
    setForm((f) => ({ ...f, shifts: f.shifts.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }

  function addShift() {
    setForm((f) => ({ ...f, shifts: [...f.shifts, { start: "06:00", end: "10:00" }] }));
  }

  function removeShift(i: number) {
    setForm((f) => ({ ...f, shifts: f.shifts.filter((_, idx) => idx !== i) }));
  }

  // Load settings from branches table
  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    supabase
      .from("branches")
      .select("plan_prices, gym_name, shifts, slot_duration_min, slot_capacity")
      .eq("id", branchId)
      .single()
      .then(({ data }) => {
        if (!data) return;

        if (data.plan_prices) setPlanPrices(data.plan_prices);
        if (data.gym_name) gym.updateSettings({ gymName: data.gym_name });
        if (data.shifts) gym.updateSettings({ shifts: data.shifts });
        if (data.slot_duration_min !== undefined) gym.updateSettings({ slotDurationMin: data.slot_duration_min });
        if (data.slot_capacity !== undefined) gym.updateSettings({ slotCapacity: data.slot_capacity });
      })
      .catch(() => {});
  }, []);

  async function savePlanPrices() {
    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("Branch select nahi hai");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("branches")
        .update({ plan_prices: planPrices })
        .eq("id", branchId);

      if (!error) {
        toast.success("Plan prices saved successfully!");
      } else {
        toast.error("Error: " + error.message);
      }
    } catch (err: any) {
      toast.error("Error: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    const branchId = getActiveBranchId();
    
    // Local state update
    gym.updateSettings(form);
    
    // Supabase mein bhi save karo
    if (branchId) {
      const { error } = await supabase.from("branches").update({
        gym_name: form.gymName,
        shifts: form.shifts,
        slot_duration_min: form.slotDurationMin,
        slot_capacity: form.slotCapacity,
      }).eq("id", branchId);

      if (error) {
        console.error("Supabase save error:", error);
      }
    }
    
    toast.success("Settings saved ✓");
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Settings"
        subtitle="Gym profile, shifts, currency & language"
        actions={
          <button onClick={save} className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2">
            <Save className="size-4" /> Save Changes
          </button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gym Profile */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-heading text-lg">Gym Profile</h2>
          <Field label="Gym Name">
            <input value={form.gymName} onChange={(e) => set("gymName", e.target.value)} className={input} />
          </Field>
          <Field label="Owner Name">
            <input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} className={input} />
          </Field>
          <Field label="Address">
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={input} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
          </Field>
        </section>

        {/* Preferences */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-heading text-lg">Preferences</h2>
          <Field label="Language">
            <div className="flex gap-2">
              {LANGS.map((l) => (
                <button key={l.v} onClick={() => set("language", l.v)}
                  className={"px-4 py-2 rounded-lg text-sm border " + (form.language === l.v ? "bg-brand text-brand-foreground border-brand" : "bg-secondary border-border text-muted-foreground")}>
                  {l.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Currency">
            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map((c) => (
                <button key={c} onClick={() => set("currency", c)}
                  className={"px-3 py-2 rounded-lg text-sm border " + (form.currency === c ? "bg-brand text-brand-foreground border-brand" : "bg-secondary border-border text-muted-foreground")}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Session Duration (minutes)">
            <input type="number" value={form.slotDurationMin} onChange={(e) => set("slotDurationMin", Math.max(15, +e.target.value))} className={input} />
          </Field>
          <Field label="Default Slot Capacity">
            <input type="number" value={form.slotCapacity} onChange={(e) => set("slotCapacity", Math.max(1, +e.target.value))} className={input} />
          </Field>
        </section>

        {/* Membership Plan Prices */}
        <section className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <h3 className="font-heading text-lg mb-4">Membership Plan Prices</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            {PLAN_ORDER.map((plan) => (
              <div key={plan}>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">{plan}</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <input
                    type="number"
                    value={planPrices[plan]}
                    onChange={(e) => setPlanPrices((prev) => ({ ...prev, [plan]: +e.target.value }))}
                    className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={savePlanPrices}
            disabled={saving}
            className="mt-4 px-5 py-2 bg-brand text-brand-foreground rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Plan Prices"}
          </button>
        </section>

        {/* Appearance */}
        <section className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading text-lg mb-1 flex items-center gap-2"><Palette className="size-4" /> Appearance</h2>
          <p className="text-xs text-muted-foreground mb-4">Theme mode and accent color preset</p>
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Mode">
              <div className="flex gap-2">
                {(["dark", "light"] as ThemeMode[]).map((m) => (
                  <button key={m} onClick={() => { set("theme", m); gym.updateSettings({ theme: m }); }}
                    className={"flex-1 px-4 py-3 rounded-lg text-sm border inline-flex items-center justify-center gap-2 " + (form.theme === m ? "bg-brand text-brand-foreground border-brand" : "bg-secondary border-border text-muted-foreground")}>
                    {m === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                    {m === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Color Preset">
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button key={p.v} onClick={() => { set("preset", p.v); gym.updateSettings({ preset: p.v }); }}
                    className={"px-3 py-3 rounded-lg text-sm border flex flex-col items-center gap-2 " + (form.preset === p.v ? "border-brand bg-brand/5" : "bg-secondary border-border text-muted-foreground")}>
                    <span className="size-6 rounded-full ring-2 ring-border" style={{ background: p.swatch }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* Shifts */}
        <section className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-lg">Shifts</h2>
              <p className="text-xs text-muted-foreground">Slots auto-generate from shifts × duration</p>
            </div>
            <button onClick={addShift} className="px-3 py-2 bg-secondary rounded-lg text-xs inline-flex items-center gap-1 hover:bg-brand/10 hover:text-brand">
              <Plus className="size-3" /> Add Shift
            </button>
          </div>
          <div className="space-y-3">
            {form.shifts.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
                <span className="text-xs uppercase tracking-widest text-muted-foreground w-16">Shift {i + 1}</span>
                <input type="time" value={s.start} onChange={(e) => updateShift(i, { start: e.target.value })} className={input + " w-32"} />
                <span className="text-muted-foreground text-sm">to</span>
                <input type="time" value={s.end} onChange={(e) => updateShift(i, { end: e.target.value })} className={input + " w-32"} />
                <button onClick={() => removeShift(i)} className="ml-auto size-9 rounded-md bg-secondary hover:bg-danger/10 hover:text-danger grid place-items-center">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {form.shifts.length === 0 && <p className="text-sm text-muted-foreground">No shifts. Add one.</p>}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading text-lg mb-2">Danger Zone</h2>
          <p className="text-xs text-muted-foreground mb-4">Reset all data (members, expenses, todos) to factory seed.</p>
          <button 
            onClick={() => { if (confirm("Reset all data?")) { gym.reset(); toast.success("Data reset"); } }}
            className="px-4 py-2 border border-danger/40 text-danger rounded-lg text-sm hover:bg-danger/10"
          >
            Reset all data
          </button>
        </section>
      </div>
    </div>
  );
}

const input = "px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}