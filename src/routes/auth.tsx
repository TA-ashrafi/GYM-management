import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Dumbbell, Mail, Lock, User, Phone, Eye, EyeOff, Chrome, ArrowLeft, Building2, ShieldCheck, Trophy, Sparkles, KeyRound } from "lucide-react";
import { signIn, signUp } from "@/lib/auth";
import { supabase, fetchBranches, getActiveBranchId, setActiveBranchId } from "@/lib/supabase";
import logoPng from "@/assets/logo.png";
import m2 from "@/assets/m2.jpg";
import { FireSparksOverlay } from "@/components/FireSparksOverlay";
import { SmokeOverlay } from "@/components/SmokeOverlay";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Access Portal — ALPHA FITNESS" }] }),
  validateSearch: (search: Record<string, unknown>) =>
    z.object({
      mode: z.enum(["login", "signup"]).optional(),
    }).parse(search),
  component: Auth,
});

function Auth() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // OTP Authentication state
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    confirmPassword: "",
    gymName: "",
    terms: false,
    rememberMe: true
  });

  useEffect(() => {
    if (search.mode === "signup") {
      setMode("signup");
    } else {
      setMode("login");
    }
    // Reset OTP states on mode toggles
    setOtpSent(false);
    setOtpCode("");
  }, [search.mode]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
        
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
        if (!form.gymName.trim()) { toast.error("Please enter your gym name"); setLoading(false); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); setLoading(false); return; }
        if (!form.terms) { toast.error("Please accept the terms and conditions"); setLoading(false); return; }

        await signUp(form.email, form.password, form.name, form.phone);
        setMode("verify");
        toast.success("Verification email sent successfully.");
      }
    } catch (err: any) {
      console.error("Auth action failed:", err);
      toast.error(err.message || "An authentication error occurred.");
    }
    setLoading(false);
  }

  // Handle OTP dispatch from Supabase Auth
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("Please enter your email address first");
      return;
    }
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email.trim(),
        options: {
          emailRedirectTo: window.location.origin + "/auth",
        }
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("OTP verification code sent to your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP code.");
    } finally {
      setOtpLoading(false);
    }
  }

  // Handle OTP verification on Supabase Auth
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: form.email.trim(),
        token: otpCode.trim(),
        type: "email"
      });
      if (error) throw error;

      toast.success("OTP verified. Access authorized.");

      const branches = await fetchBranches();
      if (branches.length === 0) {
        nav({ to: "/onboarding" });
      } else {
        const activeBranchId = getActiveBranchId();
        const valid = branches.find((b: any) => b.id === activeBranchId);
        if (!valid) setActiveBranchId(branches[0].id);
        nav({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP code.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth",
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Google Authentication");
    }
  }

  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-[#070707] text-[#f4f4f2] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-[#101010] border border-[#242424] p-8 rounded-xl shadow-2xl animate-fade-in">
          <div className="size-20 bg-[#ed3434]/10 rounded-xl grid place-items-center mx-auto mb-6">
            <Mail className="size-10 text-[#ed3434] animate-pulse" />
          </div>
          <h1 className="text-3xl font-heading mb-3 font-bold text-white uppercase tracking-tight">Verify your email</h1>
          <p className="text-[#8d8d8d] mb-2 text-sm">
            We have sent a verification link to <strong className="text-[#f4f4f2]">{form.email}</strong>
          </p>
          <p className="text-sm text-[#8d8d8d] mb-8">
            Open your email inbox, click the verification link, then return here.
          </p>
          <button
            onClick={() => setMode("login")}
            className="w-full py-3.5 bg-[#ed3434] hover:bg-[#ff4b4b] text-white rounded-lg font-bold transition cursor-pointer uppercase tracking-wider text-xs"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070707] text-[#f4f4f2] grid lg:grid-cols-2 lg:h-screen lg:overflow-hidden relative select-none">

      {/* Dynamic atmospheric fire sparks and smoke drift overlays */}
      <FireSparksOverlay intensity={35} color="red" speed={0.8} />
      <SmokeOverlay intensity={14} color="dark" speed={0.4} />

      {/* LEFT PANEL: High Contrast Full-Bleed Athlete Photo */}
      <div className="hidden lg:flex relative h-full w-full overflow-hidden bg-black select-none z-0">
        <img
          src={m2}
          alt="Athlete posing"
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] contrast-125 z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-[#070707]/30 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#070707] z-10" />

        {/* Branding badge in Left Panel */}
        <div className="absolute top-10 left-10 z-20">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition">
            <img src={logoPng} alt="Alpha Logo" className="h-8 object-contain" />
            <div>
              <div className="font-heading text-xl font-black text-white uppercase leading-none">ALPHA <span className="text-[#ed3434]">FITNESS</span></div>
              <div className="text-[8px] uppercase tracking-[0.25em] text-[#8d8d8d] font-bold mt-1">Your Gym Operating System</div>
            </div>
          </Link>
        </div>

        {/* Bottom Overlay Block */}
        <div className="absolute bottom-16 left-16 z-20 max-w-lg space-y-4 text-left">
          <div className="inline-flex items-center gap-1.5 text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">
            <Sparkles className="size-4" /> Forge Your Legacy
          </div>
          <h2 className="text-4xl sm:text-5xl font-heading font-black text-white leading-none uppercase">
            RECLAIM CONTROL OF YOUR SYSTEM
          </h2>
          <p className="text-[#8d8d8d] text-sm leading-relaxed max-w-sm">
            Deploy the ultimate athletic management console. Monitor live logs, process supplementary transactions, and automate membership workflows.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#242424] text-left">
            {[
              { label: "Elite Training", icon: Trophy },
              { label: "Secure & Private", icon: ShieldCheck },
              { label: "Achieve More", icon: User }
            ].map((prop) => (
              <div key={prop.label} className="space-y-1">
                <prop.icon className="size-5 text-[#ed3434]" />
                <span className="text-[10px] uppercase font-bold text-white tracking-wider block leading-tight">{prop.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Centered Form Column */}
      <div className="flex items-center justify-center p-6 sm:p-12 overflow-y-auto lg:h-full lg:overflow-y-auto z-10 bg-[#070707]">
        <div className="w-full max-w-[420px] space-y-6">

          {/* Logo Tile + Wordmark */}
          <div className="flex items-center gap-3">
            <div className="size-10 bg-[#ed3434]/10 border border-[#ed3434]/20 rounded-xl grid place-items-center">
              <img src={logoPng} alt="Alpha fitness logo" className="h-6 object-contain" />
            </div>
            <div>
              <div className="font-heading text-lg font-black text-white uppercase leading-none">ALPHA <span className="text-[#ed3434]">FITNESS</span></div>
              <div className="text-[8px] uppercase tracking-[0.25em] text-[#8d8d8d] font-bold mt-1">Your Gym Operating System</div>
            </div>
          </div>

          <div>
            <span className="text-[#ed3434] text-[10px] uppercase font-bold tracking-[0.25em] block mb-1">
              {mode === "login" ? "Gym Administration Entrance" : "Owner Registration Portal"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-heading font-black text-white uppercase tracking-tight leading-none">
              {mode === "login" ? (
                <>Login / <span className="text-[#ed3434]">Console</span></>
              ) : (
                <>Create / <span className="text-[#ed3434]">Console</span></>
              )}
            </h1>
            <p className="text-xs text-[#8d8d8d] mt-1 font-semibold uppercase tracking-wider">
              {mode === "login" ? "Enter your core administrative credentials" : "Establish your custom operating system credentials"}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-1 bg-[#070707] rounded-xl p-1 border border-[#242424]">
            <button onClick={() => { setMode("login"); setAuthMethod("password"); }}
              className={"flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer uppercase tracking-wider " +
                (mode === "login" ? "bg-[#101010] shadow-sm text-white font-bold" : "text-[#8d8d8d] hover:text-white")}>
              Login
            </button>
            <button onClick={() => { setMode("signup"); setAuthMethod("password"); }}
              className={"flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer uppercase tracking-wider " +
                (mode === "signup" ? "bg-[#101010] shadow-sm text-white font-bold" : "text-[#8d8d8d] hover:text-white")}>
              Sign Up
            </button>
          </div>

          {/* Login-only method switcher (Password vs OTP) */}
          {mode === "login" && (
            <div className="flex gap-1 bg-[#070707]/60 rounded-lg p-0.5 border border-[#242424]/40">
              <button
                type="button"
                onClick={() => { setAuthMethod("password"); setOtpSent(false); }}
                className={"flex-1 py-1 rounded text-[10px] font-bold transition uppercase tracking-widest cursor-pointer " + (authMethod === "password" ? "bg-[#ed3434]/15 text-[#ed3434]" : "text-[#8d8d8d] hover:text-white")}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod("otp"); setOtpSent(false); }}
                className={"flex-1 py-1 rounded text-[10px] font-bold transition uppercase tracking-widest cursor-pointer " + (authMethod === "otp" ? "bg-[#ed3434]/15 text-[#ed3434]" : "text-[#8d8d8d] hover:text-white")}
              >
                OTP Verification
              </button>
            </div>
          )}

          {/* Conditional Form Render based on authMethod and mode */}
          {mode === "login" && authMethod === "otp" ? (
            <div className="space-y-4 animate-fade-in">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Email Address *</label>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
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
                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-3.5 bg-[#ed3434] hover:bg-[#ff4b4b] text-white font-extrabold rounded-lg transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-xs shadow-[0_4px_15px_rgba(237,52,52,0.25)] hover:scale-[1.01]"
                  >
                    {otpLoading ? "Sending OTP..." : "Send OTP Verification Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">6-Digit Verification Code *</label>
                    <div className="relative">
                      <KeyRound className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="e.g. 123456"
                        className={inp + " pl-10 text-center tracking-[0.5em] font-bold text-lg"}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-[#8d8d8d] mt-2 font-semibold uppercase tracking-wider text-center">
                      Code sent to <span className="text-[#ed3434]">{form.email}</span>. Please check your inbox.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="py-3 bg-[#202020] border border-[#242424] text-white text-xs font-bold rounded-lg uppercase tracking-wider"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="py-3 bg-[#ed3434] hover:bg-[#ff4b4b] text-white text-xs font-bold rounded-lg uppercase tracking-wider shadow-[0_4px_15px_rgba(237,52,52,0.25)]"
                    >
                      {otpLoading ? "Verifying..." : "Verify & Login"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Two Column Name & Gym Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Owner Name *</label>
                      <div className="relative">
                        <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                        <input
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          placeholder="Owner Name"
                          className={inp + " pl-10"}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Gym Name *</label>
                      <div className="relative">
                        <Building2 className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                        <input
                          value={form.gymName}
                          onChange={(e) => set("gymName", e.target.value)}
                          placeholder="Gym Name"
                          className={inp + " pl-10"}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email, Phone, Password */}
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Work Email *</label>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="work@gym.com"
                        className={inp + " pl-10"}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Phone Number</label>
                    <div className="relative">
                      <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                      <input
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="+91 90000 00000"
                        className={inp + " pl-10"}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Choose Password *</label>
                    <div className="relative">
                      <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d8d8d] hover:text-white cursor-pointer bg-transparent border-0"
                      >
                        {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-[#8d8d8d] cursor-pointer py-1 font-semibold uppercase tracking-wider text-[10px]">
                    <input
                      type="checkbox"
                      checked={form.terms}
                      onChange={(e) => set("terms", e.target.checked)}
                      className="accent-[#ed3434] size-4 mt-0.5"
                    />
                    <span>I accept terms & conditions</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  {/* Email / Username */}
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Email or Username *</label>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="admin"
                        className={inp + " pl-10"}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.22em] text-[#8d8d8d] block mb-1 font-bold">Password *</label>
                    <div className="relative">
                      <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d8d8d]" />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d8d8d] hover:text-white cursor-pointer bg-transparent border-0"
                      >
                        {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me + Forgot password */}
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[#8d8d8d]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.rememberMe}
                        onChange={(e) => set("rememberMe", e.target.checked)}
                        className="accent-[#ed3434] size-4"
                      />
                      <span>Remember Me</span>
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!form.email) {
                          toast.error("Please enter your email address first");
                          return;
                        }
                        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
                          redirectTo: window.location.origin + "/auth",
                        });
                        if (!error) toast.success("Password reset link sent to your email.");
                        else toast.error(error.message);
                      }}
                      className="text-[#ed3434] hover:underline font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#ed3434] hover:bg-[#ff4b4b] text-white font-extrabold rounded-lg transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-xs shadow-[0_4px_15px_rgba(237,52,52,0.25)] hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading
                  ? "Authorizing..."
                  : mode === "login" ? "Login to Console" : "Create My Console"}
              </button>
            </form>
          )}

          {/* Divider "or" */}
          <div className="relative flex items-center justify-center select-none">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#242424]" /></div>
            <span className="relative px-3 bg-[#070707] text-[8px] uppercase tracking-widest text-[#8d8d8d] font-bold">or use third-party OAuth</span>
          </div>

          {/* Google Button with SVG G icon */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-11 rounded-lg border border-[#242424] bg-[#101010] hover:bg-[#202020] text-white text-xs font-bold flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer uppercase tracking-wider"
          >
            <Chrome className="size-4 text-[#ed3434]" />
            Continue with Google
          </button>

          {/* Footer Link to Other Auth State */}
          <div className="text-center pt-2 text-xs text-[#8d8d8d] font-semibold uppercase tracking-wider text-[10px]">
            {mode === "login" ? (
              <p>
                Don't have a console?{" "}
                <button onClick={() => setMode("signup")} className="text-[#ed3434] hover:underline font-extrabold uppercase">
                  Register Now
                </button>
              </p>
            ) : (
              <p>
                Already have a console?{" "}
                <button onClick={() => setMode("login")} className="text-[#ed3434] hover:underline font-extrabold uppercase">
                  Sign In
                </button>
              </p>
            )}
          </div>

          <div className="text-center pt-2">
            <Link to="/" className="text-xs text-[#8d8d8d] hover:text-white font-medium transition inline-flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <ArrowLeft className="size-3.5" /> Return to Main Entrance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-3.5 py-3 bg-[#101010]/60 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#ed3434]/40 border border-[#242424] text-[#f4f4f2] transition-all";
