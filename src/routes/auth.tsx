import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import {
  Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft,
  Building2, ShieldCheck, Trophy, Sparkles, KeyRound
} from "lucide-react";
import logoPng from "@/assets/logo.png";
import logintitan from "@/assets/login-titan.jpg";
import { FireSparksOverlay } from "@/components/FireSparksOverlay";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Access Portal — ALPHA FITNESS" }] }),
  validateSearch: (search: Record<string, unknown>) =>
    z.object({
      mode: z.enum(["login", "signup", "reset-password", "forgot-password", "verify"]).optional(),
    }).parse(search),
  component: Auth,
});

function Auth() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "verify" | "forgot-password" | "reset-password">("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const { signIn, isLoaded: isSignInLoaded, setActive: setActiveSignIn } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded, setActive: setActiveSignUp } = useSignUp();

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
    resetCode: "",
    newPassword: "",
    confirmNewPassword: ""
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Synchronize initial component mode
  useEffect(() => {
    if (search.mode) {
      setMode(search.mode as any);
    } else {
      setMode("login");
    }
  }, [search.mode]);

  // ============================================
  // ACTION HANDLERS WITH CLERK HEADLESS API
  // ============================================

  // 1. SUBMIT LOGIN OR SIGNUP
  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "login") {
      if (!isSignInLoaded) {
        toast.error("Sign-in system is still booting. Please wait a moment.");
        return;
      }

      setLoading(true);
      try {
        const email = form.email.trim();
        if (!email) {
          toast.error("Please enter your email");
          setLoading(false);
          return;
        }

        // Initialize sign in with password using Clerk
        const result = await signIn.create({
          identifier: email,
          password: form.password,
        });

        if (result.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          toast.success("Welcome back! Loading console...");
          await new Promise((r) => setTimeout(r, 600));
          nav({ to: "/" });
        } else {
          toast.error(`Authentication incomplete: status is ${result.status}`);
        }
      } catch (err: any) {
        const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "An authentication error occurred.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }

    } else if (mode === "signup") {
      if (!isSignUpLoaded) {
        toast.error("Sign-up system is still booting. Please wait a moment.");
        return;
      }

      setLoading(true);
      try {
        if (!form.name.trim()) { toast.error("Please enter your name"); setLoading(false); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); setLoading(false); return; }
        if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); setLoading(false); return; }
        if (!form.email.trim()) { toast.error("Email is required"); setLoading(false); return; }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
          toast.error("Invalid email format");
          setLoading(false);
          return;
        }

        // Initialize SignUp through Clerk
        await signUp.create({
          emailAddress: form.email.trim(),
          password: form.password,
          firstName: form.name.split(" ")[0] || "",
          lastName: form.name.split(" ").slice(1).join(" ") || "",
        });

        // Send email verification code
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });

        setMode("verify");
        nav({ search: { mode: "verify" } as any });
        toast.success("Verification code sent! Please check your email.");
      } catch (err: any) {
        const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "An authentication error occurred.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
  }

  // 2. VERIFY SIGNUP EMAIL CODE
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignUpLoaded) {
      toast.error("Authentication system is booting. Please wait a moment.");
      return;
    }
    if (!form.resetCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: form.resetCode.trim(),
      });

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
        toast.success("Verification successful!");
        nav({ to: "/onboarding" });
      } else {
        toast.error(`Signup status: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Invalid or expired code.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // 3. FORGOT PASSWORD REQUEST
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignInLoaded) {
      toast.error("Sign-in system is booting. Please wait a moment.");
      return;
    }

    const email = form.email.trim();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        identifier: email,
      });

      await signIn.resetPasswordEmailCode.sendCode();

      toast.success("Password reset code sent! Check your inbox.");
      setMode("reset-password");
      nav({ search: { mode: "reset-password" } as any });
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to send reset code.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // 4. SET NEW PASSWORD (AFTER RECOVERY LINK CODE)
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignInLoaded) {
      toast.error("Sign-in system is booting. Please wait a moment.");
      return;
    }

    const email = form.email.trim();
    if (!email) {
      toast.error("Please enter your registered email address");
      return;
    }
    if (!form.resetCode.trim()) {
      toast.error("Please enter the reset code sent to your email");
      return;
    }
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
      // Robust Session Gate: If no active sign-in session is found for this email, establish it first
      if (!signIn.identifier || signIn.identifier !== email) {
        await signIn.create({
          identifier: email,
        });
      }

      await signIn.resetPasswordEmailCode.verifyCode({
        code: form.resetCode.trim(),
      });

      const submitResult = await signIn.resetPasswordEmailCode.submitPassword({
        password: form.newPassword,
        signOutOfOtherSessions: true,
      });

      if (submitResult.status === "complete") {
        toast.success("Password updated successfully! Please log in.");
        setMode("login");
        nav({ search: { mode: "login" } as any });
      } else {
        toast.error(`Reset incomplete: status is ${submitResult.status}`);
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to reset password.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // 5. GOOGLE OAUTH WITH CLERK
  async function handleGoogleLogin() {
    if (!isSignInLoaded) {
      toast.error("Sign-in system is booting. Please wait a moment.");
      return;
    }

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/auth",
        redirectUrlComplete: window.location.origin + "/",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Google Authentication");
    }
  }

  // ============================================
  // UI RENDERING VIEWS
  // ============================================

  // VERIFY MODE VIEW (OTP CHECK CODE VIEW)
  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-[#070707] text-[#f4f4f2] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-[#111]/90 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <div className="size-16 bg-[#ed3434]/10 rounded-xl grid place-items-center mx-auto mb-5">
            <Mail className="size-8 text-[#ed3434] animate-pulse" />
          </div>
          <h1 className="text-2xl font-heading mb-2 font-bold text-white uppercase tracking-tight">Verify your email</h1>
          <p className="text-[#8d8d8d] mb-1 text-sm">
            We have sent a verification code to your email <strong className="text-white">{form.email}</strong>
          </p>
          <p className="text-sm text-[#8d8d8d] mb-6">
            Enter the verification code below to authorize your gym console.
          </p>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="relative">
              <KeyRound className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
              <input
                type="text"
                placeholder="6-digit verification code"
                value={form.resetCode}
                onChange={(e) => set("resetCode", e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-[#1c1c1c] rounded-xl text-sm outline-none border border-white/8 text-white placeholder:text-[#555]"
                required
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !isSignUpLoaded}
                className="w-full py-3 text-white rounded-xl font-bold transition cursor-pointer uppercase tracking-wider text-xs bg-gradient-to-r from-red-800 to-red-600 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  nav({ search: { mode: "login" } as any });
                }}
                className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold transition cursor-pointer uppercase tracking-wider text-[11px]"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
            {(mode === "login" || mode === "signup") && (
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
                  disabled={loading || (mode === "login" ? !isSignInLoaded : !isSignUpLoaded)}
                  className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm active:scale-[0.98]"
                  style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                >
                  {loading
                    ? "Authorizing..."
                    : mode === "login"
                      ? (isSignInLoaded ? "LOGIN" : "Loading...")
                      : (isSignUpLoaded ? "Create My Console" : "Loading...")}
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
                  disabled={loading || !isSignInLoaded}
                  className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm"
                  style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                >
                  {loading ? "Sending link..." : (isSignInLoaded ? "Send Reset Code" : "Loading...")}
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
                  <Mail className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="Registered Email"
                    className={inp}
                    required
                  />
                </div>

                <div className="relative">
                  <KeyRound className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="text"
                    value={form.resetCode}
                    onChange={(e) => set("resetCode", e.target.value)}
                    placeholder="Reset Code from Email"
                    className={inp}
                    required
                  />
                </div>

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
                  disabled={loading || !isSignInLoaded}
                  className="w-full py-2.5 text-white font-extrabold rounded-xl transition disabled:opacity-60 cursor-pointer uppercase tracking-widest text-sm"
                  style={{ background: "linear-gradient(to right, rgb(111, 0, 0), rgb(186, 0, 0))" }}
                >
                  {loading ? "Updating password..." : (isSignInLoaded ? "Update Password" : "Loading...")}
                </button>
              </form>
            )}

            {/* GOOGLE / OR BLOCK (ONLY RENDER IN LOGIN OR SIGNUP MODE) */}
            {(mode === "login" || mode === "signup") && (
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
                  disabled={!isSignInLoaded}
                  className="w-full h-10 rounded-xl bg-white text-black text-sm font-bold flex items-center justify-center gap-2 transition hover:bg-gray-100 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  <svg className="size-4.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isSignInLoaded ? "Login with Google" : "Loading..."}
                </button>
              </>
            )}

            {/* Footer switcher links (only if not reset-password) */}
            {mode !== "reset-password" && (
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
