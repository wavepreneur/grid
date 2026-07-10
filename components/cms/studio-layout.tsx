"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { listGames, listTemplates } from "@/app/actions/cms/games";
import { listTasks } from "@/app/actions/cms/tasks";
import { listTicketPools } from "@/app/actions/cms/tickets";
import { getStudioDashboardStats } from "@/app/actions/cms/tickets";
import { queryKeys } from "@/lib/platform/query-keys";

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

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StudioNavLink({
  href,
  label,
  icon,
  active,
  mobile,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  mobile?: boolean;
}) {
  const queryClient = useQueryClient();

  function prefetchRoute() {
    if (href === "/admin") {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.studio.dashboard(),
        queryFn: async () => {
          const result = await getStudioDashboardStats();
          if (!result.success) throw new Error(result.error);
          return result.data!;
        },
      });
      return;
    }
    if (href === "/admin/games") {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.games.list(),
        queryFn: async () => {
          const result = await listGames();
          if (!result.success) throw new Error(result.error);
          return result.data!;
        },
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.games.templates(),
        queryFn: async () => {
          const result = await listTemplates();
          if (!result.success) throw new Error(result.error);
          return result.data!;
        },
      });
      return;
    }
    if (href === "/admin/tasks") {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.tasks.list(),
        queryFn: async () => {
          const result = await listTasks();
          if (!result.success) throw new Error(result.error);
          return result.data!;
        },
      });
      return;
    }
    if (href === "/admin/tickets") {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.tickets.list(),
        queryFn: async () => {
          const result = await listTicketPools();
          if (!result.success) throw new Error(result.error);
          return result.data!;
        },
      });
    }
  }

  if (mobile) {
    return (
      <Link
        href={href}
        prefetch
        onMouseEnter={prefetchRoute}
        onFocus={prefetchRoute}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
          active
            ? "border-teal-200 bg-teal-50 text-teal-700"
            : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={prefetchRoute}
      onFocus={prefetchRoute}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-teal-50 text-teal-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className={active ? "text-teal-600" : "text-slate-400"}>{icon}</span>
      <span className="flex-1">{label}</span>
      <NavPendingDot />
    </Link>
  );
}

function NavPendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-teal-500" aria-hidden />
  );
}

export function StudioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { organizations, orgSlug } = useStudioShell();

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
            {NAV.map((item) => (
              <StudioNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavActive(pathname, item.href, item.exact)}
              />
            ))}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <OrgSwitcher organizations={organizations} currentSlug={orgSlug} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

export function StudioMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
      {NAV.map((item) => (
        <StudioNavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={isNavActive(pathname, item.href, item.exact)}
          mobile
        />
      ))}
    </nav>
  );
}
