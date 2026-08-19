import { Film, Image, Music, File as FileIcon, Type } from "lucide-react";

export function FileGlyph({ mime, filename }: { mime?: string | null; filename?: string }) {
  const ext = (filename?.split(".").pop() || "").toLowerCase();
  let Icon = FileIcon;
  if (mime?.startsWith("video/") || ["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) {
    Icon = Film;
  } else if (mime?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext)) {
    Icon = Image;
  } else if (mime?.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "ogg"].includes(ext)) {
    Icon = Music;
  } else if (["ttf", "otf", "woff", "woff2"].includes(ext)) {
    Icon = Type;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04]">
      <Icon className="h-4 w-4 text-white/60" strokeWidth={1.5} />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  new: "border-white/25 text-white/70",
  downloading: "border-primary/50 text-primary",
  editing: "border-primary/50 text-primary",
  done: "border-primary bg-primary text-primary-foreground",
  failed: "border-destructive/60 text-destructive",
  cancelled: "border-white/15 text-white/35",
};

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.new;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.14em] ${style}`}
    >
      {status}
    </span>
  );
}

export function PageHeader({
  title,
  meta,
  right,
}: {
  title: string;
  meta?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {meta && <p className="micro-label mt-2">{meta}</p>}
      </div>
      {right}
    </div>
  );
}
