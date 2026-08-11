import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Sun, Moon, Palette, Link, Dumbbell, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useGym, gym, type Settings, type Shift, type ThemePreset, type ThemeMode, type PlanType } from "@/lib/gym-store";
import { supabase, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — ALPHA FITNESS" }] }),
  component: SettingsPage,
});

const CURRENCIES: Settings["currency"][] = ["INR", "USD", "AED", "PKR", "EUR", "GBP"];
const LANGS: { v: Settings["language"]; label: string }[] = [
  { v: "en", label: "English" },
  { v: "hi", label: "Hindi" },
  { v: "hinglish", label: "Hinglish" },
];
const PRESETS: { v: ThemePreset; label: string; swatch: string }[] = [
  { v: "lime", label: "Emerald Mint", swatch: "#22c55e" },
  { v: "red", label: "Obsidian Blood", swatch: "#ef4444" },
  { v: "blue", label: "Dark Moss", swatch: "#3b82f6" },
  { v: "purple", label: "Royal Amethyst", swatch: "#a855f7" },
  { v: "gold", label: "Platinum Gold", swatch: "#eab308" },
];

const PLAN_ORDER: PlanType[] = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

// Extension type for settings
type ExtendedSettings = Settings & { whatsappWebhookUrl?: string };

const SEED_TEMPLATES = [
  {
    name: "Push-Pull-Legs (PPL)",
    desc: "Hypertrophy 6-day split",
    days: [
      "Flat Bench Press 4x8 · Shoulder Press 3x10 · Cable Flyes 3x12 · Overhead Tricep Extension 3x12",
      "Conventional Deadlift 3x5 · Lat Pulldowns 3x10 · Hammer Bicep Curls 3x12 · Face Pulls 3x15",
      "Barbell Squats 4x8 · Leg Press 3x12 · Calf Raises 4x15 · Lying Leg Curls 3x12",
      "Incline DB Press 4x10 · Military Press 3x8 · Tricep Pushdowns 3x12 · Lateral Raises 4x15",
      "Bent Over Rows 3x8 · Pullups 3x8 · Cable Bicep Curls 3x12 · DB Shrugs 3x12",
      "Romanian Deadlift 4x10 · Leg Extensions 3x15 · Hanging Leg Raises 3x15 · Planks 3x1min"
    ]
  },
  {
    name: "Classic Bro Split",
    desc: "Target 1 muscle group per day",
    days: [
      "Bench Press 4x8 · Incline DB Press 3x10 · Pec Deck Flyes 3x12 · Dips 3x12",
      "Deadlifts 3x5 · Lat Pulldowns 4x10 · Seated Cable Rows 3x10 · DB Pullovers 3x12",
      "Overhead Press 4x8 · Lateral Raises 4x15 · Front Raises 3x12 · Shrugs 3x15",
      "Squats 4x10 · Leg Press 3x12 · Hamstring Curls 3x12 · Calf Raises 4x15",
      "Barbell Curls 4x10 · Skullcrushers 4x12 · Hammer Curls 3x12 · Cable Tricep Pushdowns 3x15",
      "Hanging Leg Raises 4x15 · Cable Crunches 3x20 · Incline Walk 25min (HIIT)"
    ]
  }
];

