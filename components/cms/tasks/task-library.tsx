"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StudioPanel } from "@/components/cms/admin-shell";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import { IconArrowRight, IconPuzzle, IconSearch } from "@/components/cms/studio-icons";
import {
  StudioEmptyState,
  StudioInput,
  StudioLabel,
  StudioSelect,
} from "@/components/cms/studio-ui";
import type { StudioTask } from "@/lib/cms/types";

type Props = {
  tasks: StudioTask[];
};

export function TaskLibrary({ tasks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const language = searchParams.get("lang") ?? "";
  const city = searchParams.get("city") ?? "";
  const gameType = searchParams.get("type") ?? "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (language && task.language !== language) return false;
      if (city && task.city_slug !== city) return false;
      if (gameType && task.game_type !== gameType) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.slug.includes(q) ||
        task.description.toLowerCase().includes(q)
      );
    });
  }, [tasks, search, language, city, gameType]);

  function pushFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/tasks?${params.toString()}`);
  }

  const cities = [...new Set(tasks.map((t) => t.city_slug).filter(Boolean))] as string[];
  const types = [...new Set(tasks.map((t) => t.game_type).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <StudioPanel>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <StudioLabel>Suche</StudioLabel>
            <div className="relative">
              <IconSearch
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <StudioInput
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titel oder Slug…"
              />
            </div>
          </div>
          <div>
            <StudioLabel>Sprache</StudioLabel>
            <StudioSelect value={language} onChange={(e) => pushFilter("lang", e.target.value)}>
              <option value="">Alle</option>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </StudioSelect>
          </div>
          <div>
            <StudioLabel>Stadt</StudioLabel>
            <StudioSelect value={city} onChange={(e) => pushFilter("city", e.target.value)}>
              <option value="">Alle</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </StudioSelect>
          </div>
          <div>
            <StudioLabel>Spiel-Typ</StudioLabel>
            <StudioSelect value={gameType} onChange={(e) => pushFilter("type", e.target.value)}>
              <option value="">Alle</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </StudioSelect>
          </div>
        </div>
      </StudioPanel>

      {filtered.length === 0 ? (
        <StudioEmptyState
          icon={<IconPuzzle size={32} />}
          title="Noch keine Aufgaben"
          description="Erstelle dein erstes Rätsel für die Bibliothek."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((task) => (
            <Link
              key={task.id}
              href={`/admin/tasks/${task.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-teal-700">
                    {task.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {task.description || task.slug}
                  </p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  {task.language}
                </span>
              </div>
              <TaskTilePreview title={task.title} content={task.content} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                  {task.city_slug ? <span>{task.city_slug}</span> : null}
                  {task.game_type ? <span>· {task.game_type}</span> : null}
                  {task.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">
                      #{tag}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition group-hover:opacity-100">
                  Bearbeiten <IconArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
