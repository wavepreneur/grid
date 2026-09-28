"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveGameLocale } from "@/app/actions/cms/games";
import { StudioPanel } from "@/components/cms/admin-shell";
import { IconCheck, IconSave } from "@/components/cms/studio-icons";
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
  collectTranslationUnits,
  coverageForConfirmed,
  coveragePercent,
  inferredConfirmedKeys,
  localesFromOverrides,
  mergeSlotCopy,
  parseConfirmed,
  remainingPercent,
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

function sameText(value: string | undefined, source: string | undefined) {
  return (value ?? "").trim() === (source ?? "").trim();
}

function TranslatableField({
  unitKey,
  label,
  hint,
  value,
  source,
  confirmed,
  onChange,
  onConfirm,
  multiline,
  type = "text",
}: {
  unitKey: string;
  label: string;
  hint?: string;
  value: string;
  source?: string;
  confirmed: boolean;
  onChange: (value: string) => void;
  onConfirm: (key: string, next: boolean) => void;
  multiline?: boolean;
  type?: string;
}) {
  const hasSource = Boolean(source?.trim());
  const pending = hasSource && !confirmed;
  const sourceHint = pending && sameText(value, source) ? "Ausgangstext — Haken setzen oder übersetzen" : hint;

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <StudioLabel hint={sourceHint}>{label}</StudioLabel>
        {multiline ? (
          <StudioTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={source}
            rows={3}
            className={pending ? "border-amber-400/70" : undefined}
          />
        ) : (
          <StudioInput
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={source}
            className={pending ? "border-amber-400/70" : undefined}
          />
        )}
      </div>
      {hasSource ? (
        <button
          type="button"
          aria-pressed={confirmed}
          aria-label={confirmed ? `${label} bestätigt` : `${label} als übersetzt markieren`}
          title={confirmed ? "Bestätigt — erneut klicken zum Öffnen" : "Als übersetzt markieren"}
          onClick={() => onConfirm(unitKey, !confirmed)}
          className={`mt-6 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
            confirmed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-dashed border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          <IconCheck size={16} />
        </button>
      ) : null}
    </div>
  );
}

function TileFields({
  tiles,
  sourceTiles,
  keyPrefix,
  confirmed,
  onChange,
  onConfirm,
  onValue,
}: {
  tiles: TileLocaleCopy[];
  sourceTiles: TileLocaleCopy[];
  keyPrefix: string;
  confirmed: Set<string>;
  onChange: (tiles: TileLocaleCopy[]) => void;
  onConfirm: (key: string, next: boolean) => void;
  onValue: (key: string, source: string, next: string) => void;
}) {
  if (tiles.length === 0) return null;
  const sourceById = new Map(sourceTiles.map((tile) => [tile.id, tile]));
  return (
    <div className="space-y-3">
      {tiles.map((tile, index) => {
        const source = sourceById.get(tile.id);
        return (
          <div key={tile.id} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Kachel {index + 1}
            </p>
            <div className="mt-2 grid gap-3">
              <TranslatableField
                unitKey={`${keyPrefix}:tile:${tile.id}:label`}
                label="Kurz-Label"
                value={tile.label ?? ""}
                source={source?.label}
                confirmed={confirmedSet.has(`${keyPrefix}:tile:${tile.id}:label`)}
                onConfirm={onConfirm}
                onChange={(label) => {
                  onValue(`${keyPrefix}:tile:${tile.id}:label`, source?.label ?? "", label);
                  onChange(tiles.map((item) => (item.id === tile.id ? { ...item, label } : item)));
                }}
              />
              <TranslatableField
                unitKey={`${keyPrefix}:tile:${tile.id}:url`}
                label="URL für diese Sprache"
                hint="Anderen Link einsetzen, z. B. englisches Minigame oder Medien"
                type="url"
                value={tile.url ?? ""}
                source={source?.url}
                confirmed={confirmedSet.has(`${keyPrefix}:tile:${tile.id}:url`)}
                onConfirm={onConfirm}
                onChange={(url) => {
                  onValue(`${keyPrefix}:tile:${tile.id}:url`, source?.url ?? "", url);
                  onChange(tiles.map((item) => (item.id === tile.id ? { ...item, url } : item)));
                }}
              />
              <TranslatableField
                unitKey={`${keyPrefix}:tile:${tile.id}:hint`}
                label="Hinweis / Tipp"
                multiline
                value={tile.hint_text ?? ""}
                source={source?.hint_text}
                confirmed={confirmedSet.has(`${keyPrefix}:tile:${tile.id}:hint`)}
                onConfirm={onConfirm}
                onChange={(hint_text) => {
                  onValue(`${keyPrefix}:tile:${tile.id}:hint`, source?.hint_text ?? "", hint_text);
                  onChange(tiles.map((item) => (item.id === tile.id ? { ...item, hint_text } : item)));
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OptionFields({
  options,
  sourceOptions,
  keyPrefix,
  confirmed,
  onChange,
  onConfirm,
  onValue,
}: {
  options: Array<{ id: string; label: string }>;
  sourceOptions: Array<{ id: string; label: string }>;
  keyPrefix: string;
  confirmed: Set<string>;
  onChange: (options: Array<{ id: string; label: string }>) => void;
  onConfirm: (key: string, next: boolean) => void;
  onValue: (key: string, source: string, next: string) => void;
}) {
  if (options.length === 0) return null;
  const sourceById = new Map(sourceOptions.map((option) => [option.id, option.label]));
  return (
    <div className="grid gap-3">
      {options.map((option, index) => {
        const key = `${keyPrefix}:option:${option.id}`;
        const source = sourceById.get(option.id) ?? "";
        return (
          <TranslatableField
            key={option.id}
            unitKey={key}
            label={`Antwort ${index + 1}`}
            value={option.label}
            source={source}
            confirmed={confirmedSet.has(key)}
            onConfirm={onConfirm}
            onChange={(label) => {
              onValue(key, source, label);
              onChange(options.map((item) => (item.id === option.id ? { ...item, label } : item)));
            }}
          />
        );
      })}
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
  const [checked, setChecked] = useState<string[]>(
    () => parseConfirmed(game.translations[locale]?.confirmed),
  );
  const slots = useMemo(() => buildGameSlots(taskLinks), [taskLinks]);
  const sourceSlots = useMemo(() => {
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
      next[slot.levelLink.id] = seedSlotCopyFromStudio({
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
    }
    return next;
  }, [slots]);
  const seededSlots = useMemo(() => {
    const next: Record<string, SlotLocaleCopy> = {};
    for (const slot of slots) {
      const linkId = slot.levelLink.id;
      next[linkId] = mergeSlotCopy(
        sourceSlots[linkId] ?? {},
        localesFromOverrides(slot.levelLink.overrides)[locale] ?? {},
      );
    }
    return next;
  }, [locale, slots, sourceSlots]);
  const [slotCopies, setSlotCopies] = useState<Record<string, SlotLocaleCopy>>(seededSlots);
  useEffect(() => {
    setSlotCopies(seededSlots);
  }, [seededSlots]);

  const units = useMemo(
    () =>
      collectTranslationUnits({
        game,
        slots: slots.map((slot) => ({
          linkId: slot.levelLink.id,
          source: sourceSlots[slot.levelLink.id] ?? {},
        })),
      }),
    [game, slots, sourceSlots],
  );
  const inferred = useMemo(
    () =>
      inferredConfirmedKeys({
        sourceGame: sourceCopy,
        currentGame: copy,
        slots: slots.map((slot) => ({
          linkId: slot.levelLink.id,
          source: sourceSlots[slot.levelLink.id] ?? {},
          current: slotCopies[slot.levelLink.id] ?? {},
        })),
      }),
    [copy, slotCopies, slots, sourceCopy, sourceSlots],
  );
  const confirmed = useMemo(
    () => parseConfirmed([...checked, ...inferred]),
    [checked, inferred],
  );
  const confirmedSet = useMemo(() => new Set(confirmed), [confirmed]);
  const coverage = coverageForConfirmed(units, confirmed);
  const donePercent = coveragePercent(coverage);
  const openPercent = remainingPercent(coverage);

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

  function handleConfirm(key: string, next: boolean) {
    setChecked((prev) => {
      if (next) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter((item) => item !== key);
    });
  }

  function handleValue(key: string, source: string, next: string) {
    if (next.trim() && next.trim() !== source.trim()) {
      handleConfirm(key, true);
    }
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveGameLocale({
        gameId: game.id,
        language: locale,
        copy: { ...copy, confirmed },
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
      const saved = result.data!.translations[locale]?.confirmed;
      if (saved) setChecked(parseConfirmed(saved));
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
          Der Ausgangstext bleibt in den Feldern. Abweichender Text zählt sofort. Haken setzen,
          wenn die Zeile auch ohne Änderung für diese Sprache stimmt.
        </StudioHint>
        <div className="mt-4 rounded-2xl border border-border bg-secondary/50 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {coverage.confirmed} von {coverage.total} bestätigt
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {openPercent > 0 ? `noch ${openPercent}% offen` : "vollständig"}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full ${donePercent === 100 ? "bg-primary" : "bg-amber-500"}`}
              style={{ width: `${donePercent}%` }}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <TranslatableField
            unitKey="game:name"
            label="Titel"
            value={copy.name ?? ""}
            source={sourceCopy.name}
            confirmed={confirmedSet.has("game:name")}
            onConfirm={handleConfirm}
            onChange={(name) => {
              handleValue("game:name", sourceCopy.name, name);
              setCopy({ ...copy, name });
            }}
          />
          <TranslatableField
            unitKey="game:description"
            label="Briefing"
            multiline
            value={copy.description ?? ""}
            source={sourceCopy.description}
            confirmed={confirmedSet.has("game:description")}
            onConfirm={handleConfirm}
            onChange={(description) => {
              handleValue("game:description", sourceCopy.description, description);
              setCopy({ ...copy, description });
            }}
          />
          <TranslatableField
            unitKey="game:farewell_text"
            label="Abschiedstext"
            multiline
            value={copy.farewell_text ?? ""}
            source={sourceCopy.farewell_text}
            confirmed={confirmedSet.has("game:farewell_text")}
            onConfirm={handleConfirm}
            onChange={(farewell_text) => {
              handleValue("game:farewell_text", sourceCopy.farewell_text, farewell_text);
              setCopy({ ...copy, farewell_text });
            }}
          />
          <TranslatableField
            unitKey="game:briefing_iframe_url"
            label="Spielregeln (URL)"
            type="url"
            value={copy.briefing_iframe_url ?? ""}
            source={sourceCopy.briefing_iframe_url}
            confirmed={confirmedSet.has("game:briefing_iframe_url")}
            onConfirm={handleConfirm}
            onChange={(briefing_iframe_url) => {
              handleValue("game:briefing_iframe_url", sourceCopy.briefing_iframe_url, briefing_iframe_url);
              setCopy({ ...copy, briefing_iframe_url });
            }}
          />
          <TranslatableField
            unitKey="game:faq_iframe_url"
            label="FAQ (URL)"
            type="url"
            value={copy.faq_iframe_url ?? ""}
            source={sourceCopy.faq_iframe_url}
            confirmed={confirmedSet.has("game:faq_iframe_url")}
            onConfirm={handleConfirm}
            onChange={(faq_iframe_url) => {
              handleValue("game:faq_iframe_url", sourceCopy.faq_iframe_url, faq_iframe_url);
              setCopy({ ...copy, faq_iframe_url });
            }}
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
            const prefix = `slot:${linkId}`;
            const row = slotCopies[linkId] ?? {};
            const source = sourceSlots[linkId] ?? {};
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
                  <TranslatableField
                    unitKey={`${prefix}:title`}
                    label="Mission · Titel"
                    value={row.title ?? ""}
                    source={source.title}
                    confirmed={confirmedSet.has(`${prefix}:title`)}
                    onConfirm={handleConfirm}
                    onChange={(title) => {
                      handleValue(`${prefix}:title`, source.title ?? "", title);
                      patchSlot(linkId, { title });
                    }}
                  />
                  <TranslatableField
                    unitKey={`${prefix}:description`}
                    label="Mission · Beschreibung"
                    multiline
                    value={row.description ?? ""}
                    source={source.description}
                    confirmed={confirmedSet.has(`${prefix}:description`)}
                    onConfirm={handleConfirm}
                    onChange={(description) => {
                      handleValue(`${prefix}:description`, source.description ?? "", description);
                      patchSlot(linkId, { description });
                    }}
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
                      sourceTiles={source.tiles ?? []}
                      keyPrefix={prefix}
                      confirmed={confirmedSet}
                      onConfirm={handleConfirm}
                      onValue={handleValue}
                      onChange={(tiles) => patchSlot(linkId, { tiles })}
                    />
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <TranslatableField
                    unitKey={`${prefix}:question`}
                    label="Mission · Frage"
                    multiline
                    value={row.question ?? ""}
                    source={source.question}
                    confirmed={confirmedSet.has(`${prefix}:question`)}
                    onConfirm={handleConfirm}
                    onChange={(question) => {
                      handleValue(`${prefix}:question`, source.question ?? "", question);
                      patchSlot(linkId, { question });
                    }}
                  />
                  <TranslatableField
                    unitKey={`${prefix}:success_title`}
                    label="Erfolg · Titel"
                    value={row.success_title ?? ""}
                    source={source.success_title}
                    confirmed={confirmedSet.has(`${prefix}:success_title`)}
                    onConfirm={handleConfirm}
                    onChange={(success_title) => {
                      handleValue(`${prefix}:success_title`, source.success_title ?? "", success_title);
                      patchSlot(linkId, { success_title });
                    }}
                  />
                  <TranslatableField
                    unitKey={`${prefix}:success_info`}
                    label="Erfolg · Text"
                    multiline
                    value={row.success_info ?? ""}
                    source={source.success_info}
                    confirmed={confirmedSet.has(`${prefix}:success_info`)}
                    onConfirm={handleConfirm}
                    onChange={(success_info) => {
                      handleValue(`${prefix}:success_info`, source.success_info ?? "", success_info);
                      patchSlot(linkId, { success_info });
                    }}
                  />
                  <OptionFields
                    options={row.options ?? []}
                    sourceOptions={source.options ?? []}
                    keyPrefix={prefix}
                    confirmed={confirmedSet}
                    onConfirm={handleConfirm}
                    onValue={handleValue}
                    onChange={(options) => patchSlot(linkId, { options })}
                  />
                  {row.station ? (
                    <>
                      <TranslatableField
                        unitKey={`${prefix}:station:name`}
                        label="Station · Name"
                        value={row.station.name ?? ""}
                        source={source.station?.name}
                        confirmed={confirmedSet.has(`${prefix}:station:name`)}
                        onConfirm={handleConfirm}
                        onChange={(name) => {
                          handleValue(`${prefix}:station:name`, source.station?.name ?? "", name);
                          patchSlot(linkId, { station: { ...row.station, name } });
                        }}
                      />
                      <TranslatableField
                        unitKey={`${prefix}:station:place`}
                        label="Station · Ort"
                        value={row.station.place ?? ""}
                        source={source.station?.place}
                        confirmed={confirmedSet.has(`${prefix}:station:place`)}
                        onConfirm={handleConfirm}
                        onChange={(place) => {
                          handleValue(`${prefix}:station:place`, source.station?.place ?? "", place);
                          patchSlot(linkId, { station: { ...row.station, place } });
                        }}
                      />
                    </>
                  ) : null}
                </div>

                {row.quiz || slot.quiz ? (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Einstiegsaufgabe
                    </p>
                    <TranslatableField
                      unitKey={`${prefix}:quiz:title`}
                      label="Titel"
                      value={row.quiz?.title ?? ""}
                      source={source.quiz?.title}
                      confirmed={confirmedSet.has(`${prefix}:quiz:title`)}
                      onConfirm={handleConfirm}
                      onChange={(title) => {
                        handleValue(`${prefix}:quiz:title`, source.quiz?.title ?? "", title);
                        patchQuiz(linkId, { title });
                      }}
                    />
                    <TranslatableField
                      unitKey={`${prefix}:quiz:description`}
                      label="Beschreibung"
                      multiline
                      value={row.quiz?.description ?? ""}
                      source={source.quiz?.description}
                      confirmed={confirmedSet.has(`${prefix}:quiz:description`)}
                      onConfirm={handleConfirm}
                      onChange={(description) => {
                        handleValue(`${prefix}:quiz:description`, source.quiz?.description ?? "", description);
                        patchQuiz(linkId, { description });
                      }}
                    />
                    <TranslatableField
                      unitKey={`${prefix}:quiz:question`}
                      label="Frage"
                      multiline
                      value={row.quiz?.question ?? ""}
                      source={source.quiz?.question}
                      confirmed={confirmedSet.has(`${prefix}:quiz:question`)}
                      onConfirm={handleConfirm}
                      onChange={(question) => {
                        handleValue(`${prefix}:quiz:question`, source.quiz?.question ?? "", question);
                        patchQuiz(linkId, { question });
                      }}
                    />
                    <TranslatableField
                      unitKey={`${prefix}:quiz:side_fact`}
                      label="Side-Fact"
                      multiline
                      value={row.quiz?.side_fact ?? ""}
                      source={source.quiz?.side_fact}
                      confirmed={confirmedSet.has(`${prefix}:quiz:side_fact`)}
                      onConfirm={handleConfirm}
                      onChange={(side_fact) => {
                        handleValue(`${prefix}:quiz:side_fact`, source.quiz?.side_fact ?? "", side_fact);
                        patchQuiz(linkId, { side_fact });
                      }}
                    />
                    <OptionFields
                      options={row.quiz?.options ?? slot.quiz?.options ?? []}
                      sourceOptions={source.quiz?.options ?? []}
                      keyPrefix={`${prefix}:quiz`}
                      confirmed={confirmedSet}
                      onConfirm={handleConfirm}
                      onValue={handleValue}
                      onChange={(options) => patchQuiz(linkId, { options })}
                    />
                  </div>
                ) : null}

                {slot.bonusLinks.map((link, index) => {
                  const bonus = row.bonuses?.[link.task_id] ?? {};
                  const sourceBonus = source.bonuses?.[link.task_id] ?? {};
                  const bonusPrefix = `${prefix}:bonus:${link.task_id}`;
                  return (
                    <div
                      key={link.id}
                      className="space-y-3 rounded-xl border border-border bg-card p-3"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Bonusaufgabe {index + 1}
                      </p>
                      <p className="text-sm font-semibold text-foreground">{link.task.title}</p>
                      <TranslatableField
                        unitKey={`${bonusPrefix}:title`}
                        label="Titel"
                        value={bonus.title ?? ""}
                        source={sourceBonus.title}
                        confirmed={confirmedSet.has(`${bonusPrefix}:title`)}
                        onConfirm={handleConfirm}
                        onChange={(title) => {
                          handleValue(`${bonusPrefix}:title`, sourceBonus.title ?? "", title);
                          patchBonus(linkId, link.task_id, { title });
                        }}
                      />
                      <TranslatableField
                        unitKey={`${bonusPrefix}:description`}
                        label="Beschreibung"
                        multiline
                        value={bonus.description ?? ""}
                        source={sourceBonus.description}
                        confirmed={confirmedSet.has(`${bonusPrefix}:description`)}
                        onConfirm={handleConfirm}
                        onChange={(description) => {
                          handleValue(`${bonusPrefix}:description`, sourceBonus.description ?? "", description);
                          patchBonus(linkId, link.task_id, { description });
                        }}
                      />
                      <TranslatableField
                        unitKey={`${bonusPrefix}:question`}
                        label="Frage"
                        multiline
                        value={bonus.question ?? ""}
                        source={sourceBonus.question}
                        confirmed={confirmedSet.has(`${bonusPrefix}:question`)}
                        onConfirm={handleConfirm}
                        onChange={(question) => {
                          handleValue(`${bonusPrefix}:question`, sourceBonus.question ?? "", question);
                          patchBonus(linkId, link.task_id, { question });
                        }}
                      />
                      <TranslatableField
                        unitKey={`${bonusPrefix}:success_info`}
                        label="Erfolg · Text"
                        multiline
                        value={bonus.success_info ?? ""}
                        source={sourceBonus.success_info}
                        confirmed={confirmedSet.has(`${bonusPrefix}:success_info`)}
                        onConfirm={handleConfirm}
                        onChange={(success_info) => {
                          handleValue(
                            `${bonusPrefix}:success_info`,
                            sourceBonus.success_info ?? "",
                            success_info,
                          );
                          patchBonus(linkId, link.task_id, { success_info });
                        }}
                      />
                      <OptionFields
                        options={bonus.options ?? []}
                        sourceOptions={sourceBonus.options ?? []}
                        keyPrefix={bonusPrefix}
                        confirmed={confirmedSet}
                        onConfirm={handleConfirm}
                        onValue={handleValue}
                        onChange={(options) => patchBonus(linkId, link.task_id, { options })}
                      />
                      <TileFields
                        tiles={bonus.tiles ?? []}
                        sourceTiles={sourceBonus.tiles ?? []}
                        keyPrefix={bonusPrefix}
                        confirmed={confirmedSet}
                        onConfirm={handleConfirm}
                        onValue={handleValue}
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