function SettingsPage() {
  const settings = useGym((s) => s.settings) as ExtendedSettings;
  const [form, setForm] = useState<ExtendedSettings>(settings);

  const [openSections, setOpenSections] = useState({
    hardwareKey: true,
    webhook: false,
    workoutTemplates: false,
    planPrices: false,
    appearance: true,
    shifts: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Plan Prices State
  const [planPrices, setPlanPrices] = useState({
    Monthly: 1500,
    Quarterly: 4000,
    HalfYearly: 7500,
    Yearly: 13000,
  });
  const [saving, setSaving] = useState(false);

  // Custom Workout Templates State
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>(SEED_TEMPLATES);

  // Form field update helper
  function set<K extends keyof ExtendedSettings>(k: K, v: ExtendedSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Shift management functions
  function updateShift(i: number, patch: Partial<Shift>) {
    setForm((f) => ({ ...f, shifts: f.shifts.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }

  function addShift() {
    setForm((f) => ({ ...f, shifts: [...f.shifts, { start: "06:00", end: "10:00" }] }));
  }

  // Check and keep active settings
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function removeShift(i: number) {
    setForm((f) => ({ ...f, shifts: f.shifts.filter((_, idx) => idx !== i) }));
  }

  // Load settings from branches table on mount
  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    const cachedWebhook = localStorage.getItem(`fs_webhook_${branchId}`) || "";

    supabase
      .from("branches")
      .select("*")
      .eq("id", branchId)
      .single()
      .then(({ data }) => {
        if (!data) return;

        const merged = {
          ...form,
          gymName: data.gym_name ?? form.gymName,
          shifts: data.shifts ?? form.shifts,
          slotDurationMin: data.slot_duration_min ?? form.slotDurationMin,
          slotCapacity: data.slot_capacity ?? form.slotCapacity,
          theme: data.theme ?? form.theme,
          preset: data.preset ?? form.preset,
          currency: data.currency ?? form.currency,
          language: data.language ?? form.language,
          whatsappWebhookUrl: data.whatsapp_webhook_url ?? cachedWebhook ?? "",
          address: data.address ?? form.address,
          phone: data.phone ?? form.phone,
        };

        setForm(merged);
        gym.updateSettings(merged);

        if (data.plan_prices) setPlanPrices(data.plan_prices);
        if (data.workout_templates && Array.isArray(data.workout_templates) && data.workout_templates.length > 0) {
          setWorkoutTemplates(data.workout_templates);
        }
      })
      .catch(() => {});
  }, []);

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  useEffect(() => {
    setActiveBranchId(getActiveBranchId());
  }, []);

  // Save plan prices to database
  async function savePlanPrices() {
    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("No branch selected");
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

  // Manage custom workout templates
  const addTemplate = () => {
    setWorkoutTemplates((prev) => [
      ...prev,
      { name: "New Plan Template", desc: "Custom 6-day split details", days: ["", "", "", "", "", ""] }
    ]);
  };

  const removeTemplate = (idx: number) => {
    setWorkoutTemplates((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTemplateField = (idx: number, field: string, val: string) => {
    setWorkoutTemplates((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: val } : t)));
  };

  const updateTemplateDay = (tIdx: number, dayIdx: number, val: string) => {
    setWorkoutTemplates((prev) => prev.map((t, i) => {
      if (i !== tIdx) return t;
      const updatedDays = [...t.days];
      updatedDays[dayIdx] = val;
      return { ...t, days: updatedDays };
    }));
  };

  // Save all settings to local state and Supabase with local fallback
  async function save() {
    gym.updateSettings(form);

    const branchId = getActiveBranchId();
    if (branchId) {
      // Save Webhook URL to LocalStorage as a highly robust fallback
      localStorage.setItem(`fs_webhook_${branchId}`, form.whatsappWebhookUrl || "");

      const { error } = await supabase
        .from("branches")
        .update({
          gym_name: form.gymName,
          shifts: form.shifts,
          slot_duration_min: form.slotDurationMin,
          slot_capacity: form.slotCapacity,
          theme: form.theme,
          preset: form.preset,
          currency: form.currency,
          language: form.language,
          whatsapp_webhook_url: form.whatsappWebhookUrl || null,
          workout_templates: workoutTemplates, // Save customizable workout templates
        })
        .eq("id", branchId);

      if (error) {
        if (error.message.includes("schema cache")) {
          // Soft toast alerting about database schema, but confirming local activation works!
          toast.warning("Settings saved locally! To enable cross-device sync, please run the Supabase query in SUPABASE_SQL.md.");
          return;
        }
        toast.error("Error: " + error.message);
        return;
      }
    }

    toast.success("Settings saved successfully ✓");
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl w-full">
      <PageHeader
        title="Settings"
        subtitle="Gym profile, shifts, currency & language"
        actions={
          <button onClick={save} className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer">
            <Save className="size-4" /> Save Changes
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gym Profile Section */}
        <section className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
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

        {/* Preferences Section */}
        <section className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
          <h2 className="font-heading text-lg">Preferences</h2>
          <Field label="Language">
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <button key={l.v} onClick={() => set("language", l.v)}
                  className={"px-4 py-2 rounded-lg text-sm border flex-1 text-center cursor-pointer " + (form.language === l.v ? "bg-brand text-brand-foreground border-brand font-medium" : "bg-secondary border-border text-muted-foreground")}>
                  {l.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Currency">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CURRENCIES.map((c) => (
                <button key={c} onClick={() => set("currency", c)}
                  className={"px-3 py-2 rounded-lg text-sm border text-center cursor-pointer " + (form.currency === c ? "bg-brand text-brand-foreground border-brand font-medium" : "bg-secondary border-border text-muted-foreground")}>
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

        {/* Hardware & Active Branch Configuration Credentials */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden lg:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("hardwareKey")}
            className="w-full flex items-center justify-between p-4 sm:p-6 bg-secondary/15 text-left border-0 cursor-pointer"
          >
            <h2 className="font-heading text-lg flex items-center gap-2 m-0"><Link className="size-4 text-brand" /> Active Branch Hardware Key</h2>
            <span className="text-muted-foreground font-bold">{openSections.hardwareKey ? "⌃" : "˅"}</span>
          </button>

          {openSections.hardwareKey && (
            <div className="p-4 sm:p-6 border-t border-border space-y-4">
              <p className="text-xs text-muted-foreground m-0">Copy this unique active Branch ID credential directly into your physical Arduino / ESP32 RFID sketch config to seamlessly stream swipe updates anonymous to this branch.</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-secondary/40 rounded-xl border border-border/60">
                <span className="font-mono text-xs text-white break-all flex-1 selection:bg-brand selection:text-brand-foreground py-1 px-2 bg-black/20 rounded">
                  {activeBranchId || "No active branch loaded"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeBranchId) {
                      navigator.clipboard.writeText(activeBranchId);
                      toast.success("Active Branch ID copied to clipboard!");
                    } else {
                      toast.error("No active branch ID available");
                    }
                  }}
                  className="px-4 py-2 bg-brand text-brand-foreground rounded-lg text-xs font-bold shrink-0 hover:scale-[1.02] transition active:scale-95 cursor-pointer"
                >
                  Copy ID
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Automated WhatsApp Notifications */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden lg:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("webhook")}
            className="w-full flex items-center justify-between p-4 sm:p-6 bg-secondary/15 text-left border-0 cursor-pointer"
          >
            <h2 className="font-heading text-lg flex items-center gap-2 m-0"><Link className="size-4 text-brand" /> WhatsApp Automation Webhook</h2>
            <span className="text-muted-foreground font-bold">{openSections.webhook ? "⌃" : "˅"}</span>
          </button>

          {openSections.webhook && (
            <div className="p-4 sm:p-6 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground m-0">Specify your custom API Webhook (Make/Zapier/WhatsApp tool) to automatically push templates upon successful RFID check-in scans.</p>
              <Field label="WhatsApp Webhook URL">
                <input
                  value={form.whatsappWebhookUrl ?? ""}
                  onChange={(e) => set("whatsappWebhookUrl", e.target.value)}
                  placeholder="e.g. https://hook.us1.make.com/your-custom-endpoint"
                  className={input}
                />
              </Field>
            </div>
          )}
        </section>

        {/* Customizable Workout Templates Section (New Feature) */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden lg:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("workoutTemplates")}
            className="w-full flex items-center justify-between p-4 sm:p-6 bg-secondary/15 text-left border-0 cursor-pointer"
          >
            <h2 className="font-heading text-lg flex items-center gap-2 m-0"><Dumbbell className="size-5 text-brand" /> Custom Workout Templates</h2>
            <span className="text-muted-foreground font-bold">{openSections.workoutTemplates ? "⌃" : "˅"}</span>
          </button>

          {openSections.workoutTemplates && (
            <div className="p-4 sm:p-6 border-t border-border space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground m-0">Customize workout templates (Day 1 - Day 6) that can be assigned directly to your members.</p>
                <button type="button" onClick={addTemplate} className="px-3 py-1.5 bg-secondary text-foreground hover:bg-brand/10 hover:text-brand rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Plus className="size-3.5" /> Add Template
                </button>
              </div>
              <div className="space-y-4">
                {workoutTemplates.map((t, tIdx) => (
                  <div key={tIdx} className="p-4 bg-secondary/35 border border-border/60 rounded-2xl relative space-y-3">
                    <button type="button" onClick={() => removeTemplate(tIdx)} className="absolute top-4 right-4 p-1.5 bg-secondary hover:bg-danger/10 hover:text-danger rounded-lg transition cursor-pointer">
                      <Trash2 className="size-4" />
                    </button>
                    <div className="grid sm:grid-cols-2 gap-3 max-w-[90%]">
                      <Field label="Template Name">
                        <input value={t.name} onChange={(e) => updateTemplateField(tIdx, "name", e.target.value)} placeholder="e.g. Cardio Plan" className={input} />
                      </Field>
                      <Field label="Short Description">
                        <input value={t.desc} onChange={(e) => updateTemplateField(tIdx, "desc", e.target.value)} placeholder="e.g. Weight loss fat burning" className={input} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      {Array.from({ length: 6 }).map((_, dIdx) => (
                        <div key={dIdx} className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">Day {dIdx + 1}</label>
                          <input
                            value={t.days[dIdx] || ""}
                            onChange={(e) => updateTemplateDay(tIdx, dIdx, e.target.value)}
                            placeholder={`Day ${dIdx + 1} exercise...`}
                            className={input}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Membership Plan Prices */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden lg:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("planPrices")}
            className="w-full flex items-center justify-between p-4 sm:p-6 bg-secondary/15 text-left border-0 cursor-pointer"
          >
            <h2 className="font-heading text-lg m-0 flex items-center gap-2"><CreditCard className="size-4 text-brand" /> Membership Plan Prices</h2>
            <span className="text-muted-foreground font-bold">{openSections.planPrices ? "⌃" : "˅"}</span>
          </button>

          {openSections.planPrices && (
            <div className="p-4 sm:p-6 border-t border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLAN_ORDER.map((plan) => (
                  <div key={plan}>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">{plan}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm font-bold">₹</span>
                      <input
                        type="number"
                        value={planPrices[plan]}
                        onChange={(e) => setPlanPrices((prev) => ({ ...prev, [plan]: +e.target.value }))}
                        className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={savePlanPrices}
                disabled={saving}
                className="mt-2 px-5 py-2.5 bg-brand text-brand-foreground rounded-lg text-sm font-semibold disabled:opacity-50 w-full sm:w-auto text-center cursor-pointer font-sans"
              >
                {saving ? "Saving..." : "Save Plan Prices"}
              </button>
            </div>
          )}
        </section>

        {/* Appearance Section */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden lg:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("appearance")}
            className="w-full flex items-center justify-between p-4 sm:p-6 bg-secondary/15 text-left border-0 cursor-pointer"
          >
            <h2 className="font-heading text-lg m-0 flex items-center gap-2"><Palette className="size-4" /> Appearance</h2>
            <span className="text-muted-foreground font-bold">{openSections.appearance ? "⌃" : "˅"}</span>
          </button>

          {openSections.appearance && (
            <div className="p-4 sm:p-6 border-t border-border space-y-4">
              <p className="text-xs text-muted-foreground m-0">Customize theme and color preset</p>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Mode">
                    <div className="flex gap-2">
                      {(["dark", "light"] as ThemeMode[]).map((m) => (
                        <button key={m} onClick={() => { set("theme", m); gym.updateSettings({ theme: m }); }}
                          className={"flex-1 px-4 py-3 rounded-lg text-sm border inline-flex items-center justify-center gap-2 cursor-pointer " + (form.theme === m ? "bg-brand text-brand-foreground border-brand font-medium" : "bg-secondary border-border text-muted-foreground")}>
                          {m === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                          {m === "dark" ? "Dark" : "Light"}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Color Preset">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {PRESETS.map((p) => (
                        <button key={p.v} onClick={() => { set("preset", p.v); gym.updateSettings({ preset: p.v }); }}
                          className={"px-3 py-3 rounded-lg text-sm border flex flex-col sm:flex-col items-center gap-3 sm:gap-2 cursor-pointer " + (form.preset === p.v ? "border-brand bg-brand/5" : "bg-secondary border-border text-muted-foreground")}>
                          <span className="size-6 rounded-full ring-2 ring-border shrink-0" style={{ backgroundColor: p.swatch }} />
                          <span className="text-[11px] sm:text-xs font-semibold">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Shifts Section */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden lg:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("shifts")}
            className="w-full flex items-center justify-between p-4 sm:p-6 bg-secondary/15 text-left border-0 cursor-pointer"
          >
            <h2 className="font-heading text-lg m-0">Shifts</h2>
            <span className="text-muted-foreground font-bold">{openSections.shifts ? "⌃" : "˅"}</span>
          </button>

          {openSections.shifts && (
            <div className="p-4 sm:p-6 border-t border-border space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground m-0">Slots are auto-generated from shifts × duration</p>
                <button onClick={addShift} className="px-3 py-2 bg-secondary rounded-lg text-xs inline-flex items-center gap-1 hover:bg-brand/10 hover:text-brand font-semibold cursor-pointer">
                  <Plus className="size-3" /> Add Shift
                </button>
              </div>
              <div className="space-y-3">
                {form.shifts.map((s, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-secondary/40 rounded-xl">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground w-16 shrink-0 font-bold">Shift {i + 1}</span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input type="time" value={s.start} onChange={(e) => updateShift(i, { start: e.target.value })} className={input + " flex-1 sm:w-32"} />
                      <span className="text-muted-foreground text-sm">to</span>
                      <input type="time" value={s.end} onChange={(e) => updateShift(i, { end: e.target.value })} className={input + " flex-1 sm:w-32"} />
                    </div>
                    <button onClick={() => removeShift(i)} className="ml-auto size-9 rounded-md bg-secondary hover:bg-danger/10 hover:text-danger grid place-items-center shrink-0">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                {form.shifts.length === 0 && <p className="text-sm text-muted-foreground">No shifts configured. Add one above.</p>}
              </div>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-card border border-border rounded-2xl p-4 sm:p-6 lg:col-span-2">
          <h2 className="font-heading text-lg mb-2">Danger Zone</h2>
          <p className="text-xs text-muted-foreground mb-4">Reset all data (members, expenses, todos) to factory seed state.</p>
          <button 
            onClick={() => { if (confirm("Are you sure you want to reset all data?")) { gym.reset(); toast.success("Data reset successfully"); } }}
            className="px-4 py-2 border border-danger/40 text-danger rounded-lg text-sm hover:bg-danger/10 w-full sm:w-auto text-center font-semibold cursor-pointer"
          >
            Reset All Data
          </button>
        </section>
      </div>
    </div>
  );
}

const input = "px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}