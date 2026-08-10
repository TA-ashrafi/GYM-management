import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, Building2, ShieldCheck, Trophy, Sparkles, KeyRound } from "lucide-react";
import { signIn, signUp } from "@/lib/auth";
import { supabase, fetchBranches, getActiveBranchId, setActiveBranchId } from "@/lib/supabase";
import logoPng from "@/assets/logo.png";
import logintitan from "@/assets/login-titan.jpg";
import { FireSparksOverlay } from "@/components/FireSparksOverlay";

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

  // Client-Side Login Attempt Rate Limiting
  const getLoginAttempts = (): { count: number; lockedUntil: number | null } => {
    try {
      const stored = localStorage.getItem("alpha_login_attempts");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { count: 0, lockedUntil: null };
  };

  const incrementAttempts = () => {
    const data = getLoginAttempts();
    data.count += 1;
    if (data.count >= 5) {
      // Lock out for 24 hours (86,400,000 milliseconds)
      data.lockedUntil = Date.now() + 86400000;
      toast.error("Too many failed attempts. Login locked for 24 hours.");
    } else {
      toast.error(`Invalid login credentials. Attempt ${data.count} of 5.`);
    }
    localStorage.setItem("alpha_login_attempts", JSON.stringify(data));
  };

  const clearAttempts = () => {
    localStorage.removeItem("alpha_login_attempts");
  };

  const checkLockStatus = (): boolean => {
    const data = getLoginAttempts();
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      const hoursRemaining = Math.ceil((data.lockedUntil - Date.now()) / 3600000);
      toast.error(`Login is temporarily locked. Try again in ${hoursRemaining} hours.`);
      return true;
    }
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      clearAttempts();
    }
    return false;
  };

  useEffect(() => {
    if (search.mode === "signup") {
      setMode("signup");
    } else {
      setMode("login");
    }
    setOtpSent(false);
    setOtpCode("");
  }, [search.mode]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login" && checkLockStatus()) {
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        try {
          await signIn(form.email, form.password);
          clearAttempts();
        } catch (err: any) {
          incrementAttempts();
          throw err;
        }
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
        <div className="w-full max-w-md text-center bg-[#111]/90 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <div className="size-16 bg-[#ed3434]/10 rounded-xl grid place-items-center mx-auto mb-5">
            <Mail className="size-8 text-[#ed3434] animate-pulse" />
          </div>
          <h1 className="text-2xl font-heading mb-2 font-bold text-white uppercase tracking-tight">Verify your email</h1>
          <p className="text-[#8d8d8d] mb-1 text-sm">
            We have sent a verification link to <strong className="text-white">{form.email}</strong>
          </p>
          <p className="text-sm text-[#8d8d8d] mb-6">
            Open your email inbox, click the verification link, then return here.
          </p>
          <button
            onClick={() => setMode("login")}
            className="w-full py-3 text-white rounded-xl font-bold transition cursor-pointer uppercase tracking-wider text-xs"
            style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070707] text-[#f4f4f2] grid lg:grid-cols-2 lg:h-screen lg:overflow-hidden relative select-none">

      {/* High-performance optimized canvas fire sparks backdrop (no lagging smoke effect) */}
      <FireSparksOverlay intensity={35} color="red" speed={0.8} />

      {/* ==================== LEFT PANEL ==================== */}
      <div className="hidden lg:flex relative h-full w-full overflow-hidden bg-black select-none z-0">
        <img
          src={logintitan}
          alt="Athlete posing"
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.78] contrast-125 z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-[#070707]/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#070707] z-10" />

        <div className="absolute top-10 left-10 z-20">
          <Link to="/" className="hover:opacity-90 transition">
            <div className="font-heading text-xl font-black text-white uppercase leading-none tracking-tight">
              ALPHA <span className="text-[#ed3434]">FITNESS</span>
            </div>
            <div className="text-[8px] uppercase tracking-[0.25em] text-[#8d8d8d] font-bold mt-1">
              Your Gym Operating System
            </div>
          </Link>
        </div>

        <div className="absolute bottom-14 left-12 z-20 max-w-md space-y-3 text-left">
          <div className="inline-flex items-center gap-1.5 text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">
            <Sparkles className="size-3.5" /> Forge Your Legacy
          </div>
          <h2 className="text-3xl xl:text-4xl font-heading font-black text-white leading-none uppercase">
            RECLAIM CONTROL OF YOUR SYSTEM
          </h2>
          <p className="text-[#8d8d8d] text-sm leading-relaxed max-w-sm">
            Deploy the ultimate athletic management console. Monitor live logs, process supplementary transactions, and automate membership workflows.
          </p>
        </div>
      </div>

      {/* ==================== RIGHT PANEL ==================== */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:h-full z-10 bg-[#070707] relative overflow-hidden">

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#6f0000]/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-[380px] relative z-10">

          {/* FORM CARD */}
          <div
            className="relative rounded-2xl p-5 sm:p-6 overflow-hidden"
            style={{
              background: "linear-gradient(to top right, #000000, #2a2a2a)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px -10px rgba(111,0,0,0.25)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* LOGO ONLY */}
            <div className="flex justify-center mb-4">
              <img src={logoPng} alt="Alpha Fitness" className="h-20 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.45)]" />
            </div>

            {/* Title */}
            <div className="text-center mb-4">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-white uppercase tracking-tight">
                {mode === "login" ? (
                  <>WELCOME <span className="text-[#ed3434]">BACK</span></>
                ) : (
                  <>CREATE <span className="text-[#ed3434]">CONSOLE</span></>
                )}
              </h1>
              <p className="text-[#8d8d8d] text-[12px] mt-0.5">
                {mode === "login"
                  ? "Login to continue your fitness journey"
                  : "Establish your gym operating system"}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-1 bg-black/50 rounded-xl p-1 mb-3.5">
              <button
                onClick={() => { setMode("login"); setAuthMethod("password"); }}
                className={"flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer uppercase tracking-wider " +
                  (mode === "login" ? "text-white" : "text-[#8d8d8d] hover:text-white")}
                style={mode === "login" ? { background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" } : {}}
              >
                Login
              </button>
              <button
                onClick={() => { setMode("signup"); setAuthMethod("password"); }}
                className={"flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer uppercase tracking-wider " +
                  (mode === "signup" ? "text-white" : "text-[#8d8d8d] hover:text-white")}
                style={mode === "signup" ? { background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" } : {}}
              >
                Sign Up
              </button>
            </div>

            {/* Password / OTP Switcher */}
            {mode === "login" && (
              <div className="flex gap-1 bg-black/40 rounded-lg p-0.5 mb-3.5">
                <button
                  type="button"
                  onClick={() => { setAuthMethod("password"); setOtpSent(false); }}
                  className={"flex-1 py-1.5 rounded text-[10px] font-bold transition uppercase tracking-widest cursor-pointer " +
                    (authMethod === "password" ? "bg-[#6f0000]/30 text-[#ed3434]" : "text-[#8d8d8d] hover:text-white")}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod("otp"); setOtpSent(false); }}
                  className={"flex-1 py-1.5 rounded text-[10px] font-bold transition uppercase tracking-widest cursor-pointer " +
                    (authMethod === "otp" ? "bg-[#6f0000]/30 text-[#ed3434]" : "text-[#8d8d8d] hover:text-white")}
                >
                  OTP
                </button>
              </div>
            )}

            {/* ===== FORMS ===== */}
            {mode === "login" && authMethod === "otp" ? (
              <div className="space-y-3">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="Username or Email"
                        className={inp}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm"
                      style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                    >
                      {otpLoading ? "Sending OTP..." : "Send OTP Code"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="relative">
                      <KeyRound className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className={inp + " text-center tracking-[0.3em] font-bold"}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-[#8d8d8d] text-center -mt-1">
                      Code sent to <span className="text-[#ed3434]">{form.email}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="py-2.5 bg-white/5 border border-white/10 text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-white/10 transition"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={otpLoading}
                        className="py-2.5 text-white text-xs font-bold rounded-xl uppercase tracking-wider"
                        style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                      >
                        {otpLoading ? "Verifying..." : "Verify & Login"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <User className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                        <input
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          placeholder="Owner Name"
                          className={inpCompact}
                          required
                        />
                      </div>
                      <div className="relative">
                        <Building2 className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                        <input
                          value={form.gymName}
                          onChange={(e) => set("gymName", e.target.value)}
                          placeholder="Gym Name"
                          className={inpCompact}
                          required
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <Mail className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="Work Email"
                        className={inp}
                        required
                      />
                    </div>

                    <div className="relative">
                      <Phone className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="Phone Number"
                        className={inp}
                      />
                    </div>

                    <div className="relative">
                      <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        placeholder="Choose Password"
                        className={inp + " pr-9"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666] hover:text-white cursor-pointer bg-transparent border-0"
                      >
                        {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-[#8d8d8d] cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={form.terms}
                        onChange={(e) => set("terms", e.target.checked)}
                        className="accent-[#ed3434] size-3.5"
                      />
                      <span>I accept terms & conditions</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="relative">
                      <Mail className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="Username or Email"
                        className={inp}
                        required
                      />
                    </div>

                    <div className="relative">
                      <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        placeholder="Password"
                        className={inp + " pr-9"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666] hover:text-white cursor-pointer bg-transparent border-0"
                      >
                        {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-[#8d8d8d]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.rememberMe}
                          onChange={(e) => set("rememberMe", e.target.checked)}
                          className="accent-[#ed3434] size-3.5"
                        />
                        <span>Remember me</span>
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
                        className="text-[#ed3434] hover:underline font-medium bg-transparent border-0 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm active:scale-[0.98]"
                  style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                >
                  {loading
                    ? "Authorizing..."
                    : mode === "login" ? "LOGIN" : "Create My Console"}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative px-3 text-[10px] uppercase tracking-widest text-[#666] font-bold" style={{ background: "#1a1a1a" }}>
                OR
              </span>
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-10 rounded-xl bg-white text-black text-sm font-bold flex items-center justify-center gap-2 transition hover:bg-gray-100 active:scale-[0.98] cursor-pointer"
            >
              <svg className="size-4.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login with Google
            </button>

            {/* Footer */}
            <div className="text-center mt-4 text-[12px] text-[#8d8d8d]">
              {mode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-[#ed3434] hover:underline font-bold">
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-[#ed3434] hover:underline font-bold">
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Bottom features */}
          <div className="flex justify-center gap-6 mt-5">
            {[
              { icon: Trophy, label: "ELITE TRAINING" },
              { icon: ShieldCheck, label: "SECURE & PRIVATE" },
              { icon: User, label: "ACHIEVE MORE" }
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <item.icon className="size-4 text-[#ed3434]" />
                <span className="text-[8px] uppercase font-bold tracking-wider text-[#8d8d8d]">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-3">
            <Link to="/" className="text-[11px] text-[#666] hover:text-white font-medium transition inline-flex items-center gap-1.5 uppercase tracking-wider">
              <ArrowLeft className="size-3.5" /> Return to Main Entrance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full pl-9 pr-3 py-2.5 bg-[#1c1c1c] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#6f0000]/60 border border-white/8 text-white placeholder:text-[#555] transition-all";
const inpCompact = "w-full pl-8 pr-2.5 py-2.5 bg-[#1c1c1c] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#6f0000]/60 border border-white/8 text-white placeholder:text-[#555] transition-all";
