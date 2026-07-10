import Link from "next/link";
import type { ReactNode } from "react";

type CockpitShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export function CockpitShell({
  title,
  description,
  actions,
  children,
  wide = false,
}: CockpitShellProps) {
  return (
    <div className="grid-bg min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div
        className={`mx-auto flex w-full flex-col gap-6 ${wide ? "max-w-5xl" : "max-w-4xl"}`}
      >
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
              O
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                Operator-Cockpit
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
              ) : null}
            </div>
          </div>
          {actions}
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </section>
      </div>
    </div>
  );
}

export function CockpitSection({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function CockpitLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="font-medium text-teal-600 underline-offset-2 hover:text-teal-700 hover:underline"
    >
      {children}
    </Link>
  );
}
