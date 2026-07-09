"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GridInput, GridLabel, GridSelect } from "@/components/grid/grid-shell";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
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
      <div className="grid-panel grid gap-4 rounded-2xl p-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <GridLabel>Suche</GridLabel>
          <GridInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titel, Slug…"
          />
        </div>
        <div>
          <GridLabel>Sprache</GridLabel>
          <GridSelect value={language} onChange={(e) => pushFilter("lang", e.target.value)}>
            <option value="">Alle</option>
            <option value="de">DE</option>
            <option value="en">EN</option>
          </GridSelect>
        </div>
        <div>
          <GridLabel>Stadt</GridLabel>
          <GridSelect value={city} onChange={(e) => pushFilter("city", e.target.value)}>
            <option value="">Alle</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </GridSelect>
        </div>
        <div>
          <GridLabel>Game-Typ</GridLabel>
          <GridSelect value={gameType} onChange={(e) => pushFilter("type", e.target.value)}>
            <option value="">Alle</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </GridSelect>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="grid-panel rounded-2xl p-10 text-center text-sm text-[var(--grid-muted)]">
          Noch keine Tasks — erstelle dein erstes Rätsel für die Bibliothek.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((task) => (
            <Link
              key={task.id}
              href={`/admin/tasks/${task.id}`}
              className="grid-panel group rounded-2xl p-5 transition hover:border-[var(--grid-accent)]/40"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[var(--grid-accent)]">
                    {task.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--grid-muted)]">
                    {task.description || task.slug}
                  </p>
                </div>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] uppercase text-[var(--grid-muted)]">
                  {task.language}
                </span>
              </div>
              <TaskTilePreview title={task.title} content={task.content} />
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-[var(--grid-muted)]">
                {task.city_slug ? <span>{task.city_slug}</span> : null}
                {task.game_type ? <span>· {task.game_type}</span> : null}
                {task.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5">
                    #{tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
