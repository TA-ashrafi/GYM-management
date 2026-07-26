import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase, setActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setup — Fitness Streak" }] }),
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const search = Route.useSearch() as any;
  const [step, setStep] = useState<"choice" | "form">(
    search?.skipChoice ? "form" : "choice"
  );
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    gymName: "",
    branchName: "Main Branch",
    address: "",
    phone: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function createBranch() {
    if (!form.gymName) { 
      toast.error("Gym ka naam daalo"); 
      return; 
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Pehle gym_owner record ensure karo
      await supabase.from("gym_owners").upsert({
        id: user.id,
        name: form.gymName,
        email: user.email || "",
        phone: form.phone,
      });

      const { data, error } = await supabase.from("branches").insert({
        owner_id: user.id,
        gym_name: form.gymName,
        branch_name: form.branchName,
        address: form.address,
        phone: form.phone,
      }).select().single();

      if (error) throw error;
      
      setActiveBranchId(data.id);
      toast.success("Gym setup ho gaya! 💪");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Error aaya");
    } finally {
      setLoading(false);
    }
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-heading text-center mb-2">Gym Details</h1>
          <p className="text-muted-foreground text-center mb-8">Apni gym ki basic info daalo</p>

          <div className="bg-card border border-border rounded-3xl p-8 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Gym Ka Naam *</label>
              <input 
                value={form.gymName} 
                onChange={(e) => set("gymName", e.target.value)} 
                placeholder="e.g. Iron Gym" 
                className={inp} 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Branch Name</label>
              <input 
                value={form.branchName} 
                onChange={(e) => set("branchName", e.target.value)} 
                placeholder="Main Branch" 
                className={inp} 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Address</label>
              <input 
                value={form.address} 
                onChange={(e) => set("address", e.target.value)} 
                placeholder="Gym ka address" 
                className={inp} 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Phone</label>
              <input 
                value={form.phone} 
                onChange={(e) => set("phone", e.target.value)} 
                placeholder="+91 9000000000" 
                className={inp} 
              />
            </div>
            <button
              onClick={createBranch}
              disabled={loading}
              className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Gym Banao! 💪"}
            </button>
            
            {!search?.skipChoice && (
              <button
                onClick={() => setStep("choice")}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-heading text-center mb-2">Welcome to Fitness Streak</h1>
        <p className="text-muted-foreground text-center mb-10">Aapke paas kitni gyms hain?</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => setStep("form")}
            className="p-8 bg-card border border-border rounded-3xl hover:border-brand/60 hover:bg-brand/5 transition text-left"
          >
            <div className="size-12 bg-brand/10 text-brand rounded-xl grid place-items-center mb-4">
              <span className="text-2xl">🏋️</span>
            </div>
            <h2 className="text-xl font-heading">Single Gym</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ek gym, simple setup — 1 minute mein ready.</p>
          </button>
          <button
            onClick={() => setStep("form")}
            className="p-8 bg-card border border-border rounded-3xl hover:border-brand/60 hover:bg-brand/5 transition text-left"
          >
            <div className="size-12 bg-brand/10 text-brand rounded-xl grid place-items-center mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h2 className="text-xl font-heading">Multiple Branches</h2>
            <p className="mt-2 text-sm text-muted-foreground">2+ gyms alag jagah. Har branch ka apna data.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-4 py-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-border";