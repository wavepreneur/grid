"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { StudioPanel } from "@/components/cms/admin-shell";
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
import { StudioSectionTitle } from "@/components/cms/studio-ui";
import { getStudioDashboardStats } from "@/app/actions/cms/tickets";
import { queryKeys } from "@/lib/platform/query-keys";

export function StudioOverviewSection() {
  const { data: stats, isPending } = useQuery({
    queryKey: queryKeys.studio.dashboard(),
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
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Aufgaben"
          value={stats.tasks}
          href="/admin/tasks"
          icon={<IconPuzzle size={20} />}
        />
        <MetricCard
          label="Spiele"
          value={stats.games}
          href="/admin/games"
          icon={<IconGamepad size={20} />}
        />
        <MetricCard
          label="Vorlagen"
          value={stats.templates}
          href="/admin/games#vorlagen"
          icon={<IconTemplate size={20} />}
        />
        <MetricCard
          label="Aktive Pools"
          value={stats.activePools}
          href="/admin/tickets"
          icon={<IconTicket size={20} />}
        />
        <MetricCard
          label="Aktivierungen"
          value={stats.totalActivations}
          href="/admin/tickets"
          icon={<IconTicket size={20} />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <StudioPanel>
          <StudioSectionTitle
            icon={<IconRoute size={18} />}
            title="So funktioniert's"
            description="In drei Schritten vom Entwurf zum Live-Spiel"
          />
          <ol className="space-y-4">
            <WorkflowStep
              step={1}
              title="Aufgaben anlegen"
              text="Erstelle Rätsel in der Aufgaben-Bibliothek — unabhängig von Spielen."
              href="/admin/tasks"
            />
            <WorkflowStep
              step={2}
              title="Spiel zusammenstellen"
              text="Füge Aufgaben hinzu, sortiere den Ablauf und veröffentliche eine Version."
              href="/admin/games"
            />
            <WorkflowStep
              step={3}
              title="Live-Event starten"
              text="Teams treten über den Einladungslink bei — der Inhalt bleibt stabil."
              href="/admin/games"
            />
          </ol>
        </StudioPanel>

        <StudioPanel>
          <StudioSectionTitle icon={<IconLayers size={18} />} title="Wichtig zu wissen" />
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li className="flex gap-2">
              <span className="font-semibold text-slate-900">Entwurf</span>
              <span>— jederzeit bearbeitbar, ohne laufende Events zu beeinflussen</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-slate-900">Version</span>
              <span>— eingefrorener Snapshot beim Veröffentlichen</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-slate-900">Live-Event</span>
              <span>— Teams spielen synchron mit Rollen &amp; Echtzeit-Sync</span>
            </li>
          </ul>
        </StudioPanel>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-slate-300 transition group-hover:text-teal-500">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition group-hover:opacity-100">
        Öffnen <IconArrowRight size={14} />
      </span>
    </Link>
  );
}

function WorkflowStep({
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
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{text}</p>
        <Link
          href={href}
          prefetch
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
        >
          Loslegen <IconArrowRight size={14} />
        </Link>
      </div>
    </li>
  );
}
