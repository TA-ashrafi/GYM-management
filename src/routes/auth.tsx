import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft,
  Building2, ShieldCheck, Trophy, Sparkles, KeyRound
} from "lucide-react";
import logoPng from "@/assets/logo.png";
import logintitan from "@/assets/login-titan.jpg";
import { FireSparksOverlay } from "@/components/FireSparksOverlay";
import { supabase } from "@/lib/supabase";
import { signUp, signIn } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Access Portal — ALPHA FITNESS" }] }),
  validateSearch: (search: Record<string, unknown>) =>
    z.object({
      mode: z.enum(["login", "signup", "reset-password", "forgot-password", "verify"]).optional(),
    }).parse(search),
  component: Auth,
});

function getLockoutDuration(fails: number): number {
  if (fails >= 16) return 24 * 60 * 60 * 1000; // 24 hours lockout
  if (fails >= 11) return 60 * 60 * 1000;      // 1 hour lockout
  if (fails >= 8)  return 30 * 60 * 1000;      // 30 minutes lockout
  if (fails >= 5)  return 15 * 60 * 1000;      // 15 minutes lockout
  return 0;
}

function Auth() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "verify" | "forgot-password" | "reset-password">("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Form states
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    gymName: "",
    terms: false,
    rememberMe: true,
    newPassword: "",
    confirmNewPassword: ""
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Detect recovery mode from URL hash or query parameters on mount and load
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const searchParams = typeof window !== "undefined" ? window.location.search : "";
    const isRecovery = hash.includes("type=recovery") || searchParams.includes("type=recovery");

    if (isRecovery) {
      setMode("reset-password");
    } else if (search.mode) {
      setMode(search.mode as any);
    } else {
      setMode("login");
    }
  }, [search.mode]);

  // Subscribe to password recovery state changes via Supabase Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ============================================
  // ACTION HANDLERS WITH SUPABASE AUTH API
  // ============================================

  // 1. SUBMIT LOGIN OR SIGNUP
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const email = form.email.trim();
        if (!email) {
          toast.error("Please enter your email");
          setLoading(false);
          return;
        }

        const emailKey = `alpha_fails_${email}`;
        const lockKey = `alpha_lock_${email}`;

        // Check if locked
        const lockUntil = localStorage.getItem(lockKey);
        if (lockUntil) {
          const waitTime = parseInt(lockUntil, 10) - Date.now();
          if (waitTime > 0) {
            const minutes = Math.ceil(waitTime / 60000);
            toast.error(`Too many attempts. Try again after ${minutes} minutes.`);
            setLoading(false);
            return;
          } else {
            // Lock expired, clean up
            localStorage.removeItem(lockKey);
          }
        }

        try {
          await signIn(email, form.password);

          // Clear failures on success
          localStorage.removeItem(emailKey);
          localStorage.removeItem(lockKey);

          toast.success("Welcome back! Loading console...");
          await new Promise((r) => setTimeout(r, 600));
          nav({ to: "/" });
        } catch (err: any) {
          // Increment fails
          const currentFails = parseInt(localStorage.getItem(emailKey) || "0", 10) + 1;
          localStorage.setItem(emailKey, currentFails.toString());

          const duration = getLockoutDuration(currentFails);
          if (duration > 0) {
            const lockTime = Date.now() + duration;
            localStorage.setItem(lockKey, lockTime.toString());
            const minutes = duration / 60000;
            toast.error(`Too many attempts. Try again after ${minutes} minutes.`);
          } else {
            const rawMsg = err?.message || "Invalid credentials.";
            toast.error(rawMsg);
          }
        }

      } else if (mode === "signup") {
        if (!form.name.trim()) { toast.error("Please enter your name"); setLoading(false); return; }
        if (!form.gymName.trim()) { toast.error("Please enter your gym name"); setLoading(false); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); setLoading(false); return; }
        if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); setLoading(false); return; }
        if (!form.email.trim()) { toast.error("Email is required"); setLoading(false); return; }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
          toast.error("Invalid email format");
          setLoading(false);
          return;
        }

        await signUp(form.email.trim(), form.password, form.name.trim(), form.phone);

        toast.success("Verification email sent! Please check your email then log in.");
        setMode("login");
        nav({ search: { mode: "login" } as any });
      }
    } catch (err: any) {
      // Avoid empty {} errors by always surfacing a clean string
      const rawMsg = err?.message || err?.error_description || (typeof err === "string" ? err : "");
      const msg = rawMsg || "An authentication error occurred.";
      if (msg.includes("User already registered") || msg.includes("already exists")) {
        toast.error("Account already exists. Please log in.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // 2. FORGOT PASSWORD REQUEST
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    const email = form.email.trim();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth?type=recovery",
      });
      if (error) throw error;

      toast.success("Password reset link sent! Check your inbox.");
      setMode("login");
      nav({ search: { mode: "login" } as any });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  // 3. SET NEW PASSWORD (AFTER RECOVERY LINK CLICK)
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: form.newPassword,
      });
      if (error) throw error;

      toast.success("Password updated successfully! Please log in.");

      // Call sign out to cleanly terminate any recovery session state
      await supabase.auth.signOut();

      // Clear hash and query params
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      setMode("login");
      nav({ search: { mode: "login" } as any });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save new password.");
    } finally {
      setLoading(false);
    }
  }

  // 4. GOOGLE OAUTH WITH SUPABASE
  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Google Authentication");
    }
  }

  const isRecoveryMode = mode === "reset-password";

  return (
    <div className="min-h-screen w-full bg-[#070707] text-[#f4f4f2] grid lg:grid-cols-2 lg:h-screen lg:overflow-hidden relative select-none">

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

            {/* LOGO */}
            <div className="flex justify-center mb-4">
              <img src={logoPng} alt="Alpha Fitness" className="h-20 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.45)]" />
            </div>

            {/* TITLES & HEADERS */}
            <div className="text-center mb-4">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-white uppercase tracking-tight">
                {mode === "login" && <>WELCOME <span className="text-[#ed3434]">BACK</span></>}
                {mode === "signup" && <>CREATE <span className="text-[#ed3434]">CONSOLE</span></>}
                {mode === "forgot-password" && <>RECOVER <span className="text-[#ed3434]">ACCESS</span></>}
                {mode === "reset-password" && <>RESET <span className="text-[#ed3434]">PASSWORD</span></>}
              </h1>
              <p className="text-[#8d8d8d] text-[12px] mt-0.5">
                {mode === "login" && "Enter email and password to log in"}
                {mode === "signup" && "Establish your gym operating system"}
                {mode === "forgot-password" && "Request password reset code"}
                {mode === "reset-password" && "Establish a secure new password"}
              </p>
            </div>

            {/* MAIN SWITCHER (ONLY FOR LOGIN / SIGNUP) */}
            {!isRecoveryMode && (mode === "login" || mode === "signup") && (
              <div className="flex gap-1 bg-black/50 rounded-xl p-1 mb-3.5">
                <button
                  onClick={() => { setMode("login"); nav({ search: { mode: "login" } as any }); }}
                  className={"flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer uppercase tracking-wider " +
                    (mode === "login" ? "text-white" : "text-[#8d8d8d] hover:text-white")}
                  style={mode === "login" ? { background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" } : {}}
                >
                  Login
                </button>
                <button
                  onClick={() => { setMode("signup"); nav({ search: { mode: "signup" } as any }); }}
                  className={"flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer uppercase tracking-wider " +
                    (mode === "signup" ? "text-white" : "text-[#8d8d8d] hover:text-white")}
                  style={mode === "signup" ? { background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" } : {}}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* ==================== LOGIN / SIGNUP PASSWORD FORMS ==================== */}
            {mode !== "forgot-password" && mode !== "reset-password" && (
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
                        placeholder="Choose Password (min 6)"
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

                    <div className="relative">
                      <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) => set("confirmPassword", e.target.value)}
                        placeholder="Confirm Password"
                        className={inp + " pr-9"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666] hover:text-white cursor-pointer bg-transparent border-0"
                      >
                        {showConfirmPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
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
                        onClick={() => {
                          setMode("forgot-password");
                          nav({ search: { mode: "forgot-password" } as any });
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

            {/* ==================== FORGOT PASSWORD VIEW ==================== */}
            {mode === "forgot-password" && (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="relative">
                  <Mail className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="Enter registered Email"
                    className={inp}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm"
                  style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                >
                  {loading ? "Sending link..." : "Send Reset Link"}
                </button>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      nav({ search: { mode: "login" } as any });
                    }}
                    className="text-xs text-[#8d8d8d] hover:text-white underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    <ArrowLeft className="size-3" /> Back to Login
                  </button>
                </div>
              </form>
            )}

            {/* ==================== RESET PASSWORD VIEW (SET NEW PASSWORD) ==================== */}
            {mode === "reset-password" && (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="relative">
                  <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(e) => set("newPassword", e.target.value)}
                    placeholder="New Password (min 6)"
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

                <div className="relative">
                  <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={form.confirmNewPassword}
                    onChange={(e) => set("confirmNewPassword", e.target.value)}
                    placeholder="Confirm New Password"
                    className={inp + " pr-9"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666] hover:text-white cursor-pointer bg-transparent border-0"
                  >
                    {showConfirmPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm"
                  style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                >
                  {loading ? "Updating password..." : "Update Password"}
                </button>
              </form>
            )}

            {/* GOOGLE / OR BLOCK (ONLY RENDER IN LOGIN OR SIGNUP MODE IF NOT IN RECOVERY) */}
            {!isRecoveryMode && (mode === "login" || mode === "signup") && (
              <>
                <div className="relative flex items-center justify-center my-3.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative px-3 text-[10px] uppercase tracking-widest text-[#666] font-bold" style={{ background: "#1a1a1a" }}>
                    OR
                  </span>
                </div>

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
              </>
            )}

            {/* Footer switcher links (only if not reset-password) */}
            {!isRecoveryMode && mode !== "reset-password" && (
              <div className="text-center mt-4 text-[12px] text-[#8d8d8d]">
                {mode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("signup");
                        nav({ search: { mode: "signup" } as any });
                      }}
                      className="text-[#ed3434] hover:underline font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("login");
                        nav({ search: { mode: "login" } as any });
                      }}
                      className="text-[#ed3434] hover:underline font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            )}
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

          {/* Do not show Return link in recovery mode to keep focus isolated */}
          {!isRecoveryMode && (
            <div className="text-center mt-3">
              <Link to="/" className="text-[11px] text-[#666] hover:text-white font-medium transition inline-flex items-center gap-1.5 uppercase tracking-wider">
                <ArrowLeft className="size-3.5" /> Return to Main Entrance
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = "w-full pl-9 pr-3 py-2.5 bg-[#1c1c1c] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#6f0000]/60 border border-white/8 text-white placeholder:text-[#555] transition-all";
const inpCompact = "w-full pl-8 pr-2.5 py-2.5 bg-[#1c1c1c] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#6f0000]/60 border border-white/8 text-white placeholder:text-[#555] transition-all";
