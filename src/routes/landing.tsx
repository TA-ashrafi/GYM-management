import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Dumbbell, Radio, Users, MessageCircle, ShoppingBag, BarChart3,
  Bell, Wallet, Clock, FileText, ShieldCheck, Zap, ArrowRight, Check,
  Shield, Award, Star, Flame, Compass, ChevronRight, Activity
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "ALPHA FITNESS — Your GYM Operating System" },
      { name: "description", content: "RFID attendance, ghost detection, WhatsApp reminders, supplement POS, analytics — the complete OS for modern gym networks." },
      { property: "og:title", content: "ALPHA FITNESS — Your GYM Operating System" },
      { property: "og:description", content: "Eliminate scan bypass. Track every member, every transaction, and every check-in with high-end analytics." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Radio, title: "RFID Attendance", desc: "Equip members with secure RFID access cards. Detect scan mismatches instantly and eliminate fingerprint bypass." },
  { icon: Bell, title: "Ghost Detection", desc: "Identify active members who have not checked in for over 4 days. Intervene proactively to reduce churn." },
  { icon: MessageCircle, title: "WhatsApp Integration", desc: "Dispatch automatic reminders for plan expirations, unpaid dues, and birthdays directly with a single click." },
  { icon: Users, title: "Advanced CRM Console", desc: "Manage detailed member profiles, medical records, physical progression metrics, and emergency contacts easily." },
  { icon: ShoppingBag, title: "Supplement POS Tracker", desc: "Track protein powder sales, snacks, and gear inventory with automated cost-margin profit logs built right into the platform." },
  { icon: BarChart3, title: "Deep Real-Time Analytics", desc: "Visualize hourly footfall peaks, active member counts, and monthly sales trends on live interactive dashboards." },
  { icon: Wallet, title: "Expenses & Cash Flow P&L", desc: "Monitor recurring expenses like rent, staff salaries, and utility bills. Auto-generate comprehensive monthly net income reports." },
  { icon: Clock, title: "Crowd Control Slots", desc: "Assign members to custom capacity slots and shifts to distribute peak-hour attendance seamlessly." },
  { icon: FileText, title: "A4 Print-Ready Reports", desc: "Generate professional measurement progress cards, physical assessments, and attendance logs formatted perfectly for paper printing." },
];

const PLANS = [
  {
    name: "Bronze Plan",
    price: "1,500",
    period: "month",
    desc: "Essential features for managing a single-location gym.",
    features: [
      "Up to 200 members active",
      "RFID Scanner Integration",
      "Daily Attendance Logger",
      "Standard Dashboard Reports",
      "Email Sign-In Authentication"
    ],
    cta: "Get Started",
    popular: false
  },
  {
    name: "Silver Pro Plan",
    price: "4,000",
    period: "quarter",
    desc: "Complete operational control with automated reminders.",
    features: [
      "Unlimited Active Members",
      "RFID Attendance + Live Sync",
      "Automated WhatsApp Webhooks",
      "Ghost Detection & Churn Alert",
      "Full Supplement POS Console",
      "A4 PDF Report Generation"
    ],
    cta: "Go Pro",
    popular: true
  },
  {
    name: "Gold Executive Plan",
    price: "13,000",
    period: "year",
    desc: "Ultimate performance tier with multi-branch management.",
    features: [
      "All Silver Pro features",
      "Multi-Branch Network Support",
      "Physical Measurement Progess Logs",
      "Custom 6-Day Workout Builder",
      "Advanced Cash Flow P&L Reports",
      "Lifetime Dedicated Support"
    ],
    cta: "Join the Elite",
    popular: false
  }
];

const QUOTES = [
  {
    text: "ALPHA FITNESS completely revamped how we track member entries. Our fingerprint scanner had 30% bypass, but RFID solved it instantly.",
    author: "Rajesh Kumar",
    role: "Owner, Iron Legacy Gym"
  },
  {
    text: "The monthly P&L and supplement profit tracking are unmatched. I can see my actual margins with zero manual math.",
    author: "Vikram Malhotra",
    role: "Director, Alpha Zone Club"
  }
];

