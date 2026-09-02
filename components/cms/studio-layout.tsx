"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Code2,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Ticket,
} from "lucide-react";
import { OrgSwitcher } from "@/components/cms/org-switcher";
import { useStudioConfirm } from "@/components/cms/shared/studio-confirm";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { useStudioUnsaved } from "@/components/cms/studio-unsaved";
import { getOrgCockpitOverview } from "@/app/actions/cockpit-overview";
import { listGames, listTemplates } from "@/app/actions/cms/games";
import { listTasks } from "@/app/actions/cms/tasks";
import { listTicketPools, getStudioDashboardStats } from "@/app/actions/cms/tickets";
import { getWorkforceDashboard } from "@/app/actions/data";
import { queryKeys } from "@/lib/platform/query-keys";

const SIDEBAR_COLLAPSED_KEY = "grid.studio.sidebarCollapsed";

type NavIcon = ComponentType<LucideProps>;

type NavItem = {
  href: string;
  label: string;
  note: string;
  icon: NavIcon;
  group?: string;
  match: (pathname: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Übersicht",
    note: "Alles auf einen Blick",
    icon: LayoutGrid,
    match: (p) => p === "/admin" || p === "/admin/",
  },
  {
    href: "/admin/tasks",
    label: "1. Aufgaben",
    note: "Bibliothek · einmal anlegen",
    icon: Puzzle,
    group: "GRID Studio",
    match: (p) => p.startsWith("/admin/tasks"),
  },
  {
    href: "/admin/games",
    label: "2. Spiele",
    note: "Aufgaben zu Layern verknüpfen",
    icon: LayoutGrid,
    match: (p) => p.startsWith("/admin/games"),
  },
  {
    href: "/admin/tickets",
    label: "Tickets",
    note: "Zugänge & Aktivierungen",
    icon: Ticket,
    match: (p) => p.startsWith("/admin/tickets"),
  },
  {
    href: "/cockpit",
    label: "GRID Cockpit",
    note: "Self-Healing · 0 % Eingriff",
    icon: Activity,
    group: "Autonomer Betrieb",
    match: (p) => p.startsWith("/cockpit"),
  },
  {
    href: "/data",
    label: "GRID Data",
    note: "Indizes & Benchmarks",
    icon: BarChart3,
    match: (p) => p.startsWith("/data"),
  },
  {
    href: "/admin/dev",
    label: "Entwicklung",
    note: "Debug & Tools",
    icon: Code2,
    group: "Intern",
    match: (p) => p.startsWith("/admin/dev"),
  },
];

function prefetchForHref(
  queryClient: ReturnType<typeof useQueryClient>,
  href: string,
  orgSlug: string,
) {
  if (href === "/admin") {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.studio.dashboard(orgSlug),
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
      queryKey: queryKeys.games.list(orgSlug),
      queryFn: async () => {
        const result = await listGames();
        if (!result.success) throw new Error(result.error);
        return result.data!;
      },
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.games.templates(orgSlug),
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
      queryKey: queryKeys.tasks.list(orgSlug),
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
      queryKey: queryKeys.tickets.list(orgSlug),
      queryFn: async () => {
        const result = await listTicketPools();
        if (!result.success) throw new Error(result.error);
        return result.data!;
      },
    });
    return;
  }
  if (href === "/cockpit") {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.cockpit.overview(),
      queryFn: async () => {
        const result = await getOrgCockpitOverview();
        if (!result.success) throw new Error(result.error);
        return result.data!;
      },
    });
    return;
  }
  if (href === "/data") {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.data.dashboard(),
      queryFn: async () => {
        const result = await getWorkforceDashboard();
        if (!result.success) throw new Error(result.error);
        return result.data!;
      },
    });
  }
}

