"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  addTaskToGame,
  removeTaskFromGame,
  reorderGameTasksInLayer,
  updateGameTaskLinkConfig,
} from "@/app/actions/cms/games";
import { StudioPanel } from "@/components/cms/admin-shell";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import {
  IconArrowRight,
  IconPlus,
  IconSave,
  IconTrash,
} from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioSuccess,
  StudioTextarea,
} from "@/components/cms/studio-ui";
import {
  buildGameSlots,
  parseArrivalQuizOverride,
  slotPhaseSummary,
  type GameSlot,
  type StudioArrivalQuiz,
} from "@/lib/cms/game-slots";
import {
  groupLinksByLayerOnLink,
  parseLinkLayer,
  parseLinkOverrides,
  roleLabelShort,
} from "@/lib/cms/game-link-config";
import { useDebouncedValue, useTaskLibrarySearch } from "@/lib/hooks/use-task-library-search";
import { useStudioCache } from "@/lib/platform/studio-cache";
import type { ContentMode, RoleAssignment } from "@/lib/cms/layer-model";
import { contentModeLabel } from "@/lib/cms/layer-model";
import type { StudioGameTaskLink } from "@/lib/cms/types";

const BONUS_ROLE_OPTIONS: Array<{ value: RoleAssignment; label: string; hint: string }> = [
  { value: "gamma", label: "Nur Gamma", hint: "Nur Gamma sieht und beantwortet den Bonus." },
  { value: "alpha", label: "Nur Alpha", hint: "Nur Alpha (Team-Lead) sieht den Bonus." },
  { value: "beta", label: "Nur Beta", hint: "Nur Beta sieht den Bonus." },
  { value: "team", label: "Ganzes Team", hint: "Alle Spieler sehen dieselbe Bonusaufgabe." },
];

type Props = {
  gameId: string;
  surface: ContentMode;
  language: "de" | "en";
  initialLinks: StudioGameTaskLink[];
};

function emptyQuiz(): StudioArrivalQuiz {
  const a = crypto.randomUUID().slice(0, 8);
  const b = crypto.randomUUID().slice(0, 8);
  const c = crypto.randomUUID().slice(0, 8);
  const d = crypto.randomUUID().slice(0, 8);
  return {
    question: "",
    options: [
      { id: a, label: "", correct: true },
      { id: b, label: "", correct: false },
      { id: c, label: "", correct: false },
      { id: d, label: "", correct: false },
    ],
    correct_option_id: a,
  };
}

