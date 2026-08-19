import { Link } from "react-router";
import { ArrowUpRight, LayoutList } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/providers/trpc";
import { formatBytes } from "@/lib/api";
import { StatusPill, PageHeader } from "@/components/bits";

export default function Jobs() {
  const jobsQuery = trpc.jobs.list.useQuery(undefined, { refetchInterval: 15000 });
  const jobs = jobsQuery.data ?? [];

  return (
    <div>
      <PageHeader title="Jobs" meta={`Count: ${jobs.length}`} />

      {jobs.length === 0 && !jobsQuery.isLoading && (
        <div className="surface flex flex-col items-center gap-3 p-14 text-center">
          <LayoutList className="h-5 w-5 text-white/30" strokeWidth={1.5} />
          <p className="text-sm text-white/50">
            No jobs yet — drop footage on the home page and it lands here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const inbox = job.files.filter((f) => f.kind === "inbox");
          const outbox = job.files.filter((f) => f.kind === "outbox");
          const size = job.files.reduce((s, f) => s + Number(f.sizeBytes), 0);
          return (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="group surface surface-hover relative flex items-center gap-4 overflow-hidden p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{job.title}</p>
                {job.instructions && (
                  <p className="mt-0.5 truncate text-[13px] text-white/40">
                    {job.instructions}
                  </p>
                )}
                <p className="micro-label mt-1.5">
                  {inbox.length} raw{outbox.length > 0 ? ` · ${outbox.length} finished` : ""}
                  {" · "}
                  {formatBytes(size)} · {format(new Date(job.createdAt), "MMM d, HH:mm")}
                </p>
              </div>
              <StatusPill status={job.status} />
              <div className="flex h-9 w-9 shrink-0 translate-x-2 items-center justify-center rounded-full border border-white/15 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
