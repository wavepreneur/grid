"use client";

import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import type { StudioTaskContent, TaskContentTile, TaskTileMediaType } from "@/lib/cms/types";
import { defaultTaskScoring } from "@/lib/cms/task-content";
import { ContentMediaSheet } from "@/components/game/city/content-media-sheet";
import {
  LevelHero,
  LevelTaskCard,
  LevelTilesSection,
} from "@/components/game/city/level-screen-blocks";
import { BigButton } from "@/components/game/city/ui";
import { LevelScoringBar } from "@/components/game/level-scoring-bar";
import { RevealSolutionControl } from "@/components/game/reveal-solution-control";

function mediaLabel(type: TaskTileMediaType): string {
  switch (type) {
    case "image":
      return "Bild";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "iframe":
      return "Link";
  }
}

type Props = {
  title: string;
  description: string;
  content: StudioTaskContent;
};

/**
 * Interaktive Spieler-Vorschau (Lovable-Look):
 * Platzhalter, Tipps freischalten, Iframe ~90% Viewport, Punkte/Countdown-HUD.
 */
export function TaskEditorPreview({ title, description, content }: Props) {
  const tiles = content.tiles ?? [];
  const scoring = content.scoring ?? defaultTaskScoring();
  const previewStartedAt = useMemo(() => new Date().toISOString(), []);
  const displayTitle = title.trim() || "Neue Aufgabe";

  const [unlockedHints, setUnlockedHints] = useState<Record<string, string>>({});
  const [openTileId, setOpenTileId] = useState<string | null>(null);
  const [hintConfirmId, setHintConfirmId] = useState<string | null>(null);
  const [viewHintId, setViewHintId] = useState<string | null>(null);
  const [previewSolutionRevealed, setPreviewSolutionRevealed] = useState(false);

  const openTile = tiles.find((t) => t.id === openTileId) ?? null;
  const hintConfirmTile = tiles.find((t) => t.id === hintConfirmId) ?? null;
  const viewHintTile = tiles.find((t) => t.id === viewHintId) ?? null;

  const tileModels = tiles.map((tile: TaskContentTile, index) => {
    const hasHint = Boolean(tile.hint_text?.trim());
    const unlocked = Boolean(unlockedHints[tile.id]);
    return {
      id: tile.id,
      index: index + 1,
      label: tile.label?.trim() || mediaLabel(tile.media_type),
      mediaType: tile.media_type,
      coverImageUrl: tile.cover_image_url?.trim() || null,
      hintAvailable: hasHint && !unlocked,
      hintUnlocked: hasHint && unlocked,
      hintCost: tile.hint_point_cost ?? 50,
      onOpen: () => setOpenTileId(tile.id),
      onHint: () => {
        if (unlocked) setViewHintId(tile.id);
        else setHintConfirmId(tile.id);
      },
    };
  });

  function unlockHint(tile: TaskContentTile) {
    const text = tile.hint_text?.trim();
    if (!text) return;
    setUnlockedHints((prev) => ({ ...prev, [tile.id]: text }));
    setHintConfirmId(null);
    setViewHintId(tile.id);
  }

  return (
    <div className="city-game min-w-0 overflow-hidden rounded-[1.75rem] bg-[var(--cg-bg)] shadow-[var(--cg-shadow-lift)] ring-1 ring-[var(--cg-border)]">
      <div className="mx-auto max-h-[760px] min-w-0 max-w-[30rem] overflow-x-hidden overflow-y-auto">
        <LevelHero
          title={displayTitle}
          description={description}
          imageUrl={content.hero_image_url}
        />

        <div className="space-y-5 px-4 pb-8 pt-4">
          <LevelScoringBar scoring={scoring} startedAt={previewStartedAt} compact />

          <LevelTilesSection tiles={tileModels} />

          <LevelTaskCard>
            {content.question?.trim() ? (
              <p className="break-words text-base font-bold leading-snug text-[var(--cg-fg)] [overflow-wrap:anywhere] sm:text-lg">
                {content.question}
              </p>
            ) : null}

            {previewSolutionRevealed ? (
              <div className="space-y-3">
                <p className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--cg-secondary)] py-4 text-base font-semibold text-[var(--cg-fg)]">
                  Lösung:{" "}
                  {content.answer_type === "confirm"
                    ? "OK"
                    : content.answer_type === "choice" || content.answer_type === "multi_choice"
                      ? (content.options ?? [])
                          .filter((o) => o.correct)
                          .map((o) => o.label)
                          .join(", ") || "—"
                      : content.answer?.trim() || "—"}
                </p>
                <p className="text-center text-sm font-medium text-[var(--cg-muted)]">
                  Aufgabe abgeschlossen · 0 Punkte
                </p>
                <BigButton variant="primary" disabled>
                  Weiter
                </BigButton>
              </div>
            ) : (
              <>
                {content.answer_type === "text" && content.code_boxes ? (
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: content.number_fields ?? 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-14 w-14 rounded-md border-2 border-[var(--cg-input)] bg-[var(--cg-secondary)]/40 text-center text-xl font-bold leading-[3.25rem] text-[var(--cg-muted)]"
                      >
                        ·
                      </div>
                    ))}
                  </div>
                ) : content.answer_type === "text" ? (
                  <div className="w-full rounded-2xl border-2 border-[var(--cg-input)] bg-[var(--cg-secondary)]/40 px-4 py-5 text-center text-xl font-bold tracking-widest text-[var(--cg-muted)]">
                    Antwort eintragen…
                  </div>
                ) : content.answer_type === "confirm" ? null : content.options?.length ? (
                  <div className="space-y-2">
                    {content.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`rounded-2xl px-4 py-3.5 text-left text-sm font-semibold shadow-[var(--cg-shadow-soft)] ${
                          opt.correct
                            ? "bg-[var(--cg-success)]/15 text-[var(--cg-fg)] ring-2 ring-[var(--cg-success)]/40"
                            : "bg-[var(--cg-secondary)] text-[var(--cg-fg)]"
                        }`}
                      >
                        <span className="break-words [overflow-wrap:anywhere]">
                          {opt.label || "Antwortoption"}
                        </span>
                        {opt.correct ? (
                          <span className="ml-2 text-[var(--cg-success)]">✓</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <BigButton variant="primary" disabled>
                  {content.answer_type === "confirm" ? "OK" : "Antwort prüfen"}
                </BigButton>

                {scoring.allow_reveal_solution ? (
                  <RevealSolutionControl onConfirmReveal={() => setPreviewSolutionRevealed(true)} />
                ) : null}
              </>
            )}
          </LevelTaskCard>
        </div>
      </div>

      <ContentMediaSheet
        open={Boolean(openTile)}
        title={
          openTile
            ? openTile.label?.trim() || mediaLabel(openTile.media_type)
            : "Inhalt"
        }
        mediaType={openTile?.media_type}
        mediaUrl={openTile?.media_url}
        onClose={() => setOpenTileId(null)}
        tipSlot={
          openTile?.hint_text?.trim() ? (
            unlockedHints[openTile.id] ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cg-success)]">
                  Tipp freigeschaltet
                </p>
                <p className="text-sm leading-relaxed text-[var(--cg-fg)] whitespace-pre-wrap">
                  {unlockedHints[openTile.id]}
                </p>
                <BigButton variant="ghost" onClick={() => setOpenTileId(null)}>
                  Schließen
                </BigButton>
              </div>
            ) : (
              <div className="space-y-2">
                <BigButton
                  variant="accent"
                  icon={<Lightbulb className="h-5 w-5" />}
                  onClick={() => {
                    setOpenTileId(null);
                    setHintConfirmId(openTile.id);
                  }}
                >
                  Tipp freischalten (−{openTile.hint_point_cost ?? 50} P)
                </BigButton>
                <BigButton variant="ghost" onClick={() => setOpenTileId(null)}>
                  Schließen
                </BigButton>
              </div>
            )
          ) : undefined
        }
      />

      {/* Tipp kaufen — Preview simuliert Freischaltung lokal */}
      {hintConfirmTile ? (
        <div
          className="city-game fixed inset-0 z-[130] flex items-end justify-center bg-[var(--cg-ink)]/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setHintConfirmId(null)}
        >
          <div
            className="cg-animate-rise-in w-full max-w-md space-y-4 rounded-[1.5rem] bg-[var(--cg-card)] p-5 shadow-[var(--cg-shadow-lift)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]">
                <Lightbulb className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cg-muted)]">
                  Tipp freischalten
                </p>
                <p className="font-bold text-[var(--cg-fg)]">
                  {hintConfirmTile.label?.trim() || mediaLabel(hintConfirmTile.media_type)}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--cg-muted)]">
              Kostet{" "}
              <span className="font-bold text-[var(--cg-fg)]">
                {hintConfirmTile.hint_point_cost ?? 50} Punkte
              </span>{" "}
              vom Team-Score. Pro Kachel gibt es einen Tipp.
            </p>
            <BigButton variant="accent" onClick={() => unlockHint(hintConfirmTile)}>
              Freischalten & anzeigen
            </BigButton>
            <BigButton variant="ghost" onClick={() => setHintConfirmId(null)}>
              Abbrechen
            </BigButton>
          </div>
        </div>
      ) : null}

      {viewHintTile && unlockedHints[viewHintTile.id] ? (
        <div
          className="city-game fixed inset-0 z-[130] flex items-end justify-center bg-[var(--cg-ink)]/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setViewHintId(null)}
        >
          <div
            className="cg-animate-rise-in w-full max-w-md space-y-4 rounded-[1.5rem] bg-[var(--cg-card)] p-5 shadow-[var(--cg-shadow-lift)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cg-success)]">
              Tipp freigeschaltet
            </p>
            <p className="text-base font-semibold leading-relaxed text-[var(--cg-fg)] whitespace-pre-wrap">
              {unlockedHints[viewHintTile.id]}
            </p>
            <BigButton variant="ghost" onClick={() => setViewHintId(null)}>
              Verstanden
            </BigButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