export function GameSlotsPanel({ gameId, surface, language, initialLinks }: Props) {
  const cache = useStudioCache();
  const [links, setLinks] = useState(() => initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editSlot, setEditSlot] = useState<GameSlot | null>(null);
  const [quizDraft, setQuizDraft] = useState<StudioArrivalQuiz>(emptyQuiz());
  const [multiCorrect, setMultiCorrect] = useState(false);
  const [bonusTaskId, setBonusTaskId] = useState("");
  const [bonusRole, setBonusRole] = useState<RoleAssignment>("gamma");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 200);
  const { data: library = [] } = useTaskLibrarySearch(debounced);

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const slots = useMemo(() => buildGameSlots(links), [links]);
  const grouped = useMemo(() => groupLinksByLayerOnLink(links), [links]);
  const bonusCandidates = grouped[3];
  const hubLabel =
    surface === "indoor" ? "Stationen-Auswahl" : surface === "online" ? "Missions-Auswahl" : "Karte";

  function commit(next: StudioGameTaskLink[]) {
    setLinks(next);
    cache.setGameTaskLinks(gameId, next);
  }

  function openQuizEditor(slot: GameSlot) {
    setEditSlot(slot);
    const existing =
      slot.quiz ??
      parseArrivalQuizOverride(
        (slot.levelLink.overrides as { arrival_quiz?: unknown })?.arrival_quiz,
      ) ??
      emptyQuiz();
    setQuizDraft(existing);
    setMultiCorrect(Boolean(existing.correct_option_ids?.length));
    setBonusTaskId(slot.bonusLink?.task_id ?? "");
    const existingRole = slot.bonusLink
      ? parseLinkOverrides(slot.bonusLink.overrides).role
      : undefined;
    setBonusRole(
      existingRole === "alpha" ||
        existingRole === "beta" ||
        existingRole === "gamma" ||
        existingRole === "team"
        ? existingRole
        : "gamma",
    );
    setError(null);
    setMessage(null);
  }

  function handleAddStop() {
    const pick = library[0];
    if (!pick) {
      setError("Lege zuerst in der Aufgaben-Bibliothek ein Level an (mit Kacheln/Antwort).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addTaskToGame(gameId, pick.id, 2);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const next = [...links, result.data!];
      commit(next);
      setMessage("Stop hinzugefügt — jetzt Quiz und optional Bonus festlegen.");
    });
  }

  function handleSaveSlot() {
    if (!editSlot) return;
    const question = quizDraft.question.trim();
    if (!question) {
      setError("Bitte eine Quiz-Frage eingeben.");
      return;
    }
    const filled = quizDraft.options.filter((o) => o.label.trim());
    if (filled.length < 2) {
      setError("Mindestens zwei Antwortoptionen nötig.");
      return;
    }
    const correct = filled.filter((o) => o.correct);
    if (correct.length === 0) {
      setError("Markiere mindestens eine richtige Antwort.");
      return;
    }

    const arrival_quiz: StudioArrivalQuiz = {
      question,
      options: filled.map((o) => ({
        id: o.id,
        label: o.label.trim(),
        correct: Boolean(o.correct),
      })),
      ...(multiCorrect || correct.length > 1
        ? { correct_option_ids: correct.map((o) => o.id), correct_option_id: correct[0]!.id }
        : { correct_option_id: correct[0]!.id }),
    };

    setError(null);
    startTransition(async () => {
      const result = await updateGameTaskLinkConfig(gameId, editSlot.levelLink.id, {
        arrival_quiz,
        bonus_task_id: bonusTaskId || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

      let nextLinks = links.map((l) => (l.id === result.data!.id ? result.data! : l));

      if (bonusTaskId) {
        let bonusLink = nextLinks.find(
          (l) => l.task_id === bonusTaskId && parseLinkLayer(l) === 3,
        );
        if (!bonusLink) {
          const add = await addTaskToGame(gameId, bonusTaskId, 3);
          if (add.success && add.data) {
            bonusLink = add.data;
            nextLinks = [...nextLinks, add.data];
          }
        }
        if (bonusLink) {
          const bonusUpdate = await updateGameTaskLinkConfig(gameId, bonusLink.id, {
            role: bonusRole,
            trigger: {
              type: "after_task_solved",
              source_task_id: editSlot.levelLink.task_id,
            },
          });
          if (bonusUpdate.success && bonusUpdate.data) {
            nextLinks = nextLinks.map((l) =>
              l.id === bonusUpdate.data!.id ? bonusUpdate.data! : l,
            );
          }
        }
      }

      commit(nextLinks);
      setMessage("Stop gespeichert: Quiz → Level → Bonus.");
      setEditSlot(null);
    });
  }

  function handleRemoveStop(slot: GameSlot) {
    if (!confirm(`Stop „${slot.levelLink.task.title}“ entfernen?`)) return;
    startTransition(async () => {
      const result = await removeTaskFromGame(gameId, slot.levelLink.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      commit(links.filter((l) => l.id !== slot.levelLink.id));
    });
  }

  function moveStop(slot: GameSlot, dir: -1 | 1) {
    const missionIds = slots.map((s) => s.levelLink.id);
    const idx = missionIds.indexOf(slot.levelLink.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= missionIds.length) return;
    const next = [...missionIds];
    const tmp = next[idx]!;
    next[idx] = next[swap]!;
    next[swap] = tmp;
    startTransition(async () => {
      const result = await reorderGameTasksInLayer(gameId, 2, next);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const byId = new Map(links.map((l) => [l.id, l]));
      const reordered = next
        .map((id, i) => {
          const link = byId.get(id);
          return link ? { ...link, sort_order: i } : null;
        })
        .filter(Boolean) as StudioGameTaskLink[];
      const others = links.filter((l) => parseLinkLayer(l) !== 2);
      commit([...reordered, ...others]);
    });
  }

  return (
    <StudioPanel>
      <StudioSectionTitle
        title="Spielablauf"
        description={`Jeder Stop: Quiz → Level → Bonus. Danach zurück zur ${hubLabel}. Surface: ${contentModeLabel(surface)}.`}
      />

      <StudioHint tone="info">
        So spielen die Teams: zuerst Multiple-Choice (Schlüssel), dann das Level mit Kacheln, optional
        eine Bonusaufgabe — danach wieder {hubLabel}.
      </StudioHint>

      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <div className="mt-4 space-y-3">
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">Noch keine Stops</p>
            <p className="mt-1 text-xs text-slate-500">
              Füge ein Level aus der Bibliothek hinzu — danach Quiz und Bonus festlegen.
            </p>
          </div>
        ) : (
          slots.map((slot) => (
            <div
              key={slot.levelLink.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Stop {slot.index}
                  </p>
                  <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
                    {slot.levelLink.task.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {slotPhaseSummary(slot)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StudioButton
                    type="button"
                    variant="ghost"
                    disabled={pending || slot.index === 1}
                    onClick={() => moveStop(slot, -1)}
                  >
                    ↑
                  </StudioButton>
                  <StudioButton
                    type="button"
                    variant="ghost"
                    disabled={pending || slot.index === slots.length}
                    onClick={() => moveStop(slot, 1)}
                  >
                    ↓
                  </StudioButton>
                  <StudioButton type="button" variant="secondary" onClick={() => openQuizEditor(slot)}>
                    Quiz / Bonus
                  </StudioButton>
                  <Link
                    href={`/admin/tasks/${slot.levelLink.task_id}?returnTo=/admin/games/${gameId}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                  >
                    Level bearbeiten <IconArrowRight size={14} />
                  </Link>
                  <StudioButton
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => handleRemoveStop(slot)}
                    icon={<IconTrash size={14} />}
                  >
                    Entfernen
                  </StudioButton>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <PhaseCard
                  label="1 · Quiz"
                  ok={Boolean(slot.quiz)}
                  text={
                    slot.quiz
                      ? slot.quiz.question.slice(0, 80)
                      : "Noch kein Opener-Quiz"
                  }
                />
                <PhaseCard
                  label="2 · Level"
                  ok
                  text={`${slot.levelLink.task.content.tiles?.length ?? 0} Kacheln · ${
                    slot.levelLink.task.content.answer_type === "text" ? "Freitext" : "Auswahl"
                  }`}
                />
                <PhaseCard
                  label="3 · Bonus"
                  ok={Boolean(slot.bonusLink)}
                  text={
                    slot.bonusLink
                      ? `${slot.bonusLink.task.title} · ${roleLabelShort(
                          parseLinkOverrides(slot.bonusLink.overrides).role,
                        )}`
                      : "Optional"
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <StudioLabel>Level aus Bibliothek suchen</StudioLabel>
          <StudioInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titel suchen…"
          />
        </div>
        <StudioButton
          type="button"
          disabled={pending}
          onClick={handleAddStop}
          icon={<IconPlus size={16} />}
        >
          Stop hinzufügen
        </StudioButton>
      </div>
      {library.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Vorschlag beim Hinzufügen: „{library[0]!.title}“. Lege Level-Aufgaben in der Bibliothek an.
        </p>
      ) : null}

      {editSlot ? (
        <StudioModal
          open
          onClose={() => setEditSlot(null)}
          title={`Stop ${editSlot.index}: Quiz & Bonus`}
        >
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Level: <strong>{editSlot.levelLink.task.title}</strong> · Sprache {language.toUpperCase()}
            </p>

            <div>
              <StudioLabel>Opener-Quiz (Multiple Choice)</StudioLabel>
              <StudioTextarea
                value={quizDraft.question}
                onChange={(e) => setQuizDraft((q) => ({ ...q, question: e.target.value }))}
                rows={2}
                placeholder="Frage, die das Level freischaltet…"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={multiCorrect}
                onChange={(e) => setMultiCorrect(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              Mehrere Antworten können richtig sein
            </label>

            <div className="space-y-2">
              {quizDraft.options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type={multiCorrect ? "checkbox" : "radio"}
                    name="correct"
                    checked={Boolean(opt.correct)}
                    onChange={() => {
                      setQuizDraft((q) => ({
                        ...q,
                        options: q.options.map((o, j) =>
                          multiCorrect
                            ? j === i
                              ? { ...o, correct: !o.correct }
                              : o
                            : { ...o, correct: j === i },
                        ),
                      }));
                    }}
                    className="h-4 w-4 border-slate-300 text-teal-600"
                  />
                  <StudioInput
                    value={opt.label}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuizDraft((q) => ({
                        ...q,
                        options: q.options.map((o, j) =>
                          j === i ? { ...o, label: value } : o,
                        ),
                      }));
                    }}
                    placeholder={`Antwort ${i + 1}`}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <StudioLabel hint="Erscheint nach gelöstem Level">Bonusaufgabe (optional)</StudioLabel>
                <StudioSelect
                  value={bonusTaskId}
                  onChange={(e) => setBonusTaskId(e.target.value)}
                >
                  <option value="">Kein Bonus</option>
                  {bonusCandidates.map((b) => (
                    <option key={b.task_id} value={b.task_id}>
                      {b.task.title}
                    </option>
                  ))}
                  {library
                    .filter((t) => !bonusCandidates.some((b) => b.task_id === t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} (Bibliothek)
                      </option>
                    ))}
                </StudioSelect>
              </div>

              {bonusTaskId ? (
                <div>
                  <StudioLabel>Wer erhält den Bonus?</StudioLabel>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {BONUS_ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBonusRole(opt.value)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                          bonusRole === opt.value
                            ? "border-teal-400 bg-teal-50/70 ring-1 ring-teal-200"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Optional: Bonus-Aufgabe aus der Bibliothek wählen und festlegen, wer sie sieht.
                </p>
              )}
            </div>

            {error ? <StudioError message={error} /> : null}

            <div className="flex flex-wrap gap-2">
              <StudioButton
                type="button"
                disabled={pending}
                onClick={handleSaveSlot}
                icon={<IconSave size={16} />}
              >
                Speichern
              </StudioButton>
              <StudioButton type="button" variant="ghost" onClick={() => setEditSlot(null)}>
                Abbrechen
              </StudioButton>
            </div>
          </div>
        </StudioModal>
      ) : null}
    </StudioPanel>
  );
}

function PhaseCard({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        ok ? "border-teal-200 bg-teal-50/50" : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-800">{text}</p>
    </div>
  );
}
