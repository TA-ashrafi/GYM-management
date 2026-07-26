import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, IdCard, User, Activity, CreditCard, Heart, Radio, CheckCircle2, X, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useGym, generateSlots, currencySymbol, type PlanType } from "@/lib/gym-store";
import { supabase, getActiveBranchId } from "@/lib/supabase";

import m1 from "@/assets/m1.jpg";
import m2 from "@/assets/m2.jpg";
import m3 from "@/assets/m3.jpg";
import m4 from "@/assets/m4.jpg";
import m5 from "@/assets/m5.jpg";
import m6 from "@/assets/m6.jpg";

const PHOTOS = [m1, m2, m3, m4, m5, m6];

const PLAN_ORDER: PlanType[] = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

export const Route = createFileRoute("/members/new")({
  head: () => ({ meta: [{ title: "Add Member — IronSync" }] }),
  component: NewMember,
});

function NewMember() {
  const nav = useNavigate();
  const settings = useGym((s) => s.settings);
  const slots = useMemo(() => generateSlots(settings.shifts, settings.slotDurationMin), [settings]);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [rfidAssigned, setRfidAssigned] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  // Plan Prices
  const [planPrices, setPlanPrices] = useState({
    Monthly: 1500,
    Quarterly: 4000,
    HalfYearly: 7500,
    Yearly: 13000,
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gender: "M" as "M" | "F" | "O",
    age: 25,
    heightCm: 170,
    weightKg: 70,
    goal: "Muscle Gain",
    medical: "",
    emergencyContact: "",
    plan: "Monthly" as PlanType,
    feePaid: true,
    preferredSlot: slots[0] ?? "06:00-07:00",
    rollNo: `IRN-${1000 + Math.floor(Math.random() * 9000)}`,
    rfid: "",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  // Load plan prices from current branch
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
        }
      })
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Photo Compression
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = (h * MAX) / w; w = MAX; } }
      else { if (h > MAX) { w = (w * MAX) / h; h = MAX; } }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      setUploadedPhoto(compressed);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Name aur phone zaruri hai");
      return;
    }
    if (!form.rfid) {
      toast.error("RFID card assign karo pehle");
      setScanOpen(true);
      return;
    }

    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("Pehle branch select karo");
      return;
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (form.plan === "Monthly" ? 30 : form.plan === "Quarterly" ? 90 : form.plan === "HalfYearly" ? 180 : 365));

    const { error } = await supabase.from("members").insert({
      branch_id: branchId,
      roll_no: form.rollNo,
      rfid: form.rfid,
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      address: form.address || null,
      gender: form.gender,
      age: form.age,
      height_cm: form.heightCm,
      weight_kg: form.weightKg,
      goal: form.goal,
      medical: form.medical || null,
      emergency_contact: form.emergencyContact || null,
      photo: uploadedPhoto ?? PHOTOS[photoIdx],
      joining_date: form.joiningDate || null,
      plan: form.plan,
      fee_amount: planPrices[form.plan],
      fee_paid: form.feePaid,
      expiry_date: expiry.toISOString(),
      preferred_slot: form.preferredSlot,
    });

    if (error) {
      toast.error("Save nahi hua: " + error.message);
      console.error(error);
      return;
    }

    toast.success(`${form.name} add ho gaya! 💪`);
    nav({ to: "/members" });
  }

  const bmi = form.weightKg / Math.pow(form.heightCm / 100, 2);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="Add Member" subtitle="Naya gym member register karo with RFID card" />

      <form onSubmit={submit} className="grid lg:grid-cols-12 gap-6">
        {/* Photo & ID Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Camera className="size-4" />
              <span className="text-[10px] uppercase tracking-widest">Photo</span>
            </div>
            <img
              src={uploadedPhoto ?? PHOTOS[photoIdx]}
              alt="preview"
              className="w-full aspect-square object-cover rounded-xl ring-2 ring-brand/30"
            />
            <label className="cursor-pointer block mt-4 px-4 py-2 bg-secondary rounded-lg text-sm hover:bg-secondary/80 text-center">
              📷 Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            <div className="grid grid-cols-6 gap-2 mt-3">
              {PHOTOS.map((p, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => { setPhotoIdx(i); setUploadedPhoto(null); }}
                  className={"rounded-md overflow-hidden ring-2 transition " + (photoIdx === i && !uploadedPhoto ? "ring-brand" : "ring-transparent opacity-60 hover:opacity-100")}
                >
                  <img src={p} alt="" className="w-full aspect-square object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RFID Section */}
          <div className="bg-gradient-to-br from-brand/15 to-card border border-brand/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-brand mb-3">
              <IdCard className="size-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold">RFID Card</span>
            </div>
            <Field label="Roll Number">
              <input value={form.rollNo} onChange={(e) => set("rollNo", e.target.value)} className={input} />
            </Field>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">RFID Tag Code</p>
              {form.rfid ? (
                <div className="flex items-center gap-2 p-3 bg-brand/10 border border-brand/40 rounded-lg">
                  <CheckCircle2 className="size-4 text-brand shrink-0" />
                  <span className="font-mono text-sm text-brand flex-1 truncate">{form.rfid}</span>
                  <button
                    type="button"
                    onClick={() => { set("rfid", ""); setRfidAssigned(false); setScanOpen(true); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-secondary/40 border border-dashed border-border rounded-lg text-center text-xs text-muted-foreground">
                  No card assigned yet
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="mt-3 w-full py-2.5 bg-brand text-brand-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
            >
              <Radio className="size-4" />
              {form.rfid ? "Re-assign RFID" : "Assign RFID Card"}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-8 space-y-6">
          <Section icon={<User className="size-4" />} title="Personal Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name *">
                <input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} required />
              </Field>
              <Field label="Phone *">
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} required />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={input} />
              </Field>
              <Field label="Emergency Contact">
                <input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className={input} />
              </Field>
              <Field label="Gender">
                <div className="flex gap-2">
                  {(["M","F","O"] as const).map((g) => (
                    <button type="button" key={g} onClick={() => set("gender", g)}
                      className={"flex-1 py-2 rounded-lg text-sm border " + (form.gender === g ? "bg-brand text-brand-foreground border-brand" : "bg-secondary border-border text-muted-foreground")}>
                      {g === "M" ? "Male" : g === "F" ? "Female" : "Other"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Age">
                <input type="number" value={form.age} onChange={(e) => set("age", +e.target.value)} className={input} />
              </Field>
              <Field label="Date of Joining">
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => set("joiningDate", e.target.value)}
                  className={input}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input value={form.address} onChange={(e) => set("address", e.target.value)} className={input} />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={<Activity className="size-4" />} title="Body & Goals">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Height (cm)">
                <input type="number" value={form.heightCm} onChange={(e) => set("heightCm", +e.target.value)} className={input} />
              </Field>
              <Field label="Weight (kg)">
                <input type="number" value={form.weightKg} onChange={(e) => set("weightKg", +e.target.value)} className={input} />
              </Field>
              <Field label="Fitness Goal">
                <select
                  value={form.goal}
                  onChange={(e) => set("goal", e.target.value)}
                  className={input + " w-full"}
                >
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Fat Loss / Cuts">Fat Loss / Cuts</option>
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Calisthenics">Calisthenics</option>
                  <option value="Yoga">Yoga</option>
                  <option value="General Fitness">General Fitness (Fit Rehna)</option>
                  <option value="Strength Training">Strength Training</option>
                  <option value="Endurance">Endurance / Cardio</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section icon={<Heart className="size-4" />} title="Medical (optional)">
            <Field label="Medical conditions / Allergies / Injuries">
              <textarea value={form.medical} onChange={(e) => set("medical", e.target.value)} rows={2} className={input + " resize-none"} />
            </Field>
          </Section>

          <Section icon={<CreditCard className="size-4" />} title="Membership & Slot">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {PLAN_ORDER.map((p) => (
                <button 
                  type="button" 
                  key={p} 
                  onClick={() => set("plan", p)}
                  className={"p-4 rounded-xl border text-left transition " + (form.plan === p ? "border-brand bg-brand/10" : "border-border bg-secondary/40 hover:border-brand/40")}
                >
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{p}</p>
                  <p className="text-lg font-heading mt-1">₹{planPrices[p]?.toLocaleString("en-IN") ?? "—"}</p>
                </button>
              ))}
            </div>

            <Field label="Preferred Slot">
              <select value={form.preferredSlot} onChange={(e) => set("preferredSlot", e.target.value)} className={input}>
                {slots.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>

            <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.feePaid} onChange={(e) => set("feePaid", e.target.checked)} className="accent-brand size-4" />
              Fee paid upfront (₹{planPrices[form.plan]?.toLocaleString("en-IN") ?? "—"})
            </label>
          </Section>

          <div className="flex gap-3">
            <button type="button" onClick={() => nav({ to: "/members" })} className="px-5 py-3 bg-secondary text-foreground rounded-xl text-sm">Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-brand text-brand-foreground font-semibold rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-transform">
              Add Member
            </button>
          </div>
        </div>
      </form>

      <RfidScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onAssigned={(code) => { set("rfid", code); setRfidAssigned(true); setScanOpen(false); toast.success(`RFID ${code} assigned!`); }}
      />
    </div>
  );
}

// RFID Scan Modal (same as before)
function RfidScanModal({ open, onClose, onAssigned }: { open: boolean; onClose: () => void; onAssigned: (code: string) => void; }) {
  const [phase, setPhase] = useState<"waiting" | "detected">("waiting");
  const [uid, setUid] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase("waiting");
      setUid("");
      return;
    }

    intervalRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("rfid_pending")
        .select("id, uid")
        .eq("claimed", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const row = data[0];
        await supabase.from("rfid_pending").update({ claimed: true }).eq("id", row.id);
        setUid(row.uid);
        setPhase("detected");
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  async function handleAssign() {
    const { data } = await supabase.from("members").select("name").eq("rfid", uid).single();
    if (data) {
      toast.error(`Yeh RFID already ${data.name} ko assigned hai!`);
      return;
    }
    onAssigned(uid);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-brand">
            <Radio className="size-5" />
            <span className="font-heading">RFID Scanner</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="aspect-square max-w-[200px] mx-auto relative mb-6">
          <div className={"absolute inset-0 rounded-full border-4 transition-colors " + (phase === "waiting" ? "border-brand/30 animate-pulse" : "border-brand")} />
          <div className={"absolute inset-4 rounded-full border-2 " + (phase === "waiting" ? "border-brand/20 animate-ping" : "border-brand/60")} />
          <div className="absolute inset-0 grid place-items-center">
            {phase === "waiting" ? (
              <div className="text-center">
                <Radio className="size-12 text-brand mx-auto animate-pulse" />
                <p className="mt-2 text-xs text-muted-foreground">Scanning...</p>
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle2 className="size-12 text-brand mx-auto" />
                <p className="mt-2 text-xs text-brand font-bold">Card Detected!</p>
                <p className="font-mono text-sm mt-1">{uid}</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mb-6">
          {phase === "waiting" ? "RFID card ko scanner ke paas rakho..." : "Card read ho gaya. Assign karo?"}
        </p>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 bg-secondary rounded-xl text-sm">Cancel</button>
          <button
            disabled={phase === "waiting"}
            onClick={handleAssign}
            className="flex-1 py-3 bg-brand text-brand-foreground rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            Assign to Member
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
const input = "w-full px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        {icon}<h2 className="font-heading text-base text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}