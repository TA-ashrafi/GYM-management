import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase, setActiveBranchId } from "@/lib/supabase";
import { Building2, Landmark, CheckCircle2, Phone, MapPin, ArrowRight, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setup — ALPHA FITNESS" }] }),
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

  // Create a new branch
  async function createBranch() {
    if (!form.gymName) { 
      toast.error("Please enter your gym name"); 
      return; 
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Ensure gym_owner record exists
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
      toast.success("Gym setup complete! Setup your RFID scanner now. 💪");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Gym Details Form
  if (step === "form") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-8 bg-[radial-gradient(circle_at_top_right,rgba(var(--color-brand),0.12),transparent)]">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-6">
            <div className="size-16 bg-brand/10 text-brand rounded-2xl grid place-items-center mx-auto mb-4 shadow-[0_0_24px_rgba(var(--color-brand),0.2)]">
              <Dumbbell className="size-8" />
            </div>
            <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Gym Configuration</h1>
            <p className="text-muted-foreground text-sm font-medium mt-1">Configure your main console settings</p>
          </div>

          <div className="bg-card/75 backdrop-blur-md border border-border p-6 sm:p-8 rounded-3xl shadow-2xl space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5 font-bold">Gym Name *</label>
              <div className="relative">
                <Building2 className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.gymName}
                  onChange={(e) => set("gymName", e.target.value)}
                  placeholder="e.g. ALPHA FITNESS"
                  className={inp + " pl-10"}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5 font-bold">Branch Name</label>
              <div className="relative">
                <Landmark className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.branchName}
                  onChange={(e) => set("branchName", e.target.value)}
                  placeholder="e.g. Main Branch"
                  className={inp + " pl-10"}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5 font-bold">Address</label>
              <div className="relative">
                <MapPin className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Street details, Landmark, City"
                  className={inp + " pl-10"}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5 font-bold">Phone Contact</label>
              <div className="relative">
                <Phone className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 90000 00000"
                  className={inp + " pl-10"}
                />
              </div>
            </div>

            <button
              onClick={createBranch}
              disabled={loading}
              className="w-full py-3.5 bg-brand text-brand-foreground rounded-xl font-bold hover:scale-[1.01] active:scale-95 transition shadow-[0_4px_24px_rgba(var(--color-brand),0.3)] cursor-pointer mt-4"
            >
              {loading ? "Initializing..." : "Launch ALPHA FITNESS Console ⚡"}
            </button>
            
            {!search?.skipChoice && (
              <button
                onClick={() => setStep("choice")}
                className="w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                ← Return to Choices
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Choice between Single and Multiple Branches (Cinematic Style)
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-8 bg-[radial-gradient(circle_at_bottom_left,rgba(var(--color-accent),0.1),transparent)]">
      <div className="w-full max-w-3xl animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-xs font-bold rounded-full uppercase tracking-wider mb-4 animate-pulse">
            ⚡ Welcome to ALPHA FITNESS
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-foreground tracking-tight">Onboard Your Gym</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2 font-medium">Choose how you plan to manage your gym network</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            onClick={() => setStep("form")}
            className="p-6 sm:p-8 bg-card border border-border/80 rounded-3xl hover:border-brand/60 hover:bg-brand/5 hover:scale-[1.02] active:scale-98 transition-all duration-300 text-left shadow-lg group relative overflow-hidden cursor-pointer"
          >
            <div className="size-12 bg-brand/10 text-brand rounded-xl grid place-items-center mb-6 shadow-[0_0_16px_-4px_var(--color-brand)] group-hover:scale-110 transition-transform">
              <span className="text-2xl">🏋️</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-1.5">
              Single Gym <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-brand shrink-0" />
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
              Perfect setup for managing one primary location. Quick setup under 1 minute.
            </p>
          </button>

          <button
            onClick={() => setStep("form")}
            className="p-6 sm:p-8 bg-card border border-border/80 rounded-3xl hover:border-brand/60 hover:bg-brand/5 hover:scale-[1.02] active:scale-98 transition-all duration-300 text-left shadow-lg group relative overflow-hidden cursor-pointer"
          >
            <div className="size-12 bg-brand/10 text-brand rounded-xl grid place-items-center mb-6 shadow-[0_0_16px_-4px_var(--color-brand)] group-hover:scale-110 transition-transform">
              <span className="text-2xl">🏢</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-1.5">
              Multi-Branch Network <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-brand shrink-0" />
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
              Manage 2+ locations. Each branch has its own isolated staff, data, time slots, and attendance logs.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-4 py-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/45 border border-border/80 text-foreground transition-all";