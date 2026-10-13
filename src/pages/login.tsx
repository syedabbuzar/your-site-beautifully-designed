import { createFileRoute, Navigate } from "@/router-shim";
import { PoweredBy } from "@/components/app/PoweredBy";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/Splash";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Bombay Suiting & Shirting" },
      { name: "description", content: "Staff sign-in for Bombay Suiting & Shirting billing and stock management." },
      { property: "og:title", content: "Sign in — Bombay Suiting & Shirting" },
      { property: "og:description", content: "Staff sign-in for Bombay Suiting & Shirting." },
    ],
  }),
  component: Login,
});

function Login() {
  const { session, role, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && session && role) return <Navigate to={role === "admin" ? "/dashboard" : "/billing"} />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Logo className="h-56 w-56 shadow-2xl ring-4 ring-gold/40" />
        <h1 className="mt-10 text-5xl font-semibold tracking-[0.3em] text-sidebar-accent-foreground">BOMBAY</h1>
        <p className="mt-3 text-sm tracking-[0.35em] text-gold">SUITING • SHIRTING</p>
        <div className="gold-rule mt-8 w-64" />
        <p className="mt-6 max-w-sm text-center text-sm text-sidebar-foreground/70">
          Billing, meter-based stock and business reports — all in one place.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center lg:hidden">
            <Logo className="h-24 w-24" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to continue to your counter.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
          <PoweredBy className="pt-6" />
        </form>
      </div>
    </div>
  );
}
