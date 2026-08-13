import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase, setActiveBranchId } from "@/lib/supabase";
import {
  Building2,
  Landmark,
  Phone,
  MapPin,
  ArrowRight,
  Dumbbell,
  Award,
  Landmark as MultiBranchIcon,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setup — ALPHA FITNESS" }] }),
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const search = Route.useSearch() as any;
  const [step, setStep] = useState<"choice" | "form">(
    search?.skipChoice ? "form" : "choice",
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
      toast.error("Please enter your gym name");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Ensure gym_owner record exists
      await supabase.from("gym_owners").upsert({
        id: user.id,
        name: form.gymName,
        email: user.email || "",
        phone: form.phone,
      });

      const { data, error } = await supabase
        .from("branches")
        .insert({
          owner_id: user.id,
          gym_name: form.gymName,
          branch_name: form.branchName,
          address: form.address,
          phone: form.phone,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveBranchId(data.id);
      toast.success("Gym setup complete. Please setup your RFID scanner now.");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#070707] text-[#f4f4f2] flex items-center justify-center p-4 sm:p-8 relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:16px_16px]" />

        <div className="w-full max-w-md animate-fade-in relative z-10">
          <div className="text-center mb-6">
            <div className="size-16 bg-[#ed3434]/10 text-[#ed3434] rounded-2xl grid place-items-center mx-auto mb-4 shadow-[0_0_20px_rgba(237,52,52,0.25)] animate-pulse">
              <Dumbbell className="size-8" />
            </div>
            <h1 className="text-3xl font-heading font-extrabold text-white uppercase tracking-tight">
              Gym Configuration
            </h1>
            <p className="text-[#8d8d8d] text-xs uppercase tracking-wider font-semibold mt-1">
              Configure your main console settings
            </p>
          </div>

          <div className="bg-[#101010] border border-[#242424] p-6 sm:p-8 rounded-2xl shadow-2xl space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#8d8d8d] block mb-1.5 font-bold">
                Gym Name *
              </label>
              <div className="relative">
                <Building2 className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
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
              <label className="text-[10px] uppercase tracking-widest text-[#8d8d8d] block mb-1.5 font-bold">
                Branch Name
              </label>
              <div className="relative">
                <Landmark className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                <input
                  value={form.branchName}
                  onChange={(e) => set("branchName", e.target.value)}
                  placeholder="e.g. Main Branch"
                  className={inp + " pl-10"}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#8d8d8d] block mb-1.5 font-bold">
                Address
              </label>
              <div className="relative">
                <MapPin className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Street details, Landmark, City"
                  className={inp + " pl-10"}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#8d8d8d] block mb-1.5 font-bold">
                Phone Contact
              </label>
              <div className="relative">
                <Phone className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
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
              className="w-full py-3.5 bg-[#ed3434] hover:bg-[#ff4b4b] text-white rounded-lg font-bold transition shadow-[0_4px_20px_rgba(237,52,52,0.2)] cursor-pointer mt-4 uppercase tracking-wider text-xs"
            >
              {loading ? "Initializing..." : "Launch ALPHA FITNESS Console"}
            </button>

            {!search?.skipChoice && (
              <button
                onClick={() => setStep("choice")}
                className="w-full py-2 text-xs font-bold text-[#8d8d8d] hover:text-[#f4f4f2] transition cursor-pointer uppercase tracking-wider text-[10px]"
              >
                Return to Choices
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-[#f4f4f2] flex items-center justify-center p-4 sm:p-8 relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:16px_16px]" />

      <div className="w-full max-w-3xl animate-fade-in relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ed3434]/10 border border-[#ed3434]/20 text-[#ed3434] text-xs font-bold rounded-full uppercase tracking-wider mb-4 select-none">
            Welcome to ALPHA FITNESS
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white uppercase tracking-tight">
            Onboard Your Gym
          </h1>
          <p className="text-[#8d8d8d] text-xs sm:text-sm font-semibold uppercase tracking-wider mt-2">
            Choose how you plan to manage your gym network
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            onClick={() => setStep("form")}
            className="p-6 sm:p-8 bg-[#101010] border border-[#242424] rounded-2xl hover:border-[#ed3434]/60 hover:bg-[#ed3434]/5 hover:scale-[1.02] active:scale-98 transition-all duration-300 text-left shadow-lg group relative overflow-hidden cursor-pointer"
          >
            <div className="size-12 bg-[#ed3434]/10 text-[#ed3434] rounded-lg grid place-items-center mb-6 shadow-[0_0_15px_rgba(237,52,52,0.2)] group-hover:scale-110 transition-transform">
              <Award className="size-6" />
            </div>
            <h2 className="text-xl font-heading font-bold text-white uppercase flex items-center gap-1.5">
              Single Gym{" "}
              <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#ed3434] shrink-0" />
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8d8d8d] leading-relaxed font-medium">
              Perfect setup for managing one primary location. Quick setup under
              1 minute.
            </p>
          </button>

          <button
            onClick={() => setStep("form")}
            className="p-6 sm:p-8 bg-[#101010] border border-[#242424] rounded-2xl hover:border-[#ed3434]/60 hover:bg-[#ed3434]/5 hover:scale-[1.02] active:scale-98 transition-all duration-300 text-left shadow-lg group relative overflow-hidden cursor-pointer"
          >
            <div className="size-12 bg-[#ed3434]/10 text-[#ed3434] rounded-lg grid place-items-center mb-6 shadow-[0_0_15px_rgba(237,52,52,0.2)] group-hover:scale-110 transition-transform">
              <MultiBranchIcon className="size-6" />
            </div>
            <h2 className="text-xl font-heading font-bold text-white uppercase flex items-center gap-1.5">
              Multi-Branch Network{" "}
              <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#ed3434] shrink-0" />
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8d8d8d] leading-relaxed font-medium">
              Manage multiple locations. Each branch has its own isolated staff,
              data, time slots, and attendance logs.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

const inp =
  "w-full px-4 py-3 bg-[#070707] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#ed3434]/45 border border-[#242424] text-[#f4f4f2] transition-all";
