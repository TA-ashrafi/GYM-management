import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Mail, Lock, User, Phone, Eye, EyeOff, Sparkles } from "lucide-react";
import { signIn, signUp } from "@/lib/auth";
import { supabase, fetchBranches, getActiveBranchId, setActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login — Gym OS" }] }),
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
        
        // Brief delay to ensure session initialization is complete
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
        if (!form.name.trim()) { toast.error("Please enter your name"); setLoading(false); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); setLoading(false); return; }
        if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); setLoading(false); return; }
        await signUp(form.email, form.password, form.name, form.phone);
        setMode("verify");
        toast.success("Verification email sent successfully!");
      }
    } catch (err: any) {
      console.error("Auth action failed:", err);

      // Extract the most detailed message possible from the error object
      let errMsg = "";
      if (err) {
        if (typeof err === "string") {
          errMsg = err;
        } else {
          // Check standard properties first
          const parts: string[] = [];
          if (err.message) parts.push(err.message);
          if (err.error_description) parts.push(err.error_description);
          if (err.details) parts.push(err.details);
          if (err.hint) parts.push(err.hint);
          if (err.code) parts.push(`Code: ${err.code}`);

          if (parts.length > 0) {
            errMsg = parts.join(" | ");
          } else {
            // Fallback for objects where properties might be non-enumerable or custom
            try {
              const keys = Object.getOwnPropertyNames(err);
              const extracted: string[] = [];
              for (const key of keys) {
                if (err[key] && typeof err[key] !== "function") {
                  extracted.push(`${key}: ${JSON.stringify(err[key])}`);
                }
              }
              if (extracted.length > 0) {
                errMsg = extracted.join(", ");
              } else {
                errMsg = err.toString();
              }
            } catch (e) {
              errMsg = String(err);
            }
          }
        }
      }

      if (!errMsg || errMsg === "[object Object]" || errMsg === "{}") {
        errMsg = "Registration Error: Please check SMTP settings or credentials";
      }

      toast.error(errMsg, { duration: 8000 });
    }
    setLoading(false);
  }

  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-card border border-border p-8 rounded-3xl shadow-2xl animate-fade-in">
          <div className="size-20 bg-brand/10 rounded-3xl grid place-items-center mx-auto mb-6 shadow-[0_0_24px_rgba(var(--color-brand),0.2)]">
            <Mail className="size-10 text-brand animate-pulse" />
          </div>
          <h1 className="text-3xl font-heading mb-3 font-bold text-foreground">Verify your email</h1>
          <p className="text-muted-foreground mb-2 text-sm">
            We've sent a verification link to <strong className="text-foreground">{form.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Open your email → Click the verification link → Return here
          </p>
          <button
            onClick={() => setMode("login")}
            className="w-full py-3.5 bg-brand text-brand-foreground rounded-xl font-bold hover:scale-[1.01] active:scale-95 transition cursor-pointer"
          >
            Go to Login →
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Didn't receive the email? Check your spam folder or{" "}
            <button onClick={() => { setMode("signup"); }} className="text-brand hover:underline font-semibold">
              try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-12 overflow-x-hidden">
      {/* Cinematic Left Panel - Branding and Dynamic Fitness Quote Info */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 bg-[radial-gradient(ellipse_at_top_right,rgba(var(--color-brand),0.15),transparent)] border-r border-border/40 relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute top-1/4 left-1/4 size-96 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 size-80 rounded-full bg-accent/5 blur-3xl" />

        <Link to="/landing" className="flex items-center gap-3 relative z-10 hover:opacity-90 transition">
          <div className="size-10 bg-brand rounded-xl grid place-items-center shadow-[0_0_24px_-4px_var(--color-brand)]">
            <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading text-lg font-bold tracking-tight text-foreground uppercase">GYM OS</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Fitness Streak</div>
          </div>
        </Link>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-xs font-bold rounded-full uppercase tracking-wider">
            <Sparkles className="size-3.5" /> High Performance Gym Management
          </div>
          <h2 className="text-4xl font-heading leading-tight font-extrabold text-foreground tracking-tight">
            {mode === "login" ? (
              <>
                Power Your Gym with <br />
                <span className="text-brand">Premium Analytics.</span>
              </>
            ) : (
              <>
                Start Your Journey. <br />
                <span className="text-brand">Control All Branches.</span>
              </>
            )}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm font-medium">
            Manage members, track physical attributes, schedule preferred time slots, accept upfront payments, and setup RFID scanning dynamically in real-time.
          </p>
        </div>

        <p className="text-xs text-muted-foreground relative z-10">© {new Date().getFullYear()} Gym OS — fitness streak</p>
      </div>

      {/* Right Panel - Cinematic Authentication Form */}
      <div className="flex items-center justify-center p-4 sm:p-12 min-h-screen lg:col-span-7 bg-[radial-gradient(circle_at_bottom_left,rgba(var(--color-accent),0.05),transparent)]">
        <div className="w-full max-w-md bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-2xl animate-fade-in relative">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-9 bg-brand rounded-lg grid place-items-center shadow-[0_0_16px_-4px_var(--color-brand)]">
              <Dumbbell className="size-4.5 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-heading text-base font-bold tracking-tight text-foreground uppercase">GYM OS</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Fitness Streak</div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground tracking-tight mb-1">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 font-medium">
            {mode === "login" ? "Access your gym dashboard console" : "Begin your automated gym onboarding setup"}
          </p>

          {/* Cinematic Tab Toggles */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 border border-border/10">
            <button onClick={() => setMode("login")}
              className={"flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer " +
                (mode === "login" ? "bg-card shadow-sm text-foreground font-bold animate-fade-in" : "text-muted-foreground hover:text-foreground")}>
              Login
            </button>
            <button onClick={() => setMode("signup")}
              className={"flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer " +
                (mode === "signup" ? "bg-card shadow-sm text-foreground font-bold animate-fade-in" : "text-muted-foreground hover:text-foreground")}>
              Sign Up
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Sign Up Fields */}
            {mode === "signup" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1 font-semibold">Full Name *</label>
                  <div className="relative">
                    <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Your full name"
                      className={inp + " pl-10"}
                      required
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1 font-semibold">Phone</label>
                  <div className="relative">
                    <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+91 9000000000"
                      className={inp + " pl-10"}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1 font-semibold">Email *</label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  className={inp + " pl-10"}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1 font-semibold">Password *</label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                  className={inp + " pl-10 pr-10"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password - Login Mode Only */}
            {mode === "login" && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!form.email) {
                      toast.error("Please enter your email first");
                      return;
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
                      redirectTo: window.location.origin + "/auth",
                    });
                    if (!error) toast.success("Password reset link sent to your email!");
                    else toast.error(error.message);
                  }}
                  className="text-xs text-brand hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Confirm Password - Sign Up Mode Only */}
            {mode === "signup" && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1 font-semibold">Confirm Password *</label>
                <div className="relative">
                  <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                    placeholder="••••••••"
                    className={inp + " pl-10"}
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand text-brand-foreground font-bold rounded-xl hover:scale-[1.01] active:scale-95 transition disabled:opacity-60 mt-4 cursor-pointer shadow-[0_4px_24px_rgba(var(--color-brand),0.3)]"
            >
              {loading
                ? "Please wait..."
                : mode === "login" ? "Sign In →" : "Sign Up 💪"}
            </button>
          </form>

          {/* Navigation Link */}
          <div className="mt-6 text-center">
            <Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground font-medium transition">
              ← Back to Home Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-4 py-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/45 border border-border/80 transition-all text-foreground";