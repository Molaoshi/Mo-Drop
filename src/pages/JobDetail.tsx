import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { downloadUrl, formatBytes } from "@/lib/api";
import { FileGlyph, StatusPill } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function FileRow({ f, accent }: { f: { id: number; filename: string; sizeBytes: number | string; mime?: string | null }; accent?: boolean }) {
  return (
    <div className="surface flex items-center gap-4 p-3">
      <FileGlyph mime={f.mime} filename={f.filename} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{f.filename}</p>
        <p className="micro-label mt-0.5">{formatBytes(Number(f.sizeBytes))}</p>
      </div>
      <a
        href={downloadUrl(f.id)}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
          accent
            ? "border-primary/60 text-primary hover:bg-primary/10"
            : "border-white/15 text-white/60 hover:border-white/35 hover:text-white"
        }`}
      >
        <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span className="hidden sm:inline">Download</span>
      </a>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const jobId = Number(id);
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const jobQuery = trpc.jobs.get.useQuery({ id: jobId }, { refetchInterval: 10000 });
  const addMessage = trpc.jobs.addMessage.useMutation({
    onSuccess: () => utils.jobs.get.invalidate({ id: jobId }),
  });
  const deleteJob = trpc.jobs.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted");
      navigate("/jobs");
    },
  });

  const [draft, setDraft] = useState("");
  const job = jobQuery.data;

  if (jobQuery.isLoading) {
    return <p className="micro-label animate-pulse">LOADING…</p>;
  }
  if (!job) {
    return (
      <div className="surface p-14 text-center text-sm text-white/50">
        Job not found. <Link to="/jobs" className="text-primary">Back to jobs</Link>
      </div>
    );
  }

  const inbox = job.files.filter((f) => f.kind === "inbox");
  const outbox = job.files.filter((f) => f.kind === "outbox");

  const send = () => {
    const body = draft.trim();
    if (!body || addMessage.isPending) return;
    addMessage.mutate({ jobId, body });
    setDraft("");
  };

  return (
    <div>
      <Link
        to="/jobs"
        className="micro-label mb-6 inline-flex items-center gap-2 transition-colors hover:text-white/70"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All jobs
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{job.title}</h1>
          <p className="micro-label mt-2">
            Created {format(new Date(job.createdAt), "MMM d, yyyy · HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={job.status} />
          <button
            onClick={() => {
              if (window.confirm("Delete this job and all its files?")) {
                deleteJob.mutate({ id: jobId });
              }
            }}
            className="text-white/30 transition-colors hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {job.instructions && (
        <section className="mb-8">
          <p className="micro-label mb-3">Instructions</p>
          <div className="surface p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
              {job.instructions}
            </p>
          </div>
        </section>
      )}

      <section className="mb-8">
        <p className="micro-label mb-3">Raw footage · {inbox.length}</p>
        <div className="flex flex-col gap-2">
          {inbox.map((f) => (
            <FileRow key={f.id} f={f} />
          ))}
          {inbox.length === 0 && (
            <p className="text-sm text-white/40">No raw files attached.</p>
          )}
        </div>
      </section>

      <section className="mb-10">
        <p className="micro-label mb-3">Finished · {outbox.length}</p>
        <div className="flex flex-col gap-2">
          {outbox.map((f) => (
            <FileRow key={f.id} f={f} accent />
          ))}
          {outbox.length === 0 && (
            <div className="surface border-dashed p-6 text-center text-sm text-white/40">
              Nothing here yet — Kimi drops finished edits into this section.
            </div>
          )}
        </div>
      </section>

      <section>
        <p className="micro-label mb-3">Thread · {job.messages.length}</p>
        <div className="flex flex-col gap-4">
          {job.messages.map((m) => (
            <div
              key={m.id}
              className={`border-l-2 py-1 pl-4 ${
                m.author === "kimi" ? "border-primary" : "border-white/25"
              }`}
            >
              <p className="micro-label">
                {m.author === "kimi" ? "Kimi" : "You"} ·{" "}
                {format(new Date(m.createdAt), "MMM d, HH:mm")}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                {m.body}
              </p>
            </div>
          ))}
          {job.messages.length === 0 && (
            <p className="text-sm text-white/40">
              No messages yet — add follow-up instructions below. Kimi replies here while working.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-end gap-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Follow-up instructions… (e.g. “make the hook faster”, “Arabic subs instead”)"
            className="rounded-lg border-white/15 bg-white/[0.04] text-sm placeholder:text-white/25 focus-visible:ring-primary/60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
          />
          <Button
            onClick={send}
            disabled={!draft.trim() || addMessage.isPending}
            className="h-10 shrink-0 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="micro-label mt-2">Ctrl+Enter to send</p>
      </section>
    </div>
  );
}
