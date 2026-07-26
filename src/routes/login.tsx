import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Lock, User } from "lucide-react";
import { login, isLoggedIn } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Owner Login — IronSync" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  useEffect(() => {
    if (isLoggedIn()) nav({ to: "/" });
  }, [nav]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (login(u, p)) {
      toast.success("Welcome back, Owner 💪");
      nav({ to: "/" });
    } else {
      toast.error("Galat username ya password");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-brand/20 via-background to-background p-12 flex-col justify-between">
        <Link to="/landing" className="flex items-center gap-3">
          <div className="size-10 bg-brand rounded-lg grid place-items-center shadow-[0_0_30px_-4px_var(--color-brand)]">
            <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading text-xl leading-none">IRONSYNC</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Gym OS</div>
          </div>
        </Link>
        <div>
          <h2 className="text-4xl font-heading leading-tight">
            Login karo. <br />
            <span className="text-brand">Ghosts pakdo.</span> <br />
            Dues wasoolo.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            RFID attendance, WhatsApp reminders, POS, analytics — sab ek dashboard me.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} IronSync</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-brand rounded-lg grid place-items-center">
                <Dumbbell className="size-5 text-brand-foreground" strokeWidth={2.5} />
              </div>
              <div className="font-heading text-xl">IRONSYNC</div>
            </div>
          </div>
          <h1 className="text-3xl font-heading">Owner Login</h1>
          <p className="text-sm text-muted-foreground mt-2">Gym dashboard me enter karo.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Username</span>
              <div className="mt-1 relative">
                <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={u}
                  onChange={(e) => setU(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/40"
                  placeholder="admin"
                  autoFocus
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Password</span>
              <div className="mt-1 relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/40"
                  placeholder="••••••••"
                />
              </div>
            </label>
            <button
              type="submit"
              className="w-full py-3.5 bg-brand text-brand-foreground font-semibold rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-transform"
            >
              Login
            </button>
          </form>

          <div className="mt-6 p-4 bg-card border border-border rounded-xl text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Default credentials</p>
            <p>Username: <span className="text-brand font-mono">admin</span></p>
            <p>Password: <span className="text-brand font-mono">admin123</span></p>
            <p className="mt-2 opacity-70">Settings me jaake baad me change kar sakte ho.</p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
