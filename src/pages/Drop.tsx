import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { uploadFile, formatBytes } from "@/lib/api";
import { FileGlyph, StatusPill, PageHeader } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type QueueItem = {
  id: string;
  file: File;
  sent: number;
  status: "queued" | "uploading" | "done" | "error";
};

export default function Drop() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const jobsQuery = trpc.jobs.list.useQuery();
  const createJob = trpc.jobs.create.useMutation();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const jobIdRef = useRef<number | null>(null);

  const addFiles = (list: FileList | File[]) => {
    const items = Array.from(list).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      sent: 0,
      status: "queued" as const,
    }));
    if (items.length) {
      setQueue((q) => [...q, ...items]);
      if (!title) setTitle(items[0].file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const setItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const totalBytes = queue.reduce((s, i) => s + i.file.size, 0);
  const totalSent = queue.reduce((s, i) => s + Math.min(i.sent, i.file.size), 0);
  const pct = totalBytes ? Math.round((totalSent / totalBytes) * 100) : 0;

  const jobs = jobsQuery.data ?? [];
  const stored = jobs.reduce(
    (s, j) => s + j.files.reduce((a, f) => a + Number(f.sizeBytes), 0),
    0,
  );

  const send = async () => {
    if (!queue.length || sending) return;
    setSending(true);
    try {
      if (!jobIdRef.current) {
        jobIdRef.current = await createJob.mutateAsync({
          title: title.trim() || "Untitled job",
          instructions: instructions.trim() || undefined,
        });
      }
      const jobId = jobIdRef.current;
      for (const item of queue) {
        if (item.status === "done") continue;
        setItem(item.id, { status: "uploading" });
        await uploadFile(item.file, {
          jobId,
          kind: "inbox",
          onProgress: (sent) => setItem(item.id, { sent }),
        });
        setItem(item.id, { status: "done", sent: item.file.size });
      }
      toast.success("Footage received — Kimi can start.");
      utils.jobs.list.invalidate();
      navigate(`/jobs/${jobId}`);
    } catch {
      toast.error("Upload interrupted — press send again, finished files are kept.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Drop footage."
        meta={`Jobs ${jobs.length} · Stored ${formatBytes(stored)}`}
      />

      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[2px] border border-dashed p-8 text-center transition-colors duration-300 ${
          dragging ? "border-primary bg-primary/[0.06]" : "border-white/20 hover:border-white/40"
        }`}
      >
        <p className="font-display text-xl font-bold tracking-tight">
          {dragging ? "Let go — it's ours." : "Drop footage here"}
        </p>
        <p className="micro-label">
          Or tap to browse · multi-file · GB-sized OK · resumes on flaky networks
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {queue.map((item) => {
            const p = item.file.size
              ? Math.min(100, Math.round((item.sent / item.file.size) * 100))
              : 0;
            return (
              <div key={item.id} className="surface flex items-center gap-4 p-3">
                <FileGlyph mime={item.file.type} filename={item.file.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    <p className="shrink-0 font-mono text-[11px] text-white/50">
                      {item.status === "done" ? "DONE" : `${p}%`} · {formatBytes(item.file.size)}
                    </p>
                  </div>
                  <div className="mt-2 h-px bg-white/10">
                    <div
                      className={`h-px transition-all duration-300 ${
                        item.status === "error" ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
                {!sending && (
                  <button
                    onClick={() => setQueue((q) => q.filter((i) => i.id !== item.id))}
                    className="text-white/30 transition-colors hover:text-white/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 flex flex-col gap-3">
        <label className="micro-label" htmlFor="job-title">Job title</label>
        <Input
          id="job-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Canton Fair booth 9.3 — 3 clips"
          className="h-11 rounded-lg border-white/15 bg-white/[0.04] text-sm focus-visible:ring-primary/60"
        />
        <label className="micro-label mt-3" htmlFor="job-instructions">
          Instructions for Kimi
        </label>
        <Textarea
          id="job-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder={
            "Tell me what to make of this footage — e.g.:\n· Cut a 45s vertical reel, English subs, energetic\n· Arabic voiceover version too\n· Thumbnail with me pointing at the machine"
          }
          className="rounded-lg border-white/15 bg-white/[0.04] text-sm placeholder:text-white/25 focus-visible:ring-primary/60"
        />
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] text-white/40">
            {queue.length
              ? `${queue.length} file${queue.length > 1 ? "s" : ""} · ${formatBytes(totalBytes)}${
                  sending ? ` · ${pct}%` : ""
                }`
              : "Add files to enable send"}
          </p>
          <Button
            onClick={send}
            disabled={!queue.length || sending}
            className="h-11 rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {sending ? `Sending ${pct}%` : "Send to Kimi"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <div className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <p className="micro-label">Recent jobs</p>
            <Link to="/jobs" className="micro-label transition-colors hover:text-white/70">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {jobs.slice(0, 3).map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="group surface surface-hover flex items-center gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="micro-label mt-1">
                    {job.files.length} files · {format(new Date(job.createdAt), "MMM d, HH:mm")}
                  </p>
                </div>
                <StatusPill status={job.status} />
                <ArrowUpRight className="h-4 w-4 -translate-x-1 text-white/60 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
