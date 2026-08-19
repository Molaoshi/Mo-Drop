import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Vault() {
  const utils = trpc.useUtils();
  const listQuery = trpc.vault.list.useQuery();
  const create = trpc.vault.create.useMutation({
    onSuccess: () => {
      utils.vault.list.invalidate();
      toast.success("Key stored — Kimi can use it while editing.");
    },
  });
  const del = trpc.vault.delete.useMutation({
    onSuccess: () => utils.vault.list.invalidate(),
  });

  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  const secrets = listQuery.data ?? [];

  const store = () => {
    if (!name.trim() || !value.trim() || create.isPending) return;
    create.mutate({ name: name.trim(), value: value.trim() });
    setName("");
    setValue("");
  };

  return (
    <div>
      <PageHeader
        title="Vault"
        meta="API keys for the tools Kimi uses — MiniMax, music, voice"
      />

      <div className="surface mb-8 flex gap-3 p-4">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
        <p className="text-[13px] leading-relaxed text-white/55">
          Keys are <span className="text-white/85">write-only</span> in the browser: once stored,
          this page only shows the last 4 characters. The full value reaches Kimi through the
          agent token, only while editing. Delete a key here and it&rsquo;s gone everywhere.
        </p>
      </div>

      <section className="mb-10">
        <p className="micro-label mb-3">Store a key</p>
        <div className="surface flex flex-col gap-3 p-5 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="MINIMAX_API_KEY"
            className="h-10 rounded-lg border-white/15 bg-white/[0.04] font-mono text-[13px] focus-visible:ring-primary/60 sm:w-56"
          />
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste the key"
            className="h-10 flex-1 rounded-lg border-white/15 bg-white/[0.04] font-mono text-[13px] focus-visible:ring-primary/60"
          />
          <Button
            onClick={store}
            disabled={!name.trim() || !value.trim() || create.isPending}
            className="h-10 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Store
          </Button>
        </div>
      </section>

      <section>
        <p className="micro-label mb-3">Stored keys · {secrets.length}</p>
        {secrets.length === 0 ? (
          <div className="surface border-dashed p-10 text-center text-sm text-white/40">
            No keys yet — the first one to add is your MiniMax API key.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {secrets.map((s) => (
              <div key={s.id} className="surface surface-hover flex items-center gap-4 p-3.5">
                <KeyRound className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] font-medium">{s.name}</p>
                  <p className="micro-label mt-0.5">
                    ••••{s.hint} · added {format(new Date(s.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete key ${s.name}?`)) del.mutate({ id: s.id });
                  }}
                  className="text-white/25 transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
