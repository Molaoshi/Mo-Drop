import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, ArrowUpRight, Clapperboard, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { uploadFile, formatBytes } from "@/lib/api";
import {
  DEFAULT_JOB_SPEC,
  SPOKEN_LANGUAGE_LABELS,
  MUSIC_LABELS,
  END_CARD_LABELS,
  type JobSpec,
  type SpokenLanguage,
  type SubLanguage,
  type MusicChoice,
  type EndCardChoice,
} from "@contracts/types";
import { FileGlyph, StatusPill, PageHeader } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QueueItem = {
  id: string;
  file: File;
  kind: "main" | "broll";
  sent: number;
  status: "queued" | "uploading" | "done" | "error";
};

// Shown until formMeta arrives (and as a fallback if the presets table is empty)
const FALLBACK_PRESETS = [
  { key: "customer-update", label: "Customer update" },
  { key: "expo-reel", label: "Expo reel" },
  { key: "expo-walkthrough", label: "Expo walkthrough" },
  { key: "factory-tour", label: "Factory tour" },
  { key: "talking-head", label: "Talking head" },
  { key: "product-demo", label: "Product demo" },
];

const selectTriggerClass =
  "h-11 w-full rounded-lg border-white/15 bg-white/[0.04] text-sm focus:ring-primary/60";
const inputClass =
  "h-11 rounded-lg border-white/15 bg-white/[0.04] text-sm focus-visible:ring-primary/60";

