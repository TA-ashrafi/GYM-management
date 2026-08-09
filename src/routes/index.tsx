import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Users, TrendingUp, AlertTriangle, Wallet, CheckCircle2,
  Activity, ArrowUpRight, Bell, Clock, Radio, GripVertical, Eye, EyeOff, RotateCcw, X, CreditCard, Save,
  Dumbbell, MessageCircle, ShoppingBag, BarChart3, FileText, Zap, ArrowRight, Check, Star, Shield, Award, Flame, Menu, ShieldCheck, Trophy, Sparkles
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  useGym, daysUntil, money, gym,
  DEFAULT_LAYOUT, type WidgetId, type PlanType
} from "@/lib/gym-store";
import { supabase, getActiveBranchId } from "@/lib/supabase";
import { toast } from "sonner";
import logo2 from "@/assets/logo2.png";

// Load athlete photos safely
import grip from "@/assets/grip.jpg";
import pose1 from "@/assets/pose1.png";
import m4 from "@/assets/m4.jpg";

import { FireSparksOverlay } from "@/components/FireSparksOverlay";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALPHA FITNESS — Your GYM Operating System" },
      { name: "description", content: "RFID attendance, ghost detection, WhatsApp reminders, supplement POS, analytics — the complete OS for modern gym networks." },
      { property: "og:title", content: "ALPHA FITNESS — Your GYM Operating System" },
      { property: "og:description", content: "Eliminate scan bypass. Track every member, every transaction, and every check-in with high-end analytics." },
    ],
  }),
  component: Home,
});

function Home() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-12 bg-[#ed3434]/10 rounded-lg border border-[#ed3434]/30 grid place-items-center animate-pulse mx-auto">
            <Dumbbell className="size-6 text-[#ed3434]" />
          </div>
          <p className="text-[10px] text-[#8d8d8d] uppercase tracking-[0.2em] font-bold">ALPHA FITNESS</p>
        </div>
      </div>
    );
  }

  return user ? <AppShell><Dashboard /></AppShell> : <MarketingPortal />;
}

/* =========================================================================
   MARKETING PORTAL (12 SECTIONS, PREMIUM DARK THEME, NO UNICODE EMOJIS)
   ========================================================================= */

