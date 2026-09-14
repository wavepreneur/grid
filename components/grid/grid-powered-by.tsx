import Link from "next/link";

type Props = {
  href?: string;
  className?: string;
};

/** Quiet credit on player and organizer surfaces — always the GRID homepage. */
export function GridPoweredBy({ href = "/", className = "" }: Props) {
  return (
    <p className={`text-center text-[11px] tracking-[0.16em] text-slate-400 ${className}`}>
      <Link href={href} className="transition hover:text-teal-800">
        Powered by <span className="font-semibold tracking-[0.12em]">GRID</span>
      </Link>
    </p>
  );
}
