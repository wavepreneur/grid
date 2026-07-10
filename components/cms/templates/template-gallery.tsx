"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGame } from "@/app/actions/cms/games";
import { IconPlus, IconTemplate } from "@/components/cms/studio-icons";
import { StudioEmptyState, StudioSectionTitle } from "@/components/cms/studio-ui";
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
        <StudioSectionTitle
          icon={<IconTemplate size={18} />}
          title="System-Vorlagen"
          description="Fertige Spieltypen — ein Klick und du startest mit vorkonfiguriertem Ablauf."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {blueprints
            .filter((b) => b.is_system)
            .map((bp) => (
              <button
                key={bp.id}
                type="button"
                disabled={pending}
                onClick={() => startFromBlueprint(bp.id, `${bp.name} Game`)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-teal-200 hover:shadow-md disabled:opacity-50"
              >
                <div
                  className="flex h-28 items-center justify-center text-5xl"
                  style={{ backgroundColor: `${bp.accent_color}18` }}
                >
                  {ICONS[bp.icon_key] ?? "🎮"}
                </div>
                <div className="space-y-1 border-t border-slate-100 p-4">
                  <p className="font-semibold text-slate-900 group-hover:text-teal-700">
                    {bp.name}
                  </p>
                  <p className="text-xs leading-5 text-slate-500">{bp.description}</p>
                  <span className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-teal-600">
                    <IconPlus size={14} />
                    Spiel erstellen
                  </span>
                </div>
              </button>
            ))}
        </div>
      </section>

      <section>
        <StudioSectionTitle
          title="Eigene Vorlagen"
          description="Spiele, die du als Vorlage gespeichert hast."
        />
        {savedTemplates.length === 0 ? (
          <StudioEmptyState
            icon={<IconTemplate size={32} />}
            title="Noch keine eigenen Vorlagen"
            description='Speichere ein Spiel über „Als Vorlage" im Spiel-Editor.'
          />
        ) : (
          <div className="grid gap-3">
            {savedTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                disabled={pending}
                onClick={() => startFromBlueprint(tpl.blueprint_id ?? "", `${tpl.name} Copy`)}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md disabled:opacity-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{tpl.name}</p>
                  <p className="text-xs text-slate-500">{tpl.description || tpl.slug}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-teal-600">
                  <IconPlus size={14} />
                  Kopie erstellen
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
