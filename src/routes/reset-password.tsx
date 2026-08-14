import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logoPng from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — ALPHA FITNESS" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase link se access_token aata hai URL mein
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setForm(f => ({ ...f, email: session.user.email ?? "" }));
        setReady(true);
      } else {
        toast.error("Invalid or expired reset link.");
        nav({ to: "/auth" });
      }
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated successfully!");
    setTimeout(() => nav({ to: "/auth" }), 1500);
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <p className="text-white">Verifying reset link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src={logoPng} alt="Alpha Fitness" className="h-16 object-contain" />
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(to top right, #000000, #2a2a2a)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <div className="text-center mb-6">
            <div className="size-12 bg-[#ed3434]/10 rounded-xl grid place-items-center mx-auto mb-3">
              <ShieldCheck className="size-6 text-[#ed3434]" />
            </div>
            <h1 className="text-xl font-heading font-bold uppercase tracking-tight">
              SET NEW <span className="text-[#ed3434]">PASSWORD</span>
            </h1>
            <p className="text-[#8d8d8d] text-xs mt-1">{form.email}</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="New Password"
                className={inp + " pr-9"}
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666] hover:text-white bg-transparent border-0 cursor-pointer">
                {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Confirm New Password"
                className={inp}
                required
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm"
              style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full pl-9 pr-3 py-2.5 bg-[#1c1c1c] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#6f0000]/60 border border-white/8 text-white placeholder:text-[#555] transition-all";