"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Panel, Stat } from "@/components/cms/ui";
import {
  IconArrowRight,
  IconGamepad,
  IconLayers,
  IconPuzzle,
  IconRoute,
  IconTemplate,
  IconTicket,
} from "@/components/cms/studio-icons";
import { StudioOverviewSkeleton } from "@/components/cms/studio-list-skeletons";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { getStudioDashboardStats } from "@/app/actions/cms/tickets";
import { queryKeys } from "@/lib/platform/query-keys";

const areas = [
  {
    href: "/admin/games",
    icon: IconGamepad,
    name: "Spiele",
    text: "Spiele in Layern zusammenstellen, duplizieren und veröffentlichen.",
  },
  {
    href: "/admin/tasks",
    icon: IconPuzzle,
    name: "Aufgaben",
    text: "Rätsel einmal anlegen und mit beliebig vielen Spielen verknüpfen.",
  },
  {
    href: "/admin/tickets",
    icon: IconTicket,
    name: "Tickets",
    text: "Zugänge und Aktivierungen für Live-Events verwalten.",
  },
];

export function StudioOverviewSection() {
  const { orgSlug } = useStudioShell();
  const { data: stats, isPending } = useQuery({
    queryKey: queryKeys.studio.dashboard(orgSlug),
    queryFn: async () => {
      const result = await getStudioDashboardStats();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });

  if (isPending || !stats) {
    return <StudioOverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aufgaben" value={String(stats.tasks)} note="in der Bibliothek" />
        <Stat label="Spiele" value={String(stats.games)} note={`${stats.templates} Vorlagen`} />
        <Stat label="Ticket-Sätze" value={String(stats.activePools)} note="Zugangscodes" />
        <Stat
          label="Geräte / Aktivierungen"
          value={String(stats.totalActivations)}
          note="Event-Codes"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {areas.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            prefetch
            className="tap-lift group rounded-3xl bg-card p-5 shadow-soft"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <a.icon className="h-6 w-6 text-primary" />
            </span>
            <h2 className="mt-4 text-xl font-bold">{a.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Öffnen <IconArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="So funktioniert's" subtitle="In drei Schritten vom Entwurf zum Live-Spiel">
          <ul className="space-y-2">
            <WorkflowRow
              step={1}
              title="Aufgaben anlegen"
              text="Rätsel in der Bibliothek — unabhängig von Spielen."
              href="/admin/tasks"
            />
            <WorkflowRow
              step={2}
              title="Spiel zusammenstellen"
              text="Ablauf sortieren und Version veröffentlichen."
              href="/admin/games"
            />
            <WorkflowRow
              step={3}
              title="Live-Event starten"
              text="Teams treten über den Einladungslink bei."
              href="/admin/games"
            />
          </ul>
        </Panel>

        <Panel
          title="Wichtig zu wissen"
          action={
            <Link href="/admin/games" className="text-sm font-bold text-primary">
              Zu den Spielen
            </Link>
          }
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <InfoTile
              icon={<IconPuzzle className="h-4 w-4 text-primary" />}
              title="Entwurf"
              text="Jederzeit bearbeitbar"
            />
            <InfoTile
              icon={<IconLayers className="h-4 w-4 text-primary" />}
              title="Version"
              text="Eingefrorener Snapshot"
            />
            <InfoTile
              icon={<IconRoute className="h-4 w-4 text-primary" />}
              title="Live-Event"
              text="Synchron mit Rollen"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function WorkflowRow({
  step,
  title,
  text,
  href,
}: {
  step: number;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        className="tap-lift grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary px-4 py-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {step}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold">{title}</span>
          <span className="block text-xs text-muted-foreground">{text}</span>
        </span>
        <IconArrowRight className="h-4 w-4 text-primary" />
      </Link>
    </li>
  );
}

function InfoTile({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-bold">
        {icon} {title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
