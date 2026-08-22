// src/routes/help.tsx
// Help & Support page — WhatsApp / Email / Instagram / query form.
// Used by AppShell sidebar (link added in src/components/AppShell.tsx).
// All styling via Tailwind utility classes (design tokens from src/styles.css).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Mail,
  Instagram,
  Phone,
  MapPin,
  Send,
  LifeBuoy,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Support — ALPHA FITNESS" }] }),
  component: HelpPage,
});

const SUPPORT = {
  phone: "8527580809",
  waLink: "https://wa.me/918527580809",
  email: "tahseenashrafi29@gmail.com",
  instagram: "https://instagram.com/",
  address:
    "6th Floor, INS, Rafi Marg, Opposite Constitution Club of India, Delhi, India",
};

function HelpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Handle form submission
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Name and message are required");
      return;
    }
    setSending(true);
    // Save locally for record keeping
    const key = "ironsync_support_queries";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.unshift({
      id: crypto.randomUUID(),
      name,
      email,
      subject,
      message,
      at: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(prev));

    // Forward to WhatsApp support
    const text = encodeURIComponent(
      `ALPHA FITNESS Support Query\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
    );
    window.open(`${SUPPORT.waLink}?text=${text}`, "_blank");

    toast.success("Query sent — you will receive a reply within 24 hours ✓");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setSending(false);
  }

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Help & Support"
        subtitle="Have an issue or question? We're here to help."
      />

      {/* 24h response badge */}
      <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand text-xs font-medium border border-brand/20">
        <Clock className="size-3.5" />
        We'll reach out to you within 24 hours
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick contact channels */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          <ChannelCard
            icon={MessageCircle}
            title="WhatsApp"
            subtitle="Fastest response"
            value={"+91 " + SUPPORT.phone}
            href={SUPPORT.waLink}
            accent="text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
            cta="Chat now"
          />
          <ChannelCard
            icon={Mail}
            title="Email"
            subtitle="For detailed queries"
            value={SUPPORT.email}
            href={`mailto:${SUPPORT.email}`}
            accent="text-brand bg-brand/10 border-brand/20"
            cta="Send email"
          />
          <ChannelCard
            icon={Phone}
            title="Call us"
            subtitle="Mon–Sun, 10 AM – 8 PM"
            value={"+91 " + SUPPORT.phone}
            href={`tel:+91${SUPPORT.phone}`}
            accent="text-blue-500 bg-blue-500/10 border-blue-500/20"
            cta="Call now"
          />
          <ChannelCard
            icon={Instagram}
            title="Instagram"
            subtitle="Updates & tutorials"
            value="@alpha_fitness_os"
            href={SUPPORT.instagram}
            accent="text-pink-500 bg-pink-500/10 border-pink-500/20"
            cta="Follow us"
          />
        </div>

        {/* Office / contact info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="size-11 rounded-xl bg-brand/10 text-brand grid place-items-center mb-4">
            <LifeBuoy className="size-5" />
          </div>
          <h3 className="font-heading text-lg mb-1">Head Office</h3>
          <p className="text-xs text-muted-foreground mb-4">
            ALPHA FITNESS Support Center
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-foreground/90 leading-relaxed">
                {SUPPORT.address}
              </span>
            </div>
            <div className="flex gap-3">
              <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>+91 {SUPPORT.phone}</span>
            </div>
            <div className="flex gap-3">
              <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <a
                href={`mailto:${SUPPORT.email}`}
                className="text-brand hover:underline break-all"
              >
                {SUPPORT.email}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Query form */}
      <section className="mt-8 bg-card border border-border rounded-2xl p-6 lg:p-8">
        <h2 className="font-heading text-xl mb-1">Send us your query</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Submitting this form will forward your query directly to WhatsApp support.
        </p>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Field label="Your Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
              placeholder="Rahul Sharma"
              maxLength={80}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="you@example.com"
              maxLength={120}
            />
          </Field>
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={input}
              placeholder="e.g. Attendance not saving"
              maxLength={120}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Message *">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={input + " min-h-32 resize-y"}
                placeholder="Describe your issue or suggestion in detail..."
                maxLength={2000}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-muted-foreground">
              * required · Response within 24 hours
            </p>
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-3 bg-brand text-brand-foreground font-semibold rounded-xl inline-flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60"
            >
              <Send className="size-4" />
              {sending ? "Sending..." : "Send Query"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

const input =
  "px-3 py-2.5 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  subtitle,
  value,
  href,
  accent,
  cta,
}: {
  icon: typeof MessageCircle;
  title: string;
  subtitle: string;
  value: string;
  href: string;
  accent: string;
  cta: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-2xl p-5 hover:border-brand/40 transition flex flex-col"
    >
      <div
        className={
          "size-11 rounded-xl grid place-items-center border " + accent
        }
      >
        <Icon className="size-5" />
      </div>
      <h3 className="font-heading text-base mt-4">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <p className="mt-2 text-sm font-medium text-foreground break-all">
        {value}
      </p>
      <span className="mt-4 text-xs text-brand font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
        {cta} →
      </span>
    </a>
  );
}