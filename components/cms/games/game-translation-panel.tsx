"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveGameLocale } from "@/app/actions/cms/games";
import { StudioPanel } from "@/components/cms/admin-shell";
import { IconSave } from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSuccess,
  StudioTextarea,
} from "@/components/cms/studio-ui";
import { buildGameSlots } from "@/lib/cms/game-slots";
import {
  localesFromOverrides,
  mergeSlotCopy,
  resolveGameCopy,
  seedSlotCopyFromStudio,
  type BonusLocaleCopy,
  type GameLocaleCopy,
  type QuizLocaleCopy,
  type SlotLocaleCopy,
  type TileLocaleCopy,
} from "@/lib/cms/game-i18n";
import { localeLabel, type StudioLanguage } from "@/lib/cms/languages";
import type { StudioGame, StudioGameTaskLink } from "@/lib/cms/types";
import { useStudioCache } from "@/lib/platform/studio-cache";

type Props = {
  game: StudioGame;
  locale: StudioLanguage;
  taskLinks: StudioGameTaskLink[];
};

function Field({
  label,
  hint,
  value,
  placeholder,
  onChange,
  multiline,
  type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <div>
      <StudioLabel hint={hint}>{label}</StudioLabel>
      {multiline ? (
        <StudioTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <StudioInput
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function TileFields({
  tiles,
  onChange,
}: {
  tiles: TileLocaleCopy[];
  onChange: (tiles: TileLocaleCopy[]) => void;
}) {
  if (tiles.length === 0) return null;
  return (
    <div className="space-y-3">
      {tiles.map((tile, index) => (
        <div key={tile.id} className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Kachel {index + 1}
          </p>
          <div className="mt-2 grid gap-3">
            <Field
              label="Kurz-Label"
              value={tile.label ?? ""}
              onChange={(label) =>
                onChange(tiles.map((item) => (item.id === tile.id ? { ...item, label } : item)))
              }
            />
            <Field
              label="URL für diese Sprache"
              hint="Anderen Link einsetzen, z. B. englisches Minigame oder Medien"
              type="url"
              value={tile.url ?? ""}
              onChange={(url) =>
                onChange(tiles.map((item) => (item.id === tile.id ? { ...item, url } : item)))
              }
            />
            <Field
              label="Hinweis / Tipp"
              multiline
              value={tile.hint_text ?? ""}
              onChange={(hint_text) =>
                onChange(tiles.map((item) => (item.id === tile.id ? { ...item, hint_text } : item)))
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionFields({
  options,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  onChange: (options: Array<{ id: string; label: string }>) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="grid gap-3">
      {options.map((option, index) => (
        <Field
          key={option.id}
          label={`Antwort ${index + 1}`}
          value={option.label}
          onChange={(label) =>
            onChange(options.map((item) => (item.id === option.id ? { ...item, label } : item)))
          }
        />
      ))}
    </div>
  );
}

export function GameTranslationPanel({ game, locale, taskLinks }: Props) {
  const cache = useStudioCache();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sourceCopy = resolveGameCopy(game, game.language);
  const [copy, setCopy] = useState<GameLocaleCopy>(() => resolveGameCopy(game, locale));
  const slots = useMemo(() => buildGameSlots(taskLinks), [taskLinks]);
  const seededSlots = useMemo(() => {
    const next: Record<string, SlotLocaleCopy> = {};
    for (const slot of slots) {
      const quiz: QuizLocaleCopy | null = slot.quiz
        ? {
            title: slot.quiz.title ?? "",
            description: slot.quiz.description ?? "",
            question: slot.quiz.question,
            side_fact: slot.quiz.side_fact ?? "",
            options: slot.quiz.options.map((option) => ({ id: option.id, label: option.label })),
          }
        : null;
      const source = seedSlotCopyFromStudio({
        title: slot.levelLink.task.title,
        description: slot.levelLink.task.description,
        content: slot.levelLink.task.content,
        overrides: slot.levelLink.overrides,
        quiz,
        bonuses: slot.bonusLinks.map((link) => ({
          taskId: link.task_id,
          title: link.task.title,
          description: link.task.description,
          content: link.task.content,
        })),
      });
      next[slot.levelLink.id] = mergeSlotCopy(
        source,
        localesFromOverrides(slot.levelLink.overrides)[locale] ?? {},
      );
    }
    return next;
  }, [locale, slots]);
  const [slotCopies, setSlotCopies] = useState<Record<string, SlotLocaleCopy>>(seededSlots);
  useEffect(() => {
    setSlotCopies(seededSlots);
  }, [seededSlots]);

  function patchSlot(linkId: string, patch: Partial<SlotLocaleCopy>) {
    setSlotCopies((prev) => ({ ...prev, [linkId]: { ...prev[linkId], ...patch } }));
  }

  function patchQuiz(linkId: string, patch: Partial<QuizLocaleCopy>) {
    const row = slotCopies[linkId];
    patchSlot(linkId, { quiz: { ...row?.quiz, ...patch } });
  }

  function patchBonus(linkId: string, taskId: string, patch: Partial<BonusLocaleCopy>) {
    const row = slotCopies[linkId];
    patchSlot(linkId, {
      bonuses: {
        ...row?.bonuses,
        [taskId]: { ...row?.bonuses?.[taskId], ...patch },
      },
    });
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveGameLocale({
        gameId: game.id,
        language: locale,
        copy,
        slots: Object.entries(slotCopies).map(([linkId, slotCopy]) => ({
          linkId,
          copy: slotCopy,
        })),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      cache.setGame(result.data!);
      setMessage(`${localeLabel(locale)} gespeichert.`);
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <StudioPanel>
        <StudioSectionTitle
          title={`${localeLabel(locale)} · Texte`}
          description={`Ausgangssprache bleibt ${localeLabel(game.language)}. GPS, Codes und Logik gelten für alle Sprachen.`}
        />
        <StudioHint>
          Alles, was Spieler sehen: Spieltexte, Einstieg, Kacheln, Tipps, Bonus und Hilfe-Links.
        </StudioHint>
        <div className="mt-4 grid gap-4">
          <Field
            label="Titel"
            value={copy.name ?? ""}
            placeholder={sourceCopy.name}
            onChange={(name) => setCopy({ ...copy, name })}
          />
          <Field
            label="Briefing"
            multiline
            value={copy.description ?? ""}
            placeholder={sourceCopy.description}
            onChange={(description) => setCopy({ ...copy, description })}
          />
          <Field
            label="Abschiedstext"
            multiline
            value={copy.farewell_text ?? ""}
            placeholder={sourceCopy.farewell_text}
            onChange={(farewell_text) => setCopy({ ...copy, farewell_text })}
          />
          <Field
            label="Spielregeln (URL)"
            type="url"
            value={copy.briefing_iframe_url ?? ""}
            placeholder={sourceCopy.briefing_iframe_url}
            onChange={(briefing_iframe_url) => setCopy({ ...copy, briefing_iframe_url })}
          />
          <Field
            label="FAQ (URL)"
            type="url"
            value={copy.faq_iframe_url ?? ""}
            placeholder={sourceCopy.faq_iframe_url}
            onChange={(faq_iframe_url) => setCopy({ ...copy, faq_iframe_url })}
          />
        </div>
      </StudioPanel>

      <StudioPanel>
        <StudioSectionTitle
          title="Stationen übersetzen"
          description="Einstieg, Mission, Kacheln, Tipps und Bonus. Reihenfolge und Lösungen bleiben."
        />
        <div className="space-y-6">
          {slots.map((slot) => {
            const linkId = slot.levelLink.id;
            const row = slotCopies[linkId] ?? {};
            const sourceTitle = slot.levelLink.task.title;
            return (
              <div key={linkId} className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Station {slot.index}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{sourceTitle}</p>
                </div>

                <div className="grid gap-3">
                  <Field
                    label="Mission · Titel"
                    value={row.title ?? ""}
                    placeholder={sourceTitle}
                    onChange={(title) => patchSlot(linkId, { title })}
                  />
                  <Field
                    label="Mission · Beschreibung"
                    multiline
                    value={row.description ?? ""}
                    placeholder={slot.levelLink.task.description ?? ""}
                    onChange={(description) => patchSlot(linkId, { description })}
                  />
                </div>

                {(row.tiles ?? []).length > 0 ? (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Kacheln in der Aufgabe
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Label und Tipp übersetzen. Bei der URL den englischen Link einsetzen.
                    </p>
                    <TileFields
                      tiles={row.tiles ?? []}
                      onChange={(tiles) => patchSlot(linkId, { tiles })}
                    />
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <Field
                    label="Mission · Frage"
                    multiline
                    value={row.question ?? ""}
                    onChange={(question) => patchSlot(linkId, { question })}
                  />
                  <Field
                    label="Erfolg · Titel"
                    value={row.success_title ?? ""}
                    onChange={(success_title) => patchSlot(linkId, { success_title })}
                  />
                  <Field
                    label="Erfolg · Text"
                    multiline
                    value={row.success_info ?? ""}
                    onChange={(success_info) => patchSlot(linkId, { success_info })}
                  />
                  <OptionFields
                    options={row.options ?? []}
                    onChange={(options) => patchSlot(linkId, { options })}
                  />
                  {row.station ? (
                    <>
                      <Field
                        label="Station · Name"
                        value={row.station.name ?? ""}
                        onChange={(name) =>
                          patchSlot(linkId, { station: { ...row.station, name } })
                        }
                      />
                      <Field
                        label="Station · Ort"
                        value={row.station.place ?? ""}
                        onChange={(place) =>
                          patchSlot(linkId, { station: { ...row.station, place } })
                        }
                      />
                    </>
                  ) : null}
                </div>

                {row.quiz || slot.quiz ? (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Einstiegsaufgabe
                    </p>
                    <Field
                      label="Titel"
                      value={row.quiz?.title ?? ""}
                      placeholder={slot.quiz?.title}
                      onChange={(title) => patchQuiz(linkId, { title })}
                    />
                    <Field
                      label="Beschreibung"
                      multiline
                      value={row.quiz?.description ?? ""}
                      placeholder={slot.quiz?.description}
                      onChange={(description) => patchQuiz(linkId, { description })}
                    />
                    <Field
                      label="Frage"
                      multiline
                      value={row.quiz?.question ?? ""}
                      placeholder={slot.quiz?.question}
                      onChange={(question) => patchQuiz(linkId, { question })}
                    />
                    <Field
                      label="Side-Fact"
                      multiline
                      value={row.quiz?.side_fact ?? ""}
                      placeholder={slot.quiz?.side_fact}
                      onChange={(side_fact) => patchQuiz(linkId, { side_fact })}
                    />
                    <OptionFields
                      options={row.quiz?.options ?? slot.quiz?.options ?? []}
                      onChange={(options) => patchQuiz(linkId, { options })}
                    />
                  </div>
                ) : null}

                {slot.bonusLinks.map((link, index) => {
                  const bonus = row.bonuses?.[link.task_id] ?? {};
                  return (
                    <div
                      key={link.id}
                      className="space-y-3 rounded-xl border border-border bg-card p-3"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Bonusaufgabe {index + 1}
                      </p>
                      <p className="text-sm font-semibold text-foreground">{link.task.title}</p>
                      <Field
                        label="Titel"
                        value={bonus.title ?? ""}
                        placeholder={link.task.title}
                        onChange={(title) => patchBonus(linkId, link.task_id, { title })}
                      />
                      <Field
                        label="Beschreibung"
                        multiline
                        value={bonus.description ?? ""}
                        placeholder={link.task.description ?? ""}
                        onChange={(description) =>
                          patchBonus(linkId, link.task_id, { description })
                        }
                      />
                      <Field
                        label="Frage"
                        multiline
                        value={bonus.question ?? ""}
                        onChange={(question) => patchBonus(linkId, link.task_id, { question })}
                      />
                      <Field
                        label="Erfolg · Text"
                        multiline
                        value={bonus.success_info ?? ""}
                        onChange={(success_info) =>
                          patchBonus(linkId, link.task_id, { success_info })
                        }
                      />
                      <OptionFields
                        options={bonus.options ?? []}
                        onChange={(options) => patchBonus(linkId, link.task_id, { options })}
                      />
                      <TileFields
                        tiles={bonus.tiles ?? []}
                        onChange={(tiles) => patchBonus(linkId, link.task_id, { tiles })}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </StudioPanel>

      <StudioButton type="submit" disabled={pending} icon={<IconSave size={16} />}>
        {pending ? "Speichern…" : `${localeLabel(locale)} speichern`}
      </StudioButton>
    </form>
  );
}