function Landing() {
  return (
    <div className="min-h-screen bg-black text-foreground selection:bg-brand selection:text-brand-foreground overflow-x-hidden font-sans relative">
      {/* Abstract Background Textures & Gradients */}
      <div className="absolute top-0 left-0 right-0 h-[800px] bg-[radial-gradient(circle_at_top,rgba(var(--color-brand),0.08),transparent_70%)] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-1/3 left-1/4 size-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 size-[600px] bg-accent/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/85 border-b border-border/40 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 bg-gradient-to-tr from-brand to-brand/70 rounded-xl grid place-items-center shadow-[0_0_24px_rgba(var(--color-brand),0.3)]">
              <Dumbbell className="size-5.5 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-heading text-xl font-black tracking-tight text-white uppercase">ALPHA FITNESS</div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-brand font-bold">Your GYM Operating System</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-brand transition-colors">Features</a>
            <a href="#quote" className="hover:text-brand transition-colors">Testimonials</a>
            <a href="#pricing" className="hover:text-brand transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl text-xs sm:text-sm font-bold transition duration-300"
            >
              LOGIN
            </Link>
            <Link
              to="/auth"
              className="px-5 py-2.5 bg-brand text-brand-foreground rounded-xl text-xs sm:text-sm font-bold hover:scale-[1.03] shadow-[0_4px_20px_rgba(var(--color-brand),0.35)] transition-transform duration-300"
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-xs font-bold rounded-full uppercase tracking-wider">
              <Zap className="size-3.5" /> High-Performance Gym Management ERP
            </div>
            <h1 className="text-5xl sm:text-7xl font-heading font-black leading-[1.05] tracking-tight text-white uppercase">
              Control Your Gym Network Like A <span className="bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent">Sovereign.</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
              Eliminate fingerprint bypass completely. ALPHA FITNESS is the dark-themed, ultra-fast, offline-first operating system built for modern fitness networks. Track live RFID attendance, automate WhatsApp reminders, manage supplement POS margins, and compute real-time P&L analytics.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/auth"
                className="px-7 py-4 bg-brand text-brand-foreground rounded-xl font-bold inline-flex items-center gap-2.5 hover:scale-[1.03] shadow-[0_6px_30px_rgba(var(--color-brand),0.4)] transition-transform duration-300"
              >
                Launch Console Dashboard <ArrowRight className="size-4.5" />
              </Link>
              <a
                href="#features"
                className="px-7 py-4 bg-secondary text-foreground rounded-xl font-bold border border-border hover:border-brand/40 transition duration-300"
              >
                Explore Features
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            {/* Visual Glassmorphic Widget Mockup */}
            <div className="relative aspect-square bg-gradient-to-br from-brand/15 via-zinc-900/40 to-black border border-border rounded-[32px] p-6 shadow-3xl overflow-hidden backdrop-blur-md">
              <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
              <div className="h-full rounded-2xl border border-border/40 p-5 flex flex-col justify-between bg-black/60 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4.5 text-brand animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">REAL-TIME MONITOR</span>
                  </div>
                  <div className="px-2.5 py-1 bg-brand/10 border border-brand/20 rounded-full text-[9px] text-brand font-extrabold uppercase tracking-wider">
                    CONSOLE READY
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 my-6">
                  {[
                    { label: "Active Roster", value: "382", accent: "text-white" },
                    { label: "Check-ins Today", value: "114", accent: "text-brand" },
                    { label: "Bypass Flagged", value: "0", accent: "text-emerald-500 font-black" },
                    { label: "Monthly Revenue", value: "₹2.48L", accent: "text-white" },
                  ].map((x) => (
                    <div key={x.label} className="p-4 bg-zinc-900/80 border border-border/80 rounded-2xl shadow-inner">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{x.label}</p>
                      <p className={"text-2xl font-heading font-black mt-1 " + x.accent}>{x.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-zinc-900/80 border border-border/80 rounded-2xl p-4">
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
                    <span>LIVE FOOTFALL TREND</span>
                    <span className="text-brand">6AM - 10PM</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-16">
                    {[20, 35, 50, 75, 90, 85, 40, 30, 55, 80, 95, 60].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-brand/60 to-brand rounded-t transition-all duration-500 hover:opacity-80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className="bg-zinc-950/80 border-y border-border/40 py-6 overflow-hidden relative select-none">
        <div className="flex whitespace-nowrap gap-12 animate-marquee font-heading text-lg font-black tracking-widest uppercase text-muted-foreground/60">
          <span className="flex items-center gap-2">⚡ RFID ATTENDANCE <Star className="size-4 text-brand shrink-0" /></span>
          <span className="flex items-center gap-2">⚡ GHOST DETECTION <Star className="size-4 text-brand shrink-0" /></span>
          <span className="flex items-center gap-2">⚡ WHATSAPP WEBHOOKS <Star className="size-4 text-brand shrink-0" /></span>
          <span className="flex items-center gap-2">⚡ SUPPLEMENT POS <Star className="size-4 text-brand shrink-0" /></span>
          <span className="flex items-center gap-2">⚡ RECHART LIVE DATA <Star className="size-4 text-brand shrink-0" /></span>
          <span className="flex items-center gap-2">⚡ MULTI-BRANCH CONSOLE <Star className="size-4 text-brand shrink-0" /></span>
          <span className="flex items-center gap-2">⚡ CASH FLOW P&L <Star className="size-4 text-brand shrink-0" /></span>
          <span className="flex items-center gap-2">⚡ PHYSICAL PROGRESSION LOGS <Star className="size-4 text-brand shrink-0" /></span>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28 relative">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-xs font-bold rounded-full uppercase tracking-wider">
            <Award className="size-3.5" /> High Performance Suite
          </div>
          <h2 className="text-4xl sm:text-5xl font-heading font-black text-white uppercase tracking-tight">
            Engineered To Drive Operational Velocity
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-xl mx-auto">
            All modules compile instantly, run offline-first, and store data securely with Supabase database integrations.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-8 bg-zinc-900/30 border border-border/80 rounded-3xl hover:border-brand/40 hover:bg-zinc-900/50 transition-all duration-300 group relative">
              <div className="size-12 bg-brand/10 text-brand rounded-2xl grid place-items-center mb-6 group-hover:scale-110 group-hover:bg-brand group-hover:text-brand-foreground transition-all duration-300 shadow-md">
                <f.icon className="size-5.5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white uppercase tracking-tight">{f.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-3 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Quote Section */}
      <section id="quote" className="bg-zinc-950/80 border-y border-border/40 py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-xs font-bold rounded-full uppercase tracking-wider">
                <Flame className="size-3.5" /> Owner Endorsements
              </div>
              <h2 className="text-4xl font-heading font-black text-white uppercase tracking-tight leading-none">
                Loved By Modern Gym Owners
              </h2>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                See how actual athletic clubs and fitness complexes use ALPHA FITNESS to optimize staff time slots, reclaim lost membership revenues, and drive retail supplement store inventory profits.
              </p>
            </div>
            <div className="space-y-6">
              {QUOTES.map((q) => (
                <div key={q.author} className="p-6 bg-zinc-900/40 border border-border/60 rounded-3xl relative">
                  <div className="absolute top-4 right-4 text-brand text-4xl font-serif leading-none select-none">“</div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed font-medium relative z-10">
                    {q.text}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-brand/10 text-brand grid place-items-center font-bold text-xs">
                      {q.author[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{q.author}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">{q.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Default 3 Membership Tiers) */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-28 text-center relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-xs font-bold rounded-full uppercase tracking-wider">
            <Compass className="size-3.5" /> Fair Enterprise Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-heading font-black text-white uppercase tracking-tight">
            Select Your System Tier
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-xl mx-auto">
            Choose a plan that fits your facility. Scale branches and features as your community expands.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                "p-8 sm:p-10 rounded-[32px] border flex flex-col justify-between text-left transition-all duration-300 relative overflow-hidden " +
                (p.popular
                  ? "border-brand bg-gradient-to-br from-brand/10 via-zinc-950 to-zinc-950 shadow-2xl scale-[1.02]"
                  : "border-border/80 bg-zinc-900/20")
              }
            >
              {p.popular && (
                <div className="absolute top-4 right-4 px-2.5 py-1 bg-brand text-brand-foreground text-[8px] font-black uppercase tracking-widest rounded-full">
                  POPULAR CHOICE
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-extrabold">{p.name}</p>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl sm:text-5xl font-heading font-black">₹{p.price}</span>
                  <span className="text-sm text-muted-foreground font-medium">/{p.period}</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground font-medium leading-relaxed">{p.desc}</p>

                <div className="my-8 border-t border-border/40" />

                <ul className="space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground font-medium">
                      <Check className="size-4 text-brand shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/auth"
                  className={
                    "w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 block text-center " +
                    (p.popular
                      ? "bg-brand text-brand-foreground hover:scale-[1.02] shadow-[0_4px_24px_rgba(var(--color-brand),0.3)]"
                      : "bg-secondary text-foreground hover:bg-secondary/80 border border-border/60")
                  }
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-zinc-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10 relative z-10 text-left">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-brand rounded-lg grid place-items-center shadow-[0_0_16px_rgba(var(--color-brand),0.3)] shrink-0">
                <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-heading text-lg font-black tracking-tight text-white uppercase">ALPHA FITNESS</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Your GYM Operating System</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm font-medium">
              A premium, comprehensive digital console managing RFID attendance logging, physical progress progressions, crowd-control time shifts, and supplement retail sales.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-white font-bold">Navigation</p>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><a href="#features" className="hover:text-brand transition-colors">System Features</a></li>
              <li><a href="#quote" className="hover:text-brand transition-colors">Owner Testimonials</a></li>
              <li><a href="#pricing" className="hover:text-brand transition-colors">Pricing Structure</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-white font-bold">Administrator</p>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><Link to="/auth" className="hover:text-brand transition-colors">Access Console</Link></li>
              <li><Link to="/auth" className="hover:text-brand transition-colors">Register Account</Link></li>
            </ul>
          </div>
        </div>

        {/* Low-Opacity Large Branded Typography and Copyright Info */}
        <div className="border-t border-border/20 py-8 relative z-10 bg-black/90">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground font-bold">
            <div>© {new Date().getFullYear()} ALPHA FITNESS — All rights reserved.</div>
            <div className="flex gap-4">
              <span className="text-muted-foreground/80">Copyright Tahseen Ashrafi</span>
              <span>•</span>
              <Link to="/auth" className="hover:text-brand transition-colors">Sign In Portal</Link>
            </div>
          </div>
        </div>

        {/* Big low-opacity background title typography */}
        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-[10vw] font-black text-white/[0.02] tracking-tighter select-none font-heading text-center w-full leading-none pointer-events-none uppercase">
          ALPHA FITNESS
        </div>
      </footer>
    </div>
  );
}