import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { ReportCopy } from "@/components/report/report-copy";

const CARD = "rounded-2xl border border-[#E6E1D6] bg-white";

function Bone({ className }: { className: string }) {
  return <span aria-hidden className={`block rounded-md bg-[#EFEBE2] motion-safe:animate-pulse ${className}`} />;
}

export function ReportSkeleton({ copy }: { copy: ReportCopy }) {
  return (
    <div role="status" aria-label={copy.states.loading} className="flex flex-col gap-10">
      <div className={`${CARD} flex flex-col gap-6 p-8 wide:p-10`}>
        <div className="flex items-end gap-8">
          <Bone className="h-20 w-36" />
          <Bone className="h-7 w-80 max-w-full" />
        </div>
        <div className="flex flex-col gap-4 border-t border-[#E6E1D6] pt-6">
          {[0, 1, 2].map((row) => (
            <Bone key={row} className="h-5 w-full" />
          ))}
        </div>
      </div>
      <div className={`${CARD} flex flex-col gap-3 p-8`}>
        {[0, 1, 2, 3].map((row) => (
          <Bone key={row} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ReportProcessing({ copy }: { copy: ReportCopy }) {
  return (
    <div role="status" className={`${CARD} flex flex-col items-start gap-3 p-8 wide:p-10`}>
      <span className="flex items-center gap-2 text-sm font-medium text-[#0F5C4A]">
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inset-0 rounded-full bg-[#0F5C4A] opacity-60 motion-safe:animate-ping" />
          <span className="relative size-2.5 rounded-full bg-[#0F5C4A]" />
        </span>
        {copy.states.processingTitle}
      </span>
      <p className="max-w-[56ch] leading-relaxed text-[#3E4D47]">{copy.states.processing}</p>
    </div>
  );
}

export function ReportError({ copy, retryHref }: { copy: ReportCopy; retryHref: string }) {
  return (
    <div role="alert" className={`${CARD} flex flex-col items-start gap-4 p-8 wide:p-10`}>
      <span className="flex items-center gap-2 font-semibold text-[#A3412E]">
        <AlertCircle aria-hidden size={18} />
        {copy.states.errorTitle}
      </span>
      <p className="max-w-[56ch] leading-relaxed text-[#3E4D47]">{copy.states.error}</p>
      <Link
        href={retryHref}
        className="rounded-full bg-[#0F5C4A] px-4 py-2 text-sm font-medium text-white hover:bg-[#0B4A3B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5C4A]"
      >
        {copy.states.retry}
      </Link>
    </div>
  );
}
