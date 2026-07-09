import Link from "next/link";
import type { ReactNode } from "react";
import { OrgSwitcher } from "@/components/cms/org-switcher";
import type { StudioOrganization } from "@/lib/cms/types";

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/dev", label: "Dev" },
];

type AdminShellProps = {
  organizations: StudioOrganization[];
  currentOrgSlug: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  activePath: string;
};

export function AdminShell({
  organizations,
  currentOrgSlug,
  title,
  description,
  actions,
  children,
  activePath,
}: AdminShellProps) {
  return (
    <div className="studio-bg min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="studio-sidebar hidden w-64 shrink-0 flex-col border-r border-[var(--grid-border)] p-6 lg:flex">
          <div className="mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--grid-accent)]">
              GRID Studio
            </p>
            <p className="mt-2 text-lg font-semibold text-white">CMS</p>
            <p className="mt-1 text-xs leading-5 text-[var(--grid-muted)]">
              Content &amp; Events — getrennt von Live-Runs
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const active = item.exact
                ? activePath === item.href
                : activePath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--grid-accent-soft)] text-[var(--grid-accent)]"
                      : "text-[var(--grid-muted)] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <OrgSwitcher organizations={organizations} currentSlug={currentOrgSlug} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[var(--grid-border)] px-6 py-5 lg:px-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
                {description ? (
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--grid-muted)]">
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full border border-[var(--grid-border)] px-3 py-1 text-xs text-[var(--grid-muted)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function StudioPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`grid-panel rounded-2xl p-6 ${className}`}>{children}</section>
  );
}

export function StudioBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "live" | "draft" | "warn";
}) {
  const tones = {
    default: "border-[var(--grid-border)] bg-white/5 text-[var(--grid-muted)]",
    live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    draft: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    warn: "border-red-500/30 bg-red-500/10 text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
