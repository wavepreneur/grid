import Link from "next/link";
import { EyeOff, Lock } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  lede?: string;
  /** Locked teasers are web-only; a forwarded PDF shows only real findings. */
  printHidden?: boolean;
  children: ReactNode;
};

export function ReportSection({ id, title, lede, printHidden, children }: Props) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={`flex flex-col gap-4 break-inside-avoid ${printHidden ? "print:hidden" : ""}`}
    >
      <div className="flex flex-col gap-1">
        <h2
          id={`${id}-title`}
          className="font-display text-[22px] font-semibold tracking-[-0.01em] text-[#13261F]"
        >
          {title}
        </h2>
        {lede ? <p className="max-w-[64ch] leading-relaxed text-[#3E4D47]">{lede}</p> : null}
      </div>
      <div className="rounded-2xl border border-[#E6E1D6] bg-white p-6 wide:p-8">{children}</div>
    </section>
  );
}

export function ExcludedNote({ text }: { text: string }) {
  return (
    <p className="mt-5 flex items-center gap-1.5 border-t border-[#EFEBE2] pt-4 text-xs text-[#56655E]">
      <EyeOff aria-hidden size={13} className="shrink-0" />
      {text}
    </p>
  );
}

export function LockedSection({
  badge,
  text,
  cta,
  href,
}: {
  badge: string;
  text: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#F1EDE4] text-[#56655E]">
          <Lock aria-hidden size={15} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#56655E]">{badge}</span>
          <p className="max-w-[56ch] leading-snug text-[#3E4D47]">{text}</p>
        </div>
      </div>
      <Link
        href={href}
        className="shrink-0 self-start rounded-full border border-[#0F5C4A] px-4 py-2 text-sm font-medium text-[#0F5C4A] transition-colors hover:bg-[#0F5C4A] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5C4A] sm:self-center print:hidden"
      >
        {cta}
      </Link>
    </div>
  );
}
