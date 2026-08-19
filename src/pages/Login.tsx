import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { apiLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    const ok = await apiLogin(password);
    setBusy(false);
    if (ok) onAuth();
    else setError(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={submit} className="w-full max-w-xs">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          MO&rsquo;S DROP<span className="text-primary">.</span>
        </h1>
        <p className="micro-label mt-3">Private studio — one password</p>
        <div className="mt-10 flex flex-col gap-3">
          <Input
            type="password"
            autoFocus
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg border-white/15 bg-white/[0.04] font-mono text-sm focus-visible:ring-primary/60"
          />
          <Button
            type="submit"
            disabled={busy || !password}
            className="h-11 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Checking…" : "Enter"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {error && (
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-destructive">
              Wrong password
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
