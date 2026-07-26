import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Dumbbell, Radio, Users, MessageCircle, ShoppingBag, BarChart3,
  Bell, Wallet, Clock, FileText, ShieldCheck, Zap, ArrowRight, Check,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "IronSync — Modern Gym Management OS" },
      { name: "description", content: "RFID attendance, ghost detection, WhatsApp reminders, supplement POS, analytics — the complete OS for Indian gyms." },
      { property: "og:title", content: "IronSync — Modern Gym Management OS" },
      { property: "og:description", content: "Stop finger-print bypass. Track every member, every rupee, every rep." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Radio, title: "RFID Attendance", desc: "Every member gets an RFID card. Punch-in mismatches are instantly detected — no more scan bypass." },
  { icon: Bell, title: "Ghost Detection", desc: "Members who haven't visited in 4+ days but have active memberships — auto-alert." },
  { icon: MessageCircle, title: "WhatsApp Reminders", desc: "Expiry, dues, birthdays — nudge everyone with one click, no gateway needed." },
  { icon: Users, title: "Member CRM", desc: "50+ pre-seeded members, photos, plans, medical records, emergency contacts — all in one place." },
  { icon: ShoppingBag, title: "Supplement POS", desc: "Selling protein and snacks? Inventory + billing + margin tracking built-in." },
  { icon: BarChart3, title: "Real Analytics", desc: "Revenue trends, peak hours, churn risk, footfall heatmap — all live." },
  { icon: Wallet, title: "Expenses & P&L", desc: "Rent, salary, electricity — track everything, monthly P&L auto-generated." },
  { icon: Clock, title: "Time Slots", desc: "Shifts + slot capacity. Assign members to slots — control the crowd." },
  { icon: FileText, title: "Complete Reports", desc: "Member profiles, attendance history, diet plans, dues — print-ready A4 format." },
];

const STATS = [
  { n: "50+", l: "Members seeded" },
  { n: "14", l: "Modules" },
  { n: "100%", l: "Offline-first" },
  { n: "0₹", l: "Setup cost" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/70 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-brand rounded-lg grid place-items-center shadow-[0_0_24px_-4px_var(--color-brand)]">
              <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-heading text-lg leading-none">IRONSYNC</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gym OS</div>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#why" className="hover:text-foreground">Why IronSync</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <Link
            to="/auth"
            className="px-4 py-2 bg-brand text-brand-foreground rounded-lg text-sm font-semibold hover:scale-[1.03] transition-transform"
          >
            Owner Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,var(--color-brand)/0.15,transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand text-xs rounded-full font-medium mb-6">
              <Zap className="size-3" /> Built for Indian gym owners
            </span>
            <h1 className="text-5xl sm:text-6xl font-heading leading-[1.05] tracking-tight">
              The gym OS that <span className="text-brand">catches</span> what your fingerprint scanner misses.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Ghost members, unpaid dues, expired memberships — IronSync flags everything before it costs you money. RFID + WhatsApp + POS + analytics in one dark, fast dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="px-6 py-3.5 bg-brand text-brand-foreground rounded-xl font-semibold inline-flex items-center gap-2 hover:scale-[1.02] transition-transform"
              >
                Login to Dashboard <ArrowRight className="size-4" />
              </Link>
              <a
                href="#features"
                className="px-6 py-3.5 bg-secondary text-foreground rounded-xl font-semibold border border-border hover:border-brand/40 transition"
              >
                See Features
              </a>
            </div>
            <div className="mt-10 grid grid-cols-4 gap-4">
              {STATS.map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-heading text-brand">{s.n}</div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-brand/20 via-card to-card border border-border rounded-3xl p-6 shadow-2xl">
              <div className="h-full bg-background/60 rounded-2xl border border-border/60 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Live Dashboard</div>
                  <div className="size-2 bg-brand rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: "Active", v: "142", c: "text-brand" },
                    { l: "Ghosts", v: "07", c: "text-danger" },
                    { l: "Revenue", v: "₹2.1L", c: "text-foreground" },
                    { l: "Dues", v: "₹18k", c: "text-warn" },
                  ].map((k) => (
                    <div key={k.l} className="p-4 bg-card border border-border rounded-xl">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.l}</div>
                      <div className={"text-2xl font-heading mt-1 " + k.c}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex-1 bg-card border border-border rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Punch-ins today</div>
                  <div className="flex items-end gap-1.5 h-24">
                    {[40,65,85,55,70,90,60,45,75,88,70,50].map((h, i) => (
                      <div key={i} className="flex-1 bg-brand/70 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-4xl font-heading">Everything you need to run a modern gym</h2>
          <p className="mt-3 text-muted-foreground">14 modules, one dashboard, zero monthly fees.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 bg-card border border-border rounded-2xl hover:border-brand/40 transition group">
              <div className="size-11 bg-brand/10 text-brand rounded-xl grid place-items-center mb-4 group-hover:scale-110 transition">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-heading text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why IronSync Section */}
      <section id="why" className="bg-card/50 border-y border-border py-20">
        <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs uppercase tracking-widest text-brand font-semibold">The Problem</span>
            <h2 className="text-4xl font-heading mt-3">Fingerprint scanners lie.</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Members whose membership expires simply <em>stop</em> punching in — and those who bypass the scanner also leave no record. The owner doesn't find out for 3-4 days. IronSync's <strong className="text-foreground">Ghost Detection</strong> catches such activity instantly.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Members not scanning for 4+ days → auto-flag",
                "Memberships expiring in 7 days → WhatsApp nudge",
                "Unpaid dues → daily reminder queue",
                "Low supplement stock → dashboard alert",
              ].map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <Check className="size-5 text-brand mt-0.5 shrink-0" />
                  <span className="text-sm">{x}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 bg-background border border-border rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="size-8 text-brand" />
              <div>
                <div className="font-heading text-xl">Data stays with you</div>
                <div className="text-xs text-muted-foreground">100% local. Export anytime.</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Everything is stored in your browser. Use the Backup/Export module to download JSON or Excel anytime. No lock-in.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-heading">Simple, honest pricing</h2>
        <p className="mt-3 text-muted-foreground">One gym, unlimited members, all features.</p>
        <div className="mt-10 p-10 bg-gradient-to-br from-brand/10 via-card to-card border-2 border-brand/30 rounded-3xl inline-block">
          <div className="text-xs uppercase tracking-widest text-brand font-bold">Launch offer</div>
          <div className="text-6xl font-heading mt-3">₹0<span className="text-2xl text-muted-foreground">/forever</span></div>
          <p className="mt-3 text-muted-foreground max-w-xs mx-auto">Self-hosted. All modules included. No credit card required.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex px-8 py-3.5 bg-brand text-brand-foreground rounded-xl font-semibold hover:scale-[1.02] transition-transform"
          >
            Start Now <ArrowRight className="size-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} IronSync — Gym Management OS</div>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-foreground">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}