function StudioNavLink({
  item,
  active,
  compact,
  collapsed,
  orgSlug,
  pathname,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  collapsed?: boolean;
  orgSlug: string;
  pathname: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm } = useStudioConfirm();
  const { isDirty } = useStudioUnsaved();
  const Icon = item.icon;

  const leavingEditor =
    (item.href === "/admin/tasks" && pathname.startsWith("/admin/tasks/")) ||
    (item.href === "/admin/games" && pathname.startsWith("/admin/games/"));

  async function guardLeave(event: MouseEvent<HTMLAnchorElement>) {
    if (!leavingEditor || !isDirty) return;
    event.preventDefault();
    const ok = await confirm({
      title: "Editor verlassen?",
      description: "Ungespeicherte Änderungen gehen verloren.",
      confirmLabel: "Zur Liste",
      cancelLabel: "Weiter bearbeiten",
      tone: "danger",
    });
    if (ok) router.push(item.href);
  }

  if (compact) {
    return (
      <Link
        href={item.href}
        prefetch
        onClick={(event) => void guardLeave(event)}
        onMouseEnter={() => prefetchForHref(queryClient, item.href, orgSlug)}
        onFocus={() => prefetchForHref(queryClient, item.href, orgSlug)}
        className={`tap-lift shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  if (collapsed) {
    return (
      <Link
        href={item.href}
        prefetch
        title={`${item.label} — ${item.note}`}
        onClick={(event) => void guardLeave(event)}
        onMouseEnter={() => prefetchForHref(queryClient, item.href, orgSlug)}
        onFocus={() => prefetchForHref(queryClient, item.href, orgSlug)}
        className={`tap-lift flex h-11 w-11 items-center justify-center rounded-2xl ${
          active
            ? "bg-primary text-primary-foreground shadow-soft"
            : "text-foreground hover:bg-secondary"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
        <span className="sr-only">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch
      onClick={(event) => void guardLeave(event)}
      onMouseEnter={() => prefetchForHref(queryClient, item.href, orgSlug)}
      onFocus={() => prefetchForHref(queryClient, item.href, orgSlug)}
      className={`tap-lift flex items-center gap-3 rounded-2xl px-3 py-3 ${
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{item.label}</span>
        <span className="block truncate text-xs opacity-70">{item.note}</span>
      </span>
      <NavPendingDot active={active} />
    </Link>
  );
}

function NavPendingDot({ active }: { active: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${
        active ? "bg-primary-foreground" : "bg-primary"
      }`}
      aria-hidden
    />
  );
}

export function StudioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { organizations, orgSlug } = useStudioShell();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="studio-shell min-h-screen bg-background text-foreground">
      {/* Mobile top + pills */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <p className="text-xl font-bold">GRID</p>
          <Link href="/" className="text-sm font-semibold text-primary">
            Spieleransicht
          </Link>
        </div>
        <div className="border-b border-border bg-card px-4 py-2.5">
          <OrgSwitcher
            organizations={organizations}
            currentSlug={orgSlug}
            placement="bottom"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-2">
          {NAV.map((item) => (
            <StudioNavLink
              key={item.href}
              item={item}
              active={item.match(pathname)}
              compact
              orgSlug={orgSlug}
              pathname={pathname}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[100rem]">
        <aside
          className={`studio-sidebar hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 ease-out lg:block ${
            hydrated && collapsed ? "w-[4.5rem]" : "w-[17rem]"
          }`}
        >
          <div
            className={`sticky top-0 flex h-screen flex-col ${
              hydrated && collapsed ? "items-center p-3" : "p-5"
            }`}
          >
            <div
              className={`mb-4 flex w-full ${
                hydrated && collapsed ? "flex-col items-center gap-2" : "items-start justify-between gap-2"
              }`}
            >
              <Link
                href="/admin"
                className={hydrated && collapsed ? "block text-center" : "min-w-0 flex-1"}
                title="GRID Backoffice"
              >
                {hydrated && collapsed ? (
                  <p className="text-lg font-bold leading-none">G</p>
                ) : (
                  <>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                      Backoffice
                    </p>
                    <p className="text-2xl font-bold">GRID</p>
                  </>
                )}
              </Link>
              <button
                type="button"
                onClick={toggleCollapsed}
                title={collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"}
                aria-label={collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"}
                aria-expanded={!collapsed}
                className="tap-lift flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {hydrated && collapsed ? (
                  <PanelLeftOpen className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <PanelLeftClose className="h-5 w-5" strokeWidth={2} />
                )}
              </button>
            </div>

            <nav
              className={`overflow-y-auto ${
                hydrated && collapsed ? "flex flex-col items-center gap-1.5" : "space-y-1.5"
              }`}
            >
              {NAV.map((item) => (
                <div key={item.href} className={hydrated && collapsed ? "" : undefined}>
                  {item.group && !(hydrated && collapsed) ? (
                    <p className="mb-1 mt-4 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {item.group}
                    </p>
                  ) : item.group && hydrated && collapsed ? (
                    <div className="my-2 h-px w-6 bg-border" aria-hidden />
                  ) : null}
                  <StudioNavLink
                    item={item}
                    active={item.match(pathname)}
                    collapsed={hydrated && collapsed}
                    orgSlug={orgSlug}
                    pathname={pathname}
                  />
                </div>
              ))}
            </nav>

            <div
              className={`mt-auto w-full space-y-3 pt-6 ${
                hydrated && collapsed ? "flex flex-col items-center" : ""
              }`}
            >
              {!(hydrated && collapsed) ? (
                <OrgSwitcher organizations={organizations} currentSlug={orgSlug} />
              ) : null}
              <Link
                href="/"
                title="Zur Spieleransicht"
                className={`tap-lift flex items-center rounded-2xl bg-secondary text-sm font-semibold ${
                  hydrated && collapsed
                    ? "h-11 w-11 justify-center"
                    : "gap-2 px-3 py-3"
                }`}
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                {!(hydrated && collapsed) ? <span>Zur Spieleransicht</span> : (
                  <span className="sr-only">Zur Spieleransicht</span>
                )}
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

/** @deprecated Mobile nav lives in StudioLayout; kept for StudioPage compatibility. */
export function StudioMobileNav() {
  return null;
}