export default function Drop() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const jobsQuery = trpc.jobs.list.useQuery();
  const formMetaQuery = trpc.jobs.formMeta.useQuery();
  const createJob = trpc.jobs.create.useMutation();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [spec, setSpec] = useState<JobSpec>(DEFAULT_JOB_SPEC);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const brollInputRef = useRef<HTMLInputElement>(null);
  const jobIdRef = useRef<number | null>(null);
  const defaultsApplied = useRef(false);

  // Adopt server defaults once (don't clobber anything the user already touched)
  useEffect(() => {
    if (formMetaQuery.data && !defaultsApplied.current) {
      defaultsApplied.current = true;
      setSpec((s) => ({ ...formMetaQuery.data.defaults, ...s }));
    }
  }, [formMetaQuery.data]);

  const presets =
    formMetaQuery.data?.presets?.length ? formMetaQuery.data.presets : FALLBACK_PRESETS;

  const setSpecField = <K extends keyof JobSpec>(key: K, value: JobSpec[K]) =>
    setSpec((s) => ({ ...s, [key]: value }));

  const toggleSubtitle = (lang: SubLanguage) =>
    setSpec((s) => ({
      ...s,
      subtitles: s.subtitles.includes(lang)
        ? s.subtitles.filter((l) => l !== lang)
        : [...s.subtitles, lang],
    }));

  const addFiles = (list: FileList | File[], kind: "main" | "broll") => {
    const items = Array.from(list).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      kind,
      sent: 0,
      status: "queued" as const,
    }));
    if (items.length) {
      setQueue((q) => [...q, ...items]);
      if (kind === "main" && !title) setTitle(items[0].file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const setItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const totalBytes = queue.reduce((s, i) => s + i.file.size, 0);
  const totalSent = queue.reduce((s, i) => s + Math.min(i.sent, i.file.size), 0);
  const pct = totalBytes ? Math.round((totalSent / totalBytes) * 100) : 0;
  const hasMain = queue.some((i) => i.kind === "main");

  const jobs = jobsQuery.data ?? [];
  const stored = jobs.reduce(
    (s, j) => s + j.files.reduce((a, f) => a + Number(f.sizeBytes), 0),
    0,
  );

  const send = async () => {
    if (!hasMain || sending) return;
    setSending(true);
    try {
      if (!jobIdRef.current) {
        jobIdRef.current = await Promise.race([
          createJob.mutateAsync({
            title: title.trim() || "Untitled job",
            instructions: instructions.trim() || undefined,
            spec,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("job create timed out")), 30_000),
          ),
        ]);
      }
      const jobId = jobIdRef.current;
      for (const item of queue) {
        if (item.status === "done") continue;
        setItem(item.id, { status: "uploading" });
        try {
          await uploadFile(item.file, {
            jobId,
            kind: item.kind === "broll" ? "broll" : "inbox",
            onProgress: (sent) => setItem(item.id, { sent }),
          });
        } catch (err) {
          setItem(item.id, { status: "error" });
          throw err;
        }
        setItem(item.id, { status: "done", sent: item.file.size });
      }
      toast.success("Footage received — Kimi can start.");
      utils.jobs.list.invalidate();
      navigate(`/jobs/${jobId}`);
    } catch {
      toast.error("Upload stalled — connection problem. Press Send to Kimi again to resume; finished parts are kept.");
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

      {/* Dropzone — main footage */}
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
          addFiles(e.dataTransfer.files, "main");
        }}
        className={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[2px] border border-dashed p-8 text-center transition-colors duration-300 ${
          dragging ? "border-primary bg-primary/[0.06]" : "border-white/20 hover:border-white/40"
        }`}
      >
        <p className="font-display text-xl font-bold tracking-tight">
          {dragging ? "Let go — it's ours." : "Drop footage here"}
        </p>
        <p className="micro-label">
          Main footage · multi-file · GB-sized OK · resumes on flaky networks
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files, "main");
            e.target.value = "";
          }}
        />
      </div>

      {/* Own b-roll (optional) */}
      <button
        type="button"
        onClick={() => brollInputRef.current?.click()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[2px] border border-dashed border-white/15 p-4 text-white/50 transition-colors hover:border-white/35 hover:text-white/80"
      >
        <Clapperboard className="h-4 w-4" strokeWidth={1.5} />
        <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
          Add your own b-roll clips (optional)
        </span>
      </button>
      <input
        ref={brollInputRef}
        type="file"
        multiple
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, "broll");
          e.target.value = "";
        }}
      />

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
                    <p className="truncate text-sm font-medium">
                      {item.file.name}
                      {item.kind === "broll" && (
                        <span className="ml-2 rounded-sm border border-primary/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                          b-roll
                        </span>
                      )}
                    </p>
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

      {/* Job title */}
      <div className="mt-6 flex flex-col gap-3">
        <label className="micro-label" htmlFor="job-title">Job title</label>
        <Input
          id="job-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Canton Fair booth 9.3 — 3 clips"
          className={inputClass}
        />
      </div>

      {/* Structured spec */}
      <div className="mt-8">
        <p className="micro-label mb-4">Edit spec — defaults are pre-filled, change only what differs</p>
        <div className="surface flex flex-col gap-5 p-5">
          {/* Style preset */}
          <div className="flex flex-col gap-2">
            <label className="micro-label">Style preset</label>
            <Select
              value={spec.preset}
              onValueChange={(v) => setSpecField("preset", v)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spoken language */}
          <div className="flex flex-col gap-2">
            <label className="micro-label">Spoken language in footage</label>
            <Select
              value={spec.spokenLanguage}
              onValueChange={(v) => setSpecField("spokenLanguage", v as SpokenLanguage)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SPOKEN_LANGUAGE_LABELS) as SpokenLanguage[]).map((k) => (
                  <SelectItem key={k} value={k}>{SPOKEN_LANGUAGE_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subtitles */}
          <div className="flex flex-col gap-2">
            <label className="micro-label">Subtitles</label>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(["zh", "en", "ar"] as SubLanguage[]).map((lang) => (
                <label key={lang} className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                  <Checkbox
                    checked={spec.subtitles.includes(lang)}
                    onCheckedChange={() => toggleSubtitle(lang)}
                  />
                  {lang === "zh" ? "中文" : lang === "en" ? "English" : "العربية"}
                </label>
              ))}
            </div>
          </div>

          {/* Music */}
          <div className="flex flex-col gap-2">
            <label className="micro-label">Music</label>
            <Select
              value={spec.music}
              onValueChange={(v) => setSpecField("music", v as MusicChoice)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MUSIC_LABELS) as MusicChoice[]).map((k) => (
                  <SelectItem key={k} value={k}>{MUSIC_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title card */}
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
              <Checkbox
                checked={spec.titleCard.enabled}
                onCheckedChange={(c) =>
                  setSpecField("titleCard", { ...spec.titleCard, enabled: c === true })
                }
              />
              0.5s AI title card with my face
            </label>
            {spec.titleCard.enabled && (
              <Input
                value={spec.titleCard.hook}
                onChange={(e) =>
                  setSpecField("titleCard", { ...spec.titleCard, hook: e.target.value })
                }
                placeholder="Hook line — empty = Kimi writes a bold claim"
                className={inputClass}
              />
            )}
          </div>

          {/* AI b-roll */}
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
              <Checkbox
                checked={spec.aiBroll.enabled}
                onCheckedChange={(c) =>
                  setSpecField("aiBroll", { ...spec.aiBroll, enabled: c === true })
                }
              />
              AI-generated b-roll insert
            </label>
            {spec.aiBroll.enabled && (
              <Input
                value={spec.aiBroll.prompt}
                onChange={(e) =>
                  setSpecField("aiBroll", { ...spec.aiBroll, prompt: e.target.value })
                }
                placeholder="Describe the shot, e.g. drone over factory at dusk"
                className={inputClass}
              />
            )}
          </div>

          {/* Stock b-roll */}
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
              <Checkbox
                checked={spec.stockBroll.enabled}
                onCheckedChange={(c) =>
                  setSpecField("stockBroll", { ...spec.stockBroll, enabled: c === true })
                }
              />
              Stock b-roll (Pexels)
            </label>
            {spec.stockBroll.enabled && (
              <Input
                value={spec.stockBroll.keywords}
                onChange={(e) =>
                  setSpecField("stockBroll", { ...spec.stockBroll, keywords: e.target.value })
                }
                placeholder="Search keywords, e.g. auto parts warehouse"
                className={inputClass}
              />
            )}
          </div>

          {/* Title bar */}
          <div className="flex flex-col gap-2">
            <label className="micro-label" htmlFor="title-bar">Title bar text</label>
            <Input
              id="title-bar"
              value={spec.titleBar}
              onChange={(e) => setSpecField("titleBar", e.target.value)}
              placeholder="e.g. Guangzhou Auto Parts Expo — empty = Kimi derives it"
              className={inputClass}
            />
          </div>

          {/* End card */}
          <div className="flex flex-col gap-2">
            <label className="micro-label">End card ("comment for contact" CTA)</label>
            <Select
              value={spec.endCard}
              onValueChange={(v) => setSpecField("endCard", v as EndCardChoice)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(END_CARD_LABELS) as EndCardChoice[]).map((k) => (
                  <SelectItem key={k} value={k}>{END_CARD_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Extra instructions */}
      <div className="mt-6 flex flex-col gap-3">
        <label className="micro-label" htmlFor="job-instructions">
          Extra instructions (optional)
        </label>
        <Textarea
          id="job-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder={
            "Anything the form doesn't cover — e.g.:\n· Cut a 45s vertical version too\n· Focus on the CNC machines, skip the office\n· Thumbnail with me pointing at the machine"
          }
          className="rounded-lg border-white/15 bg-white/[0.04] text-sm placeholder:text-white/25 focus-visible:ring-primary/60"
        />
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] text-white/40">
            {queue.length
              ? `${queue.length} file${queue.length > 1 ? "s" : ""} · ${formatBytes(totalBytes)}${
                  sending ? ` · ${pct}%` : ""
                }`
              : "Add main footage to enable send"}
          </p>
          <Button
            onClick={send}
            disabled={!hasMain || sending}
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
