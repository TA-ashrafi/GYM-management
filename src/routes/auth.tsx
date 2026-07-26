import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "@/lib/auth";
import { supabase, fetchBranches, getActiveBranchId, setActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login — Fitness Streak" }] }),
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", name: "", phone: "", confirmPassword: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
        
        // Thoda wait karo taaki session set ho jaye
        await new Promise((r) => setTimeout(r, 500));
        
        const branches = await fetchBranches();
        if (branches.length === 0) {
          nav({ to: "/onboarding" });
        } else {
          const activeBranchId = getActiveBranchId();
          const valid = branches.find((b: any) => b.id === activeBranchId);
          if (!valid) setActiveBranchId(branches[0].id);
          nav({ to: "/" });
        }
      } else {
        if (!form.name.trim()) { toast.error("Naam daalo"); setLoading(false); return; }
        if (form.password.length < 6) { toast.error("Password kam se kam 6 characters"); setLoading(false); return; }
        if (form.password !== form.confirmPassword) { toast.error("Passwords match nahi"); setLoading(false); return; }
        await signUp(form.email, form.password, form.name, form.phone);
        setMode("verify");
        toast.success("Verification email bheja gaya!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Kuch galat hua");
    }
    setLoading(false);
  }

  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="size-20 bg-brand/10 rounded-3xl grid place-items-center mx-auto mb-6">
            <Mail className="size-10 text-brand" />
          </div>
          <h1 className="text-3xl font-heading mb-3">Email verify karo</h1>
          <p className="text-muted-foreground mb-2">
            Humne <strong className="text-foreground">{form.email}</strong> pe verification link bheja hai.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Email open karo → link pe click karo → wapas yahan aa jao
          </p>
          <button
            onClick={() => setMode("login")}
            className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold"
          >
            Login pe jao →
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Email nahi mila? Spam folder check karo ya{" "}
            <button onClick={() => { setMode("signup"); }} className="text-brand hover:underline">
              dobara try karo
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-2">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand/20 via-background to-background border-r border-border">
        <Link to="/landing" className="flex items-center gap-3">
          <div className="size-10 bg-brand rounded-xl grid place-items-center">
            <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading text-xl">FITNESS STREAK</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Gym OS</div>
          </div>
        </Link>
        <div>
          <h2 className="text-4xl font-heading leading-tight">
            {mode === "login"
              ? <><span className="text-brand">Wapas</span> swagat.<br />Gym chalao.</>
              : <>Naya account.<br /><span className="text-brand">Gym setup karo.</span></>}
          </h2>
          <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
            RFID attendance · Member management<br />
            POS billing · Analytics · WhatsApp reminders
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Fitness Streak</p>
      </div>

      {/* Right Form */}
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-10 bg-brand rounded-xl grid place-items-center">
              <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <div className="font-heading text-xl">FITNESS STREAK</div>
          </div>

          <h2 className="text-2xl font-heading mb-1">
            {mode === "login" ? "Login karo" : "Account banao"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Apne gym dashboard mein enter karo" : "Gym OS setup shuru karo"}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6">
            <button onClick={() => setMode("login")}
              className={"flex-1 py-2 rounded-lg text-sm font-medium transition " +
                (mode === "login" ? "bg-card shadow text-foreground" : "text-muted-foreground")}>
              Login
            </button>
            <button onClick={() => setMode("signup")}
              className={"flex-1 py-2 rounded-lg text-sm font-medium transition " +
                (mode === "signup" ? "bg-card shadow text-foreground" : "text-muted-foreground")}>
              Sign Up
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4" autoComplete="off">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Aapka naam"
                      autoComplete="off"
                      className={inp + " pl-10"}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+91 9000000000"
                      autoComplete="off"
                      className={inp + " pl-10"}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Email *</label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="aap@example.com"
                  autoComplete="off"
                  className={inp + " pl-10"}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Password *</label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={inp + " pl-10 pr-10"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password — only on login */}
            {mode === "login" && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!form.email) {
                      toast.error("Pehle email daalo");
                      return;
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
                      redirectTo: window.location.origin + "/auth",
                    });
                    if (!error) toast.success("Password reset link bheja gaya email pe!");
                    else toast.error(error.message);
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  Password bhool gaye?
                </button>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inp + " pl-10"}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand text-brand-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60 mt-2"
            >
              {loading
                ? "Please wait..."
                : mode === "login" ? "Login →" : "Account Banao 💪"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground">
              ← Home pe wapas jao
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-4 py-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-border";