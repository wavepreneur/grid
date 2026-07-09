"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGame } from "@/app/actions/cms/games";
import type { StudioBlueprint, StudioGame } from "@/lib/cms/types";

const ICONS: Record<string, string> = {
  quiz: "📝",
  clue: "🔍",
  rogain: "🗺",
  match: "⚡",
  tour: "🚶",
  team: "👥",
};

type Props = {
  blueprints: StudioBlueprint[];
  savedTemplates: StudioGame[];
};

export function TemplateGallery({ blueprints, savedTemplates }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function startFromBlueprint(blueprintId: string, name: string) {
    startTransition(async () => {
      const result = await createGame({ name, blueprint_id: blueprintId });
      if (result.success && result.data) {
        router.push(`/admin/games/${result.data.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--grid-muted)]">
          System Blueprints
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {blueprints
            .filter((b) => b.is_system)
            .map((bp) => (
              <button
                key={bp.id}
                type="button"
                disabled={pending}
                onClick={() => startFromBlueprint(bp.id, `${bp.name} Game`)}
                className="group overflow-hidden rounded-2xl border border-[var(--grid-border)] text-left transition hover:border-[var(--grid-accent)]/40"
              >
                <div
                  className="flex h-32 items-center justify-center text-5xl"
                  style={{ backgroundColor: `${bp.accent_color}22` }}
                >
                  {ICONS[bp.icon_key] ?? "🎮"}
                </div>
                <div className="space-y-1 bg-black/20 p-4">
                  <p className="font-semibold text-white">{bp.name}</p>
                  <p className="text-xs leading-5 text-[var(--grid-muted)]">{bp.description}</p>
                </div>
              </button>
            ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--grid-muted)]">
          Gespeicherte Templates
        </h2>
        {savedTemplates.length === 0 ? (
          <div className="grid-panel rounded-2xl p-8 text-sm text-[var(--grid-muted)]">
            Speichere ein Game als Template, um es hier wiederzuverwenden.
          </div>
        ) : (
          <div className="grid gap-3">
            {savedTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                disabled={pending}
                onClick={() => startFromBlueprint(tpl.blueprint_id ?? "", `${tpl.name} Copy`)}
                className="grid-panel rounded-2xl p-4 text-left transition hover:border-[var(--grid-accent)]/30"
              >
                <p className="font-medium text-white">{tpl.name}</p>
                <p className="text-xs text-[var(--grid-muted)]">{tpl.description || tpl.slug}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
