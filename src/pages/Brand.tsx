import { useEffect, useRef, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { downloadUrl, formatBytes, uploadFile } from "@/lib/api";
import { FileGlyph, PageHeader } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BrandForm = { primary: string; background: string; text: string; notes: string };

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-[2px] border border-white/15 bg-transparent p-1"
      />
      <div className="flex-1">
        <p className="micro-label mb-1">{label}</p>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 rounded-lg border-white/15 bg-white/[0.04] font-mono text-[13px] focus-visible:ring-primary/60"
        />
      </div>
    </div>
  );
}

export default function Brand() {
  const utils = trpc.useUtils();
  const brandQuery = trpc.brand.get.useQuery();
  const filesQuery = trpc.brand.files.useQuery();
  const update = trpc.brand.update.useMutation({
    onSuccess: () => {
      utils.brand.get.invalidate();
      toast.success("Brand kit saved — Kimi will use it on the next edit.");
    },
  });
  const delFile = trpc.files.delete.useMutation({
    onSuccess: () => utils.brand.files.invalidate(),
  });

  const [form, setForm] = useState<BrandForm | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (brandQuery.data && !form) setForm(brandQuery.data as BrandForm);
  }, [brandQuery.data, form]);

  const assets = filesQuery.data ?? [];

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      setUploading(file.name);
      try {
        await uploadFile(file, { kind: "brand" });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(null);
    utils.brand.files.invalidate();
    toast.success("Brand assets uploaded");
  };

  if (!form) return <p className="micro-label animate-pulse">LOADING…</p>;

  return (
    <div>
      <PageHeader
        title="Brand Kit"
        meta="Kimi loads this before every edit — colors, assets, house rules"
      />

      <section className="mb-8">
        <p className="micro-label mb-3">Colors</p>
        <div className="surface grid gap-5 p-5 sm:grid-cols-3">
          <ColorField
            label="Primary / accent"
            value={form.primary}
            onChange={(v) => setForm({ ...form, primary: v })}
          />
          <ColorField
            label="Background"
            value={form.background}
            onChange={(v) => setForm({ ...form, background: v })}
          />
          <ColorField
            label="Text"
            value={form.text}
            onChange={(v) => setForm({ ...form, text: v })}
          />
        </div>
      </section>

      <section className="mb-8">
        <p className="micro-label mb-3">House rules for Kimi</p>
        <Textarea
          rows={6}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder={
            "e.g. Subtitles: bold, boxed highlight on the current word.\nMusic: upbeat but never cheesy corporate.\nAlways end with the Fairs in China logo.\nNever use stock-looking b-roll of handshakes."
          }
          className="rounded-lg border-white/15 bg-white/[0.04] text-sm placeholder:text-white/25 focus-visible:ring-primary/60"
        />
        <div className="mt-4">
          <Button
            onClick={() => update.mutate(form)}
            disabled={update.isPending}
            className="h-10 rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {update.isPending ? "Saving…" : "Save brand kit"}
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="micro-label">Assets · {assets.length}</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="micro-label flex items-center gap-2 transition-colors hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {uploading ? `Uploading ${uploading}…` : "Add logo / photos / fonts"}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {assets.length === 0 ? (
          <div className="surface border-dashed p-10 text-center text-sm text-white/40">
            No assets yet — upload your logo, a few good photos of yourself, and any fonts you love.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {assets.map((f) => {
              const isImage = f.mime?.startsWith("image/");
              return (
                <div key={f.id} className="group surface relative aspect-square overflow-hidden">
                  {isImage ? (
                    <img
                      src={downloadUrl(f.id)}
                      alt={f.filename}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                      <FileGlyph mime={f.mime} filename={f.filename} />
                      <p className="w-full truncate text-center font-mono text-[10px] text-white/50">
                        {f.filename}
                      </p>
                      <p className="micro-label">{formatBytes(Number(f.sizeBytes))}</p>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="truncate font-mono text-[10px] text-white/70">
                      {f.filename}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <a href={`${downloadUrl(f.id)}?download=1`} className="text-white/70 hover:text-white">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${f.filename}?`)) delFile.mutate({ id: f.id });
                        }}
                        className="text-white/50 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
