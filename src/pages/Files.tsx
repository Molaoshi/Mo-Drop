import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/providers/trpc";
import { downloadUrl, formatBytes } from "@/lib/api";
import { FileGlyph, PageHeader } from "@/components/bits";

const TABS = [
  { key: "all", label: "All" },
  { key: "inbox", label: "Raw" },
  { key: "outbox", label: "Finished" },
  { key: "brand", label: "Brand" },
] as const;

export default function Files() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const utils = trpc.useUtils();
  const filesQuery = trpc.files.list.useQuery(tab === "all" ? undefined : { kind: tab });
  const del = trpc.files.delete.useMutation({
    onSuccess: () => utils.files.list.invalidate(),
  });

  const files = filesQuery.data ?? [];
  const total = files.reduce((s, f) => s + Number(f.sizeBytes), 0);

  return (
    <div>
      <PageHeader
        title="Files"
        meta={`${files.length} shown · ${formatBytes(total)}`}
        right={
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  tab === t.key
                    ? "border-primary/60 text-primary"
                    : "border-white/10 text-white/45 hover:text-white/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {files.length === 0 && !filesQuery.isLoading && (
        <div className="surface p-14 text-center text-sm text-white/50">
          Nothing in this drawer yet.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <div key={f.id} className="group surface surface-hover flex items-center gap-4 p-3">
            <FileGlyph mime={f.mime} filename={f.filename} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.filename}</p>
              <p className="micro-label mt-0.5">
                {f.kind} · {formatBytes(Number(f.sizeBytes))} ·{" "}
                {format(new Date(f.createdAt), "MMM d, HH:mm")}
              </p>
            </div>
            <a
              href={downloadUrl(f.id)}
              className="text-white/40 transition-colors hover:text-white"
              title="Download"
            >
              <Download className="h-4 w-4" strokeWidth={1.5} />
            </a>
            <button
              onClick={() => {
                if (window.confirm(`Delete ${f.filename}?`)) del.mutate({ id: f.id });
              }}
              className="text-white/25 transition-colors hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
