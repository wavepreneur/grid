import Link from "next/link";
import type { ReactNode } from "react";
import { OrgSwitcher } from "@/components/cms/org-switcher";
import { ProductNav } from "@/components/platform/product-nav";
import {
  IconCode,
  IconGamepad,
  IconHome,
  IconPuzzle,
  IconTicket,
} from "@/components/cms/studio-icons";
import type { StudioOrganization } from "@/lib/cms/types";

const NAV: Array<{
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
}> = [
  { href: "/admin", label: "Übersicht", exact: true, icon: <IconHome size={18} /> },
  { href: "/admin/games", label: "Spiele", icon: <IconGamepad size={18} /> },
  { href: "/admin/tasks", label: "Aufgaben", icon: <IconPuzzle size={18} /> },
  { href: "/admin/tickets", label: "Tickets", icon: <IconTicket size={18} /> },
  { href: "/admin/dev", label: "Entwicklung", icon: <IconCode size={18} /> },
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
    <div className="studio-shell min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="border-b border-slate-100 px-5 py-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
                G
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">GRID Studio</p>
                <p className="text-xs text-slate-500">Inhalte verwalten</p>
              </div>
            </div>
          </div>

          <div className="px-3 pb-2">
            <ProductNav active="studio" compact />
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
            {NAV.map((item) => {
              const active = item.exact
                ? activePath === item.href
                : activePath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={active ? "text-teal-600" : "text-slate-400"}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <OrgSwitcher organizations={organizations} currentSlug={currentOrgSlug} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-6 py-5 lg:px-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                {description ? (
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
                ) : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {NAV.map((item) => {
                const active = item.exact
                  ? activePath === item.href
                  : activePath.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      active
                        ? "border-teal-200 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
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
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </section>
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
    default: "border-slate-200 bg-slate-50 text-slate-600",
    live: "border-emerald-200 bg-emerald-50 text-emerald-700",
    draft: "border-amber-200 bg-amber-50 text-amber-800",
    warn: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