function MarketingPortal() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#070707] text-[#f4f4f2] selection:bg-[#ed3434] selection:text-white overflow-x-hidden relative font-sans leading-relaxed">

      {/* High-performance optimized canvas fire sparks backdrop (no lagging smoke effect) */}
      <FireSparksOverlay intensity={35} color="red" speed={0.8} />

      {/* Background radial effects */}
      <div className="absolute top-0 left-0 right-0 h-[800px] bg-[radial-gradient(circle_at_top,rgba(237,52,52,0.08),transparent_70%)] pointer-events-none z-0" />
      <div className="absolute top-1/3 left-1/4 size-[500px] bg-[#ed3434]/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 size-[600px] bg-[#ed3434]/3 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* SECTION 1: Fixed Nav Bar */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-[#070707]/90 backdrop-blur-md border-b border-[#242424] z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 relative z-10 hover:opacity-90 transition">
            <div>
              <div className="text-2xl font-black tracking-tight text-white uppercase leading-none">ALPHA <span className="text-[#ed3434]">FITNESS</span></div>
              <div className="text-[8px] uppercase tracking-[0.25em] text-[#8d8d8d] font-bold mt-1">Your Gym Operating System</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-[#8d8d8d]">
            <a href="#home" className="hover:text-white transition-colors py-1 hover:border-b-2 hover:border-[#ed3434] transition-all">Home</a>
            <a href="#features" className="hover:text-white transition-colors py-1 hover:border-b-2 hover:border-[#ed3434] transition-all">Features</a>
            <a href="#testimonials" className="hover:text-white transition-colors py-1 hover:border-b-2 hover:border-[#ed3434] transition-all">Testimonials</a>
            <a href="#pricing" className="hover:text-white transition-colors py-1 hover:border-b-2 hover:border-[#ed3434] transition-all">Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors py-1 hover:border-b-2 hover:border-[#ed3434] transition-all">Contact</a>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link to="/auth" search={{ mode: "login" }} className="text-xs font-bold uppercase tracking-widest text-[#8d8d8d] hover:text-white transition">
              Login
            </Link>
            <Link to="/auth" search={{ mode: "signup" }} className="px-5 py-2.5 bg-[#ed3434] hover:bg-[#ff4b4b] text-white rounded-lg text-xs font-extrabold uppercase tracking-widest transition shadow-[0_4px_15px_rgba(237,52,52,0.2)]">
              Sign Up
            </Link>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden size-10 rounded border border-[#242424] bg-[#101010] text-white grid place-items-center cursor-pointer">
            <Menu className="size-5" />
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenu && (
          <div className="lg:hidden absolute top-20 left-0 right-0 bg-[#101010] border-b border-[#242424] p-6 flex flex-col gap-4 animate-fade-in z-50">
            <a href="#home" onClick={() => setMobileMenu(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#ed3434] transition">Home</a>
            <a href="#features" onClick={() => setMobileMenu(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#ed3434] transition">Features</a>
            <a href="#testimonials" onClick={() => setMobileMenu(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#ed3434] transition">Testimonials</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#ed3434] transition">Pricing</a>
            <a href="#contact" onClick={() => setMobileMenu(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#ed3434] transition">Contact</a>
            <div className="h-px bg-[#242424] my-2" />
            <Link to="/auth" search={{ mode: "login" }} className="text-xs font-bold uppercase tracking-widest text-center py-2 border border-[#242424] rounded-lg">Login</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="text-xs font-bold uppercase tracking-widest text-center py-2 bg-[#ed3434] text-white rounded-lg">Sign Up</Link>
          </div>
        )}
      </header>

      {/* SECTION 2: HERO */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden border-b border-[#242424]" id="home">
        <div className="absolute right-[6%] top-[-10%] w-[28%] h-[125%] skew-slab opacity-45 pointer-events-none z-0 hidden lg:block" />
        {/* Layer athlete PNG on top of text (z-20) */}
        <img src={pose1} alt="Athlete back detail" className="absolute right-[-1%] bottom-[-1%] h-[96vh] max-w-[67vw] object-contain object-right-bottom filter contrast-110 brightness-75 drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] z-20 hidden lg:block pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-6 text-left">
              <div className="inline-flex items-center gap-2">
                <span className="w-10 h-px bg-[#ed3434]" />
                <span className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">Your Gym Operating System</span>
              </div>

              {/* Restructured Muscle Mastery Alpha headline */}
              <h1 className="text-white uppercase leading-[0.82] tracking-tighter select-none font-black" style={{ fontSize: "clamp(64px, 9.5vw, 150px)" }}>
                <span className="text-[#ed3434]">M</span>uscle<br />
                Mastery<br />
                Alpha
              </h1>
              <p className="text-[#8d8d8d] text-base leading-relaxed max-w-xl font-medium pt-2">
                Train with purpose. Build relentless strength. ALPHA FITNESS is a performance-driven gym management platform designed to eliminate fingerprint bypass, track RFID attendance, automate WhatsApp communication, and deliver absolute clarity over your gym console.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-4">
                {/* LAUNCH CONSOLE DASHBOARD button redirecting directly to login */}
                <Link to="/auth" search={{ mode: "login" }} className="cta group">
                  LAUNCH CONSOLE DASHBOARD
                  <span className="size-[74px] rounded-full border border-[#ed3434] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-[#ed3434] group-hover:text-white text-[#ed3434] font-black text-xl">
                    ↗
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Far Left social rail with un-filled outline circular borders */}
        <div className="absolute left-6 bottom-1/4 flex flex-col gap-4 text-xs font-semibold uppercase tracking-widest text-[#8d8d8d] z-20 hidden md:flex">
          <div className="flex flex-col gap-3 border border-[#242424] rounded-full px-2.5 py-5 items-center bg-transparent">
            <a href="#" className="hover:text-white transition">IN</a>
            <a href="#" className="hover:text-white transition">IG</a>
            <a href="#" className="hover:text-white transition">FB</a>
          </div>
        </div>

        {/* Bottom Left scroll text - oriented vertically */}
        <div className="absolute left-10 bottom-6 flex flex-col items-center gap-4 text-[9px] uppercase tracking-[0.25em] text-[#8d8d8d] font-bold z-20 select-none">
          <span className="size-2 rounded-full bg-[#ed3434] block animate-pulse" />
          <span className="rotate-90 origin-left translate-x-1 whitespace-nowrap">SCROLL DOWN -----</span>
        </div>
      </section>

      {/* SECTION 3: Marquee strip */}
      <div className="marquee border-y border-[#242424] py-4 bg-[#0a0a0a]">
        <div className="marquee-track text-[#8d8d8d] font-heading text-xl uppercase tracking-wider flex gap-8">
          <span>No Excuses <span className="text-[#ed3434]">✦</span> Just Work <span className="text-[#ed3434]">✦</span> Build Your Alpha</span>
          <span>No Excuses <span className="text-[#ed3434]">✦</span> Just Work <span className="text-[#ed3434]">✦</span> Build Your Alpha</span>
          <span>No Excuses <span className="text-[#ed3434]">✦</span> Just Work <span className="text-[#ed3434]">✦</span> Build Your Alpha</span>
          <span>No Excuses <span className="text-[#ed3434]">✦</span> Just Work <span className="text-[#ed3434]">✦</span> Build Your Alpha</span>
        </div>
      </div>

      {/* SECTION 4: CONSOLE */}
      <section className="py-24 max-w-7xl mx-auto px-6" id="features">
        <div className="grid lg:grid-cols-12 gap-8 items-start mb-16">
          <div className="lg:col-span-8 space-y-4">
            <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">High-Performance Gym Management ERP</div>
            <h2 className="text-white uppercase leading-[0.86] tracking-tight font-heading text-4xl sm:text-6xl">
              Control Your Gym Network Like A <span className="text-[#ed3434]">Sovereign</span>
            </h2>
            <p className="text-[#8d8d8d] text-sm sm:text-base max-w-2xl leading-relaxed">
              Eliminate fingerprint bypass completely. ALPHA FITNESS provides direct real-time RFID integration, zero-click automated WhatsApp alerts, high-margin supplement POS software, and instant multi-branch profit P&L calculations.
            </p>
            <div className="flex gap-4 pt-4">
              <Link to="/auth" search={{ mode: "login" }} className="px-6 py-3.5 bg-[#ed3434] hover:bg-[#ff4b4b] text-white rounded-lg text-xs font-bold uppercase tracking-widest transition">
                Launch Console Dashboard
              </Link>
              <a href="#pricing" className="px-6 py-3.5 bg-[#101010] border border-[#242424] hover:border-[#ed3434]/40 text-[#f4f4f2] rounded-lg text-xs font-bold uppercase tracking-widest transition">
                Explore Features
              </a>
            </div>
          </div>
        </div>

        {/* Dashboard mock card */}
        <div className="bg-[#101010] border border-[#242424] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#242424] pb-4">
            <div className="flex items-center gap-2">
              <span className="size-2 bg-[#ed3434] rounded-full animate-ping" />
              <span className="text-[10px] uppercase tracking-widest text-[#8d8d8d] font-bold">REAL-TIME MONITOR</span>
            </div>
            <span className="px-3 py-1 bg-[#ed3434]/10 border border-[#ed3434]/20 rounded-full text-[9px] text-[#ed3434] font-extrabold uppercase tracking-wider">
              CONSOLE READY
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active Roster", value: "382", desc: "active members" },
              { label: "Check-ins Today", value: "114", desc: "scanned logs" },
              { label: "Bypass Flagged", value: "0", desc: "perfect regular rosters" },
              { label: "Monthly Revenue", value: "₹2.48L", desc: "net collected profits" },
            ].map((kpi) => (
              <div key={kpi.label} className="p-4 bg-[#070707] border border-[#242424] rounded-xl text-left">
                <span className="text-[9px] uppercase tracking-wider text-[#8d8d8d] font-bold">{kpi.label}</span>
                <p className="text-2xl sm:text-3xl font-heading font-black text-white mt-1 uppercase">{kpi.value}</p>
                <span className="text-[9px] text-[#ed3434] uppercase font-bold tracking-wider mt-2 block">{kpi.desc}</span>
              </div>
            ))}
          </div>

          {/* Bar chart mockup */}
          <div className="pt-4 space-y-2">
            <span className="text-[9px] uppercase tracking-widest text-[#8d8d8d] font-bold block">LIVE FOOTFALL TREND 6AM–10PM</span>
            <div className="flex items-end gap-2 h-24 pt-4 border-t border-[#242424]">
              {[25, 40, 55, 70, 85, 95, 80, 45, 30, 50, 75, 90, 65, 35].map((val, idx) => (
                <div key={idx} className="flex-1 bg-gradient-to-t from-[#ed3434]/40 to-[#ed3434] rounded-t" style={{ height: `${val}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: ABOUT "Built Different" (Refactored to cover box and use custom stats) */}
      <section className="py-24 bg-[#101010] border-y border-[#242424]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="logo-card bg-gradient-to-br from-[#171717] to-[#070707] min-h-[420px] rounded-2xl border border-[#242424] overflow-hidden flex items-center justify-center relative">
            <img src={grip} alt="Alpha Standard Logo" className="w-full h-full object-cover opacity-60" />
            <span className="absolute text-[11px] uppercase tracking-widest text-[#ed3434] font-bold bottom-6 z-10">The Alpha Standard</span>
          </div>
          <div className="space-y-6 text-left">
            <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">The Alpha Standard</div>
            <h2 className="text-white uppercase leading-[0.86] tracking-tight font-heading text-4xl sm:text-5xl">
              BUILT<br />DIFFERENT
            </h2>
            <p className="text-[#8d8d8d] text-sm leading-relaxed">
              ALPHA FITNESS is a cohesive operations engine developed to bring absolute efficiency, clarity, and design beauty to gym management. Every feature from real-time member records to supplement store profit margins functions offline-first.
            </p>
            <div className="stats border-t border-[#242424] pt-6 flex flex-row flex-wrap gap-8 items-center">
              {[
                { no: "01", text: "MINDSET" },
                { no: "02", text: "STRENGTH" },
                { no: "03", text: "RESULT" }
              ].map((x) => (
                <div key={x.no} className="flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-black text-[#ed3434]">{x.no}</span>
                  <span className="text-sm font-bold text-white uppercase tracking-wider">{x.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: PROGRAMS */}
      <section className="py-24 max-w-7xl mx-auto px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-4 mb-16 text-left sm:text-center">
          <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">Choose Your Path</div>
          <h2 className="text-white uppercase leading-[0.86] tracking-tight font-heading text-4xl sm:text-6xl">
            TRAIN WITH PURPOSE
          </h2>
          <p className="text-[#8d8d8d] text-sm sm:text-base">
            Focused programs built to improve strength, physique, and overall operational performance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { num: "01", name: "Strength", desc: "Progressive training built around compound movements, controlled volume and serious strength gains." },
            { num: "02", name: "Hypertrophy", desc: "Structured muscle-building sessions designed for shape, density and balanced development." },
            { num: "03", name: "Conditioning", desc: "Build work capacity, athletic movement and the engine to perform when the session gets hard." }
          ].map((program) => (
            <article key={program.num} className="bg-[#101010] border border-[#242424] p-8 rounded-2xl text-left relative overflow-hidden rise min-h-[300px] flex flex-col justify-between">
              <span className="font-heading text-[80px] font-black text-[#1a1a1a] absolute right-6 top-2 leading-none select-none z-0">{program.num}</span>
              <div className="z-10 mt-12 space-y-3">
                <h3 className="font-heading text-2xl font-bold text-white uppercase">{program.name}</h3>
                <p className="text-xs text-[#8d8d8d] leading-relaxed max-w-[240px]">{program.desc}</p>
              </div>
              <span className="text-[10px] text-[#ed3434] uppercase tracking-wider font-bold block pt-6 z-10">↗ View program</span>
            </article>
          ))}
        </div>
      </section>

      {/* SECTION 7: PERFORMANCE (Refactored to Portrait covered image) */}
      <section className="py-24 bg-[#101010] border-y border-[#242424]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl border border-[#242424] overflow-hidden h-[620px] max-w-[420px] mx-auto w-full relative z-10">
            <img src={m4} alt="Barbell training portrait detail" className="w-full h-full object-cover filter contrast-110 brightness-75" />
          </div>
          <div className="space-y-6 text-left">
            <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">Earn Your Reflection</div>
            <h2 className="text-white uppercase leading-[0.9] tracking-tight font-heading text-4xl sm:text-6xl space-y-1">
              <span>DISCIPLINE</span><br />
              <span>CREATES</span><br />
              <span className="text-[#ed3434]">POWER.</span>
            </h2>
            <p className="text-[#8d8d8d] text-sm leading-relaxed">
              Motivation gets you started. Discipline keeps you moving. At ALPHA FITNESS, we build systems that turn effort into a stronger body and a stronger mindset.
            </p>
            <div className="bullets grid grid-cols-2 gap-4 pt-4 border-t border-[#242424]">
              {[
                { num: "01", title: "Progressive", desc: "Train with a plan that evolves with you." },
                { num: "02", title: "Focused", desc: "Remove distractions. Attack the work." },
                { num: "03", title: "Measurable", desc: "Track the numbers. Own the progress." },
                { num: "04", title: "Relentless", desc: "Show up when it matters most." }
              ].map((b) => (
                <div key={b.num} className="space-y-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">{b.num} — {b.title}</span>
                  <p className="text-[11px] text-[#8d8d8d] leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: FEATURES */}
      <section className="py-24 max-w-7xl mx-auto px-6 text-center" id="features-grid">
        <div className="max-w-3xl mx-auto space-y-4 mb-16 text-left sm:text-center">
          <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">High Performance Suite</div>
          <h2 className="text-white uppercase leading-[0.86] tracking-tight font-heading text-4xl sm:text-6xl">
            Engineered To Drive Operational Velocity
          </h2>
          <p className="text-[#8d8d8d] text-sm sm:text-base">
            All modules compile instantly, run offline-first, and store data securely with Supabase database integrations.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { num: "01", name: "RFID Attendance", desc: "Equip members with secure RFID access cards. Detect scan mismatches instantly and eliminate fingerprint bypass." },
            { num: "02", name: "Ghost Detection", desc: "Identify active members who have not checked in for over 4 days. Intervene proactively to reduce churn." },
            { num: "03", name: "WhatsApp Integration", desc: "Dispatch automatic reminders for plan expirations, unpaid dues, and birthdays directly with a single click." },
            { num: "04", name: "Advanced CRM Console", desc: "Manage detailed member profiles, medical records, physical progression metrics, and emergency contacts easily." },
            { num: "05", name: "Supplement POS Tracker", desc: "Track protein powder sales, snacks, and gear inventory with automated cost-margin profit logs built right into the platform." },
            { num: "06", name: "Deep Real-Time Analytics", desc: "Visualize hourly footfall peaks, active member counts, and monthly sales trends on live interactive dashboards." },
            { num: "07", name: "Expenses & Cash Flow P&L", desc: "Monitor recurring expenses like rent, staff salaries, and utility bills. Auto-generate comprehensive monthly net income reports." },
            { num: "08", name: "Crowd Control Slots", desc: "Assign members to custom capacity slots and shifts to distribute peak-hour attendance seamlessly." },
            { num: "09", name: "A4 Print-Ready Reports", desc: "Generate professional progress cards, physical assessments, and attendance logs formatted perfectly for paper printing." }
          ].map((f) => (
            <div key={f.num} className="p-8 bg-[#101010] border border-[#242424] rounded-2xl text-left rise min-h-[220px]">
              <span className="text-[10px] uppercase font-bold text-[#ed3434] tracking-widest">{f.num}</span>
              <h3 className="font-heading text-xl font-bold text-white uppercase tracking-tight mt-2">{f.name}</h3>
              <p className="text-xs text-[#8d8d8d] mt-2 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 9: TESTIMONIALS */}
      <section className="py-24 bg-[#101010] border-y border-[#242424]" id="testimonials">
        <div className="max-w-7xl mx-auto px-6 text-left">
          <div className="max-w-2xl space-y-4 mb-16">
            <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">Owner Endorsements</div>
            <h2 className="text-white uppercase leading-[0.86] tracking-tight font-heading text-4xl sm:text-6xl">
              Loved By Modern Gym Owners
            </h2>
            <p className="text-[#8d8d8d] text-sm">
              See how actual athletic clubs and fitness complexes use ALPHA FITNESS to optimize staff time slots, reclaim lost membership revenues, and drive retail supplement store inventory profits.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                quote: "ALPHA FITNESS completely revamped how we track member entries. Our fingerprint scanner had 30% bypass, but RFID solved it instantly.",
                author: "Rajesh Kumar",
                role: "Owner, Iron Legacy Gym"
              },
              {
                quote: "The monthly P&L and supplement profit tracking are unmatched. I can see my actual margins with zero manual math.",
                author: "Vikram Malhotra",
                role: "Director, Alpha Zone Club"
              }
            ].map((q) => (
              <div key={q.author} className="p-8 bg-[#070707] border border-[#242424] rounded-2xl relative text-left">
                <span className="absolute top-4 right-4 text-[#ed3434] text-5xl font-heading leading-none select-none font-bold">“</span>
                <p className="text-xs sm:text-sm text-[#8d8d8d] italic leading-relaxed font-medium relative z-10">
                  {q.quote}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-[#ed3434]/10 text-[#ed3434] grid place-items-center font-bold text-xs uppercase">
                    {q.author[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{q.author}</p>
                    <p className="text-[10px] text-[#8d8d8d] font-semibold uppercase tracking-wider">{q.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10: PRICING */}
      <section className="py-24 max-w-7xl mx-auto px-6 text-center" id="pricing">
        <div className="max-w-3xl mx-auto space-y-4 mb-16 text-left sm:text-center">
          <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">Fair Enterprise Pricing</div>
          <h2 className="text-white uppercase leading-[0.86] tracking-tight font-heading text-4xl sm:text-6xl">
            Select Your System Tier
          </h2>
          <p className="text-[#8d8d8d] text-sm sm:text-base">
            Choose a plan that fits your facility. Scale branches and features as your community expands.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {[
            {
              name: "Bronze Plan",
              price: "1,500",
              period: "month",
              desc: "Essential features for managing a single-location gym.",
              features: ["Up to 200 members active", "RFID Scanner Integration", "Daily Attendance Logger", "Standard Dashboard Reports", "Email Sign-In Authentication"],
              cta: "Get Started",
              popular: false
            },
            {
              name: "Silver Pro Plan",
              price: "4,000",
              period: "quarter",
              desc: "Complete operational control with automated reminders.",
              features: ["Unlimited Active Members", "RFID Attendance + Live Sync", "Automated WhatsApp Webhooks", "Ghost Detection & Churn Alert", "Full Supplement POS Console", "A4 PDF Report Generation"],
              cta: "Go Pro",
              popular: true
            },
            {
              name: "Gold Executive Plan",
              price: "13,000",
              period: "year",
              desc: "Ultimate performance tier with multi-branch management.",
              features: ["All Silver Pro features", "Multi-Branch Network Support", "Physical Measurement Progress", "Custom 6-Day Workout Builder", "Advanced Cash Flow P&L Reports", "Dedicated Developer Support"],
              cta: "Join the Elite",
              popular: false
            }
          ].map((p) => (
            <div
              key={p.name}
              className={
                "p-8 sm:p-10 rounded-2xl border flex flex-col justify-between text-left transition-all duration-300 relative overflow-hidden " +
                (p.popular
                  ? "border-[#ed3434] bg-gradient-to-br from-[#ed3434]/5 via-[#101010] to-[#101010] shadow-[0_10px_30px_rgba(237,52,52,0.15)] scale-[1.02]"
                  : "border-[#242424] bg-[#101010]/50")
              }
            >
              {p.popular && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-[#ed3434] text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                  POPULAR CHOICE
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-widest text-[#8d8d8d] font-extrabold">{p.name}</p>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl sm:text-5xl font-heading font-black">₹{p.price}</span>
                  <span className="text-xs text-[#8d8d8d] font-bold uppercase tracking-wider">/{p.period}</span>
                </div>
                <p className="mt-3 text-xs text-[#8d8d8d] font-medium leading-relaxed">{p.desc}</p>

                <div className="my-8 border-t border-[#242424]" />

                <ul className="space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#8d8d8d] font-semibold">
                      <Check className="size-4 text-[#ed3434] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className={
                    "w-full py-3.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300 block text-center " +
                    (p.popular
                      ? "bg-[#ed3434] text-white hover:scale-[1.02] shadow-[0_4px_15px_rgba(237,52,52,0.3)]"
                      : "bg-[#202020] text-[#f4f4f2] hover:bg-[#252525] border border-[#242424]")
                  }
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 10.5: THE PROBLEM (New Section) */}
      <section className="py-24 bg-[#0a0a0a] border-y border-[#242424]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start text-left">

          {/* Left Column: The Problem */}
          <div className="space-y-6">
            <div className="text-[#ed3434] text-xs font-bold uppercase tracking-[0.25em]">The Security Problem</div>
            <h2 className="text-white uppercase leading-[0.9] tracking-tight font-heading text-4xl sm:text-5xl">
              FINGERPRINT SCANNERS LIE.
            </h2>
            <p className="text-[#8d8d8d] text-sm leading-relaxed max-w-lg">
              Biometric bypass is incredibly common. When a membership expires, users simply stop scanning or avoid verification entirely. If the gym owner is absent for days, unauthorized entrances go completely undetected. ALPHA FITNESS catches these discrepancies instantly.
            </p>
            <div className="space-y-3 pt-4 border-t border-[#242424] max-w-md">
              {[
                { label: "4+ days with no scan", action: "Auto Ghost Flag" },
                { label: "7 days to expiry", action: "WhatsApp Nudge" },
                { label: "Pending dues", action: "Daily Reminder Queue" },
                { label: "Store stock low", action: "Dashboard Alert" },
                { label: "Slot overbooked", action: "Capacity Warning" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold uppercase tracking-wider border-b border-[#242424]/40 pb-2">
                  <span className="text-white">{item.label}</span>
                  <span className="text-[#ed3434]">{item.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Data Security Card */}
          <div className="bg-[#101010] border border-[#242424] rounded-2xl p-8 space-y-6 relative overflow-hidden">
            <div className="size-12 bg-[#ed3434]/10 text-[#ed3434] rounded-xl grid place-items-center mb-4">
              <ShieldCheck className="size-6" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-white uppercase">YOUR DATA, YOUR GYM</h3>
            <p className="text-xs uppercase tracking-widest text-[#ed3434] font-extrabold">Multi-branch · isolated · exportable</p>
            <p className="text-xs text-[#8d8d8d] leading-relaxed">
              Each branch remains completely isolated — Branch 1 members will never leak into Branch 2. Export your CSV/JSON backups at any time. No lock-in.
            </p>

            <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px] uppercase font-bold tracking-wider text-white">
              {["Members", "Attendance", "Store", "Reports"].map((label) => (
                <div key={label} className="p-2.5 bg-[#070707] border border-[#242424] rounded-lg">
                  {label}
                </div>
              ))}
            </div>

            <Link to="/auth" search={{ mode: "signup" }} className="w-full py-3 bg-[#ed3434] hover:bg-[#ff4b4b] text-white rounded-lg text-xs font-black text-center block uppercase tracking-widest shadow-[0_4px_15px_rgba(237,52,52,0.2)]">
              Start Free
            </Link>
          </div>

        </div>
      </section>

      {/* SECTION 11: QUOTE band */}
      <section className="py-20 bg-[#ed3434] text-[#070707] text-center">
        <div className="max-w-5xl mx-auto px-6">
          <p className="font-heading text-3xl sm:text-6xl font-black text-[#070707] uppercase tracking-tight max-w-[950px] mx-auto leading-none">
            "THE BODY ACHIEVES WHAT THE MIND REFUSES TO QUIT."
          </p>
          <small className="block mt-4 font-bold tracking-[0.25em] text-xs uppercase text-[#070707]/70">ALPHA FITNESS / THE STANDARD</small>
        </div>
      </section>

      {/* SECTION 12: FOOTER */}
      <footer className="bg-[#050505] border-t border-[#242424] relative overflow-hidden" id="contact">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10 relative z-10 text-left">
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div>
                <div className="text-2xl font-black tracking-tight text-white uppercase">ALPHA <span className="text-[#ed3434]">FITNESS</span></div>
                <div className="text-[9px] uppercase tracking-wider text-[#8d8d8d] font-bold">Your Gym Operating System</div>
              </div>
            </Link>
            <p className="text-xs text-[#8d8d8d] leading-relaxed max-w-sm font-medium">
              A premium, comprehensive digital console managing RFID attendance logging, physical progress progressions, crowd-control time shifts, and supplement retail sales.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-white font-bold">Navigation</p>
            <ul className="space-y-2 text-xs text-[#8d8d8d] font-bold uppercase tracking-wider">
              <li><a href="#features" className="hover:text-white transition-colors">System Features</a></li>
              <li><a href="#testimonials" className="hover:text-white transition-colors">Owner Testimonials</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Structure</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-white font-bold">Administrator</p>
            <ul className="space-y-2 text-xs text-[#8d8d8d] font-bold uppercase tracking-wider">
              <li><Link to="/auth" search={{ mode: "login" }} className="hover:text-white transition-colors">Access Console</Link></li>
              <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-white transition-colors">Register Account</Link></li>
            </ul>
          </div>
        </div>

        {/* Big low-opacity background title typography positioned properly to avoid overlap */}
        <div className="relative border-t border-[#202020] py-8 z-10 bg-black/90">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-[#4f4f4f] font-bold uppercase tracking-wider">
            <div>© 2026 ALPHA FITNESS. ALL RIGHTS RESERVED.</div>
            <div className="flex gap-4">
              <span>Tahseen Ashrafi</span>
              <span>•</span>
              <Link to="/auth" search={{ mode: "login" }} className="hover:text-white transition-colors">Sign In Portal</Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 text-[10vw] font-black text-white/[0.012] tracking-tighter select-none font-heading text-center w-full leading-none pointer-events-none uppercase z-0">
          ALPHA FITNESS
        </div>
      </footer>
    </div>
  );
}

/* =========================================================================
   AUTHENTICATED INTERACTIVE DASHBOARD
   ========================================================================= */

const WIDGET_LABELS: Record<WidgetId, string> = {
  kpi: "KPI Cards",
  money: "Money Row",
  chart: "Footfall & Revenue Chart",
  maintenance: "Maintenance Tasks",
  ghosts: "Scan Bypass / Ghosts",
  expiring: "Expiring Members",
};

const PLAN_ORDER: PlanType[] = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

function Dashboard() {
  const [members, setMembers] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [chartLogs, setChartLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [storeSales, setStoreSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [renewingMember, setRenewingMember] = useState<any | null>(null);

  const [cycleStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchDashboardData = () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    supabase
      .from("members")
      .select("*")
      .eq("branch_id", branchId)
      .then(({ data }) => setMembers(data ?? []));

    supabase
      .from("products")
      .select("id, cost, price")
      .eq("branch_id", branchId)
      .then(({ data }) => setProducts(data ?? []));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    supabase
      .from("attendance_logs")
      .select("*")
      .eq("branch_id", branchId)
      .gte("checked_in_at", startOfToday.toISOString())
      .lte("checked_in_at", endOfToday.toISOString())
      .then(({ data }) => setTodayLogs(data ?? []));

    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - 13);
    chartStart.setHours(0, 0, 0, 0);
    supabase
      .from("attendance_logs")
      .select("*")
      .eq("branch_id", branchId)
      .gte("checked_in_at", chartStart.toISOString())
      .then(({ data }) => setChartLogs(data ?? []));

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    fourDaysAgo.setHours(0, 0, 0, 0);
    supabase
      .from("attendance_logs")
      .select("member_id, checked_in_at")
      .eq("branch_id", branchId)
      .gte("checked_in_at", fourDaysAgo.toISOString())
      .then(({ data }) => setAllLogs(data ?? []));

    supabase
      .from("todos")
      .select("*")
      .eq("branch_id", branchId)
      .eq("done", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTodos(data ?? []));

    supabase
      .from("expenses")
      .select("*")
      .eq("branch_id", branchId)
      .order("date", { ascending: false })
      .then(({ data }) => setExpenses(data ?? []));

    Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("branch_id", branchId)
        .gte("payment_date", cycleStart.toISOString()),
      supabase
        .from("sales")
        .select("*")
        .eq("branch_id", branchId)
        .gte("created_at", cycleStart.toISOString()),
      supabase
        .from("members")
        .select("id, fee_amount, fee_paid, created_at")
        .eq("branch_id", branchId)
        .gte("created_at", cycleStart.toISOString()),
    ]).then(([payRes, salesRes, membersRes]) => {
      const payData = payRes.data ?? [];
      const salesData = salesRes.data ?? [];
      const newMembers = membersRes.data ?? [];

      const existingPaymentMemberIds = new Set(payData.map((p: any) => p.member_id));

      const extraPayments = newMembers
        .filter((m: any) => {
          const paid = m.fee_paid ?? false;
          return paid && !existingPaymentMemberIds.has(m.id);
        })
        .map((m: any) => ({
          amount: m.fee_amount ?? 0,
          member_id: m.id,
          note: "Legacy join (no payment row)",
        }));

      setPayments([...payData, ...extraPayments]);
      setStoreSales(salesData);
    });
  };

  useEffect(() => {
    fetchDashboardData();

    const branchId = getActiveBranchId();
    if (!branchId) return;

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        (payload) => {
          const row = payload.new as any;
          if (row.branch_id === branchId) {
            setTodayLogs((prev) => [...prev, row]);
            setChartLogs((prev) => [...prev, row]);
            setAllLogs((prev) => [...prev, { member_id: row.member_id, checked_in_at: row.checked_in_at }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleStart]);

  const settings = useGym((s) => s.settings);
  const layout = settings.dashboardLayout?.length ? settings.dashboardLayout : DEFAULT_LAYOUT;
  const [customize, setCustomize] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);

  const storeRevenue = useMemo(() => {
    return storeSales.reduce((total: number, sale: any) => {
      const items = Array.isArray(sale.items) ? sale.items : [];
      if (items.length === 0) return total + (sale.total ?? 0);

      return (
        total +
        items.reduce((sum: number, item: any) => {
          const productId = item.productId ?? item.product_id;
          const product = products.find((p: any) => p.id === productId);
          const cost = product?.cost ?? item.cost ?? 0;
          const sellPrice = item.price ?? 0;
          const qty = item.qty ?? item.quantity ?? 1;
          return sum + (sellPrice - cost) * qty;
        }, 0)
      );
    }, 0);
  }, [storeSales, products]);

  const stats = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, pendingAmt = 0;

    members.forEach((m: any) => {
      const expiryDate = m.expiry_date ?? m.expiryDate;
      const feePaid = m.fee_paid ?? m.feePaid;
      const feeAmount = m.fee_amount ?? m.feeAmount ?? 0;

      const d = daysUntil(expiryDate);
      if (d < 0) {
        expired++;
        pendingAmt += feeAmount;
      } else if (d <= 7) {
        expiring++;
      } else {
        active++;
      }
      if (!feePaid && d >= 0) pendingAmt += feeAmount;
    });

    const memberRevenue = payments.reduce((a: number, p: any) => a + (p.amount ?? 0), 0);
    const totalCycleRevenue = memberRevenue + storeRevenue;
    const expenseTotal = expenses.reduce((a: number, e: any) => a + (e.amount ?? 0), 0);

    return {
      active,
      expiring,
      expired,
      pendingAmt,
      memberRevenue,
      storeRevenue,
      totalCycleRevenue,
      expenseTotal,
      paymentCount: payments.length,
    };
  }, [members, expenses, payments, storeRevenue]);

  const todayCheckIns = useMemo(() => {
    const inMemberIds = new Set(
      todayLogs
        .filter((l: any) => (l.punch_type ?? "in") === "in")
        .map((l: any) => l.member_id)
    );
    return inMemberIds.size;
  }, [todayLogs]);

  const trend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const label = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      const visits = chartLogs.filter((l: any) => {
        const logDate = new Date(l.checked_in_at).toISOString().split("T")[0];
        return logDate === dateStr && (l.punch_type ?? "in") === "in";
      }).length;

      const dayRevenue = payments
        .filter((p: any) => {
          const raw = p.payment_date ?? p.created_at;
          if (!raw) return false;
          const pDate = new Date(raw).toISOString().split("T")[0];
          return pDate === dateStr;
        })
        .reduce((a: number, p: any) => a + (p.amount ?? 0), 0);

      days.push({ d: label, revenue: dayRevenue, visits });
    }
    return days;
  }, [chartLogs, payments]);

  const ghostList = useMemo(() => {
    const activeMembers = members.filter((m: any) => {
      const d = daysUntil(m.expiry_date ?? m.expiryDate);
      return d >= 0;
    });

    const recentMemberIds = new Set(allLogs.map((l: any) => l.member_id));

    return activeMembers
      .filter((m: any) => !recentMemberIds.has(m.id))
      .slice(0, 5);
  }, [members, allLogs]);

  const expiringList = members
    .filter((m) => {
      const d = daysUntil(m.expiry_date ?? m.expiryDate);
      return d < 0 || d <= 7;
    })
    .sort(
      (a, b) =>
        daysUntil(a.expiry_date ?? a.expiryDate) - daysUntil(b.expiry_date ?? b.expiryDate)
    )
    .slice(0, 5);

  const openTodos = todos.slice(0, 4);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const cycleLabel = cycleStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  function move(from: number, to: number) {
    if (to < 0 || to >= layout.length) return;
    const next = [...layout];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    gym.setLayout(next);
  }
  function toggle(id: WidgetId) {
    gym.setLayout(layout.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }
  function onDrop(targetId: WidgetId) {
    if (!dragId || dragId === targetId) return;
    const from = layout.findIndex((w) => w.id === dragId);
    const to = layout.findIndex((w) => w.id === targetId);
    move(from, to);
    setDragId(null);
  }

  const widgets: Record<WidgetId, React.ReactNode> = {
    kpi: (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Kpi to="/members" label="Total Members" value={members.length} icon={<Users className="size-4" />} />
        <Kpi to="/members" search={{ filter: "active" }} label="Active" value={stats.active} icon={<CheckCircle2 className="size-4" />} accent="text-brand" />
        <Kpi to="/members" search={{ filter: "expiring" }} label="Expiring (7d)" value={stats.expiring} icon={<Clock className="size-4" />} accent="text-warn" />
        <Kpi to="/members" search={{ filter: "expired" }} label="Expired" value={stats.expired} icon={<AlertTriangle className="size-4" />} accent="text-danger" />
        <Kpi to="/members" search={{ filter: "ghost" }} label="Ghosts" value={ghostList.length} icon={<Bell className="size-4" />} accent="text-danger" hint="No-shows 4d+" />
        <Kpi to="/attendance" label="Today In" value={todayCheckIns} icon={<Activity className="size-4" />} accent="text-info" />
      </div>
    ),
    money: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <MoneyCard
          to="/analytics"
          label="Collected This Cycle"
          value={money(stats.totalCycleRevenue)}
          sub={`${stats.paymentCount} payments · ₹${stats.storeRevenue.toLocaleString("en-IN")} store profit · ${cycleLabel}`}
          tone="brand"
          icon={<TrendingUp className="size-5" />}
        />
        <MoneyCard
          to="/members"
          search={{ filter: "expired" }}
          label="Pending Dues"
          value={money(stats.pendingAmt)}
          sub={`${stats.expired} expired members`}
          tone="danger"
          icon={<Wallet className="size-5" />}
        />
        <MoneyCard
          to="/expenses"
          label="Total Expenses"
          value={money(stats.expenseTotal)}
          sub={`${expenses.length} entries recorded`}
          tone="muted"
          icon={<Wallet className="size-5" />}
        />
      </div>
    ),
    chart: (
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-heading text-foreground">Footfall & Revenue</h2>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </div>
          <Link to="/analytics" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
            Open analytics <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: -25, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="visits" stroke="var(--color-accent)" fill="url(#g2)" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-brand)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    maintenance: (
      <Link to="/todos" className="bg-card border border-border rounded-2xl p-4 sm:p-6 hover:border-brand/30 transition-colors block">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-foreground">Maintenance</h3>
          <span className="text-xs text-muted-foreground">All</span>
        </div>
        <div className="space-y-2">
          {openTodos.length === 0 && <p className="text-sm text-muted-foreground">All caught up</p>}
          {openTodos.map((t) => (
            <div
              key={t.id}
              className={
                "p-3 bg-secondary/40 rounded-lg border-l-2 flex items-start justify-between gap-3 " +
                (t.priority === "high" ? "border-danger" : t.priority === "med" ? "border-warn" : "border-accent")
              }
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
                {t.note && <p className="text-xs text-muted-foreground truncate">{t.note}</p>}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="text-[10px] uppercase tracking-wider text-brand hover:underline shrink-0"
              >
                Done
              </button>
            </div>
          ))}
        </div>
      </Link>
    ),
    ghosts: (
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-heading text-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-danger animate-pulse" />
              Scan Bypass Alerts
            </h2>
            <p className="text-xs text-muted-foreground">Active members with no RFID punch in last 4 days</p>
          </div>
          <Link to="/members" search={{ filter: "ghost" }} className="text-xs text-brand hover:underline">
            View all
          </Link>
        </div>
        {ghostList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Everyone is regular.</p>
        ) : (
          <div className="divide-y divide-border">
            {ghostList.map((m) => (
              <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="size-10 rounded-full object-cover ring-1 ring-border"
                      width={40}
                      height={40}
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-brand/20 grid place-items-center text-brand font-bold">
                      {m.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.roll_no ?? m.rollNo} · {m.plan}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="px-2 py-0.5 bg-danger/10 text-danger text-[9px] rounded uppercase font-bold tracking-wider">
                    4d+ no show
                  </span>
                  <Link to="/reminders" className="text-xs text-brand hover:underline shrink-0">
                    Remind
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    expiring: (
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 block">
        <h3 className="font-heading text-lg text-foreground mb-4">Expiring / Expired</h3>
        <div className="space-y-3">
          {expiringList.map((m) => {
            const d = daysUntil(m.expiry_date ?? m.expiryDate);
            return (
              <div key={m.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="size-9 rounded-full object-cover ring-1 ring-border"
                      width={36}
                      height={36}
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-9 rounded-full bg-brand/20 grid place-items-center text-brand font-bold text-sm">
                      {m.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d < 0 ? `Expired ${-d}d ago` : d === 0 ? "Expires today" : `${d}d left`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setRenewingMember(m);
                  }}
                  className="text-[10px] uppercase tracking-wider text-brand hover:underline shrink-0 cursor-pointer"
                >
                  Renew
                </button>
              </div>
            );
          })}
        </div>
      </div>
    ),
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] w-full">
      <PageHeader
        title="Gym Overview"
        subtitle={`${greet}, ${settings.ownerName} — ${settings.gymName}`}
        actions={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCustomize((v) => !v)}
              className="px-4 py-2.5 bg-secondary text-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 hover:bg-brand/10 hover:text-brand flex-1 sm:flex-initial justify-center"
            >
              <GripVertical className="size-4" /> {customize ? "Done" : "Customize"}
            </button>
            <Link
              to="/attendance"
              className="px-5 py-2.5 bg-secondary text-foreground font-semibold rounded-xl text-sm inline-flex items-center gap-2 hover:bg-brand/10 hover:text-brand transition flex-1 sm:flex-initial justify-center"
            >
              <Radio className="size-4" /> Punch In
            </Link>
            <Link
              to="/members/new"
              className="px-5 py-2.5 bg-brand text-brand-foreground font-semibold rounded-xl hover:scale-[1.02] active:scale-95 transition-transform text-sm w-full sm:w-auto text-center"
            >
              + New Member
            </Link>
          </div>
        }
      />

      {customize && (
        <div className="mb-6 p-4 sm:p-5 bg-card border border-dashed border-brand/40 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-heading text-base">Customize Dashboard</h3>
              <p className="text-xs text-muted-foreground">Drag widgets to reorder, eye-icon to show/hide</p>
            </div>
            <button
              onClick={() => gym.setLayout(DEFAULT_LAYOUT)}
              className="text-xs text-muted-foreground hover:text-brand inline-flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {layout.map((w, i) => (
              <div key={w.id} className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{WIDGET_LABELS[w.id]}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(i, i - 1)} className="text-xs text-muted-foreground hover:text-brand px-1" aria-label="Move up">
                    ↑
                  </button>
                  <button onClick={() => move(i, i + 1)} className="text-xs text-muted-foreground hover:text-brand px-1" aria-label="Move down">
                    ↓
                  </button>
                  <button onClick={() => toggle(w.id)} className="size-7 grid place-items-center rounded hover:bg-secondary" aria-label="Toggle visibility">
                    {w.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {layout
          .filter((w) => w.visible)
          .map((w) => (
            <div
              key={w.id}
              draggable={customize}
              onDragStart={() => setDragId(w.id)}
              onDragOver={(e) => {
                if (customize) e.preventDefault();
              }}
              onDrop={() => onDrop(w.id)}
              className={
                customize
                  ? "relative ring-2 ring-dashed ring-border rounded-2xl cursor-move transition " +
                  (dragId === w.id ? "opacity-50" : "")
                  : ""
              }
            >
              {customize && (
                <div className="absolute -top-3 left-4 px-2 py-0.5 bg-brand text-brand-foreground text-[10px] uppercase tracking-widest rounded font-bold z-10">
                  {WIDGET_LABELS[w.id]}
                </div>
              )}
              {widgets[w.id]}
            </div>
          ))}
      </div>

      {renewingMember && (
        <RenewModal
          member={renewingMember}
          onClose={() => setRenewingMember(null)}
          onRenewed={() => {
            fetchDashboardData();
            setRenewingMember(null);
          }}
        />
      )}
    </div>
  );
}

// Reusable Plan Renewal Modal Component
export function RenewModal({ member, onClose, onRenewed }: { member: any; onClose: () => void; onRenewed: () => void }) {
  const [plan, setPlan] = useState<PlanType>(member.plan as PlanType || "Monthly");
  const [planPrices, setPlanPrices] = useState<Record<PlanType, number>>({
    Monthly: 1500,
    Quarterly: 4000,
    HalfYearly: 7500,
    Yearly: 13000,
  });
  const [feeAmount, setFeeAmount] = useState<number>(1500);
  const [feePaid, setFeePaid] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    supabase
      .from("branches")
      .select("plan_prices")
      .eq("id", branchId)
      .single()
      .then(({ data }) => {
        if (data?.plan_prices) {
          setPlanPrices(data.plan_prices);
          setFeeAmount(data.plan_prices[plan] ?? 1500);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setFeeAmount(planPrices[plan] ?? 0);
  }, [plan, planPrices]);

  const handleSave = async () => {
    setSaving(true);
    const DAYS: Record<string, number> = {
      Monthly: 30, Quarterly: 90, HalfYearly: 180, Yearly: 365,
    };

    const expiryRaw = member.expiry_date ?? member.expiryDate;
    const baseDate = new Date(expiryRaw) > new Date()
      ? new Date(expiryRaw)
      : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + DAYS[plan]);

    const { error } = await supabase
      .from("members")
      .update({
        plan,
        expiry_date: newExpiry.toISOString(),
        fee_amount: feeAmount,
        fee_paid: feePaid,
      })
      .eq("id", member.id);

    if (error) {
      toast.error("Failed to renew: " + error.message);
      setSaving(false);
      return;
    }

    const branchId = getActiveBranchId();
    if (branchId && feePaid) {
      const { error: payError } = await supabase.from("payments").insert({
        branch_id: branchId,
        member_id: member.id,
        amount: feeAmount,
        plan: plan,
        payment_date: new Date().toISOString(),
        note: `Plan renewal: ${plan}`,
      });
      if (payError) console.error("Payment insert error:", payError);
    }

    toast.success(`${member.name}'s plan renewed successfully.`);
    onRenewed();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 bg-brand/10 text-brand rounded-xl grid place-items-center">
            <CreditCard className="size-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg text-foreground">Renew Plan</h3>
            <p className="text-xs text-muted-foreground">Select plan for {member.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Select Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_ORDER.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPlan(p)}
                  className={"p-3 rounded-xl border text-left transition " + (plan === p ? "border-brand bg-brand/10" : "border-border bg-secondary/40 hover:border-brand/40")}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p}</p>
                  <p className="text-base font-heading mt-0.5">₹{planPrices[p]?.toLocaleString("en-IN") ?? "—"}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Fee Amount (INR)</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-bold">₹</span>
              <input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(+e.target.value)}
                className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
            <input
              type="checkbox"
              checked={feePaid}
              onChange={(e) => setFeePaid(e.target.checked)}
              className="accent-brand size-4"
            />
            <span>Mark Fee as Paid Upfront</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-semibold">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-brand text-brand-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <Save className="size-4" /> {saving ? "Renewing..." : "Renew Plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  to,
  search,
  label,
  value,
  icon,
  accent,
  hint,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <Link
      to={to as "/"}
      search={search as never}
      className="p-4 sm:p-5 bg-card border border-border rounded-xl hover:border-brand/40 hover:bg-card/80 transition block group"
    >
      <div className="flex items-center justify-between text-muted-foreground mb-2">
        <span className="text-[10px] uppercase tracking-widest truncate">{label}</span>
        <span className="group-hover:text-brand transition shrink-0">{icon}</span>
      </div>
      <p className={"text-2xl sm:text-3xl font-heading " + (accent ?? "text-foreground")}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</p>}
    </Link>
  );
}

function MoneyCard({
  to,
  search,
  label,
  value,
  sub,
  tone,
  icon,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  value: string;
  sub: string;
  tone: "brand" | "danger" | "muted";
  icon: React.ReactNode;
}) {
  const accent =
    tone === "brand"
      ? "text-brand bg-brand/10"
      : tone === "danger"
        ? "text-danger bg-danger/10"
        : "text-muted-foreground bg-secondary";

  return (
    <Link
      to={to as "/"}
      search={search as never}
      className="p-4 sm:p-6 bg-card border border-border rounded-2xl flex items-center gap-4 hover:border-brand/30 transition"
    >
      <div className={"size-12 rounded-xl grid place-items-center shrink-0 " + accent}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-widest truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-heading text-foreground mt-1">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </Link>
  );
}
