"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconGift, IconUser, IconUsers, IconX } from "@/components/game/city/icons";
import { CodeBoxesInput } from "@/components/game/code-boxes-input";
import { ContentTileGrid } from "@/components/game/content-tile-grid";
import { FormattedTaskText } from "@/components/game/formatted-task-text";
import { LevelScoringBar } from "@/components/game/level-scoring-bar";
import { MediaCapturePanel } from "@/components/game/media-capture-panel";
import { MediaModal } from "@/components/game/media-modal";
import { PlayTransitionScreen } from "@/components/game/play-transition-screen";
import { CODE_BOX_MAX } from "@/lib/cms/types";
import type { BonusTask, LevelContentTile } from "@/lib/grid/level-types";
import type { BonusSessionState } from "@/lib/grid/game-state";
import { bonusMediaKind, formatBonusSolution } from "@/lib/grid/bonus";
import { earliestIsoTimestamp } from "@/lib/grid/level-scoring";
import { useLevelScoringTimer } from "@/lib/hooks/use-level-scoring-timer";
import {
  bonusAudienceHeadline,
  bonusAudienceIconCount,
  type RoleDisplayLabels,
} from "@/lib/grid/role-labels";
import type { ContentMode } from "@/lib/cms/layer-model";
import { hubMeta } from "@/lib/grid/play-slots";
import { playPlaySfx } from "@/lib/grid/play-sfx";
import { CityTeamBar } from "@/components/game/city/team-bar";
import { TeamPaceHint } from "@/components/game/team-pace-hint";

function bonusClockStorageKey(bonusId: string, clockScope: string): string {
  return `grid:bonus-clock:${clockScope}:${bonusId}`;
}

function readStoredBonusClock(bonusId: string, clockScope: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(bonusClockStorageKey(bonusId, clockScope));
  } catch {
    return null;
  }
}

function writeStoredBonusClock(bonusId: string, clockScope: string, iso: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(bonusClockStorageKey(bonusId, clockScope), iso);
  } catch {
    /* private mode */
  }
}

type TeammateOption = {
  id: string;
  name: string;
  roleLabel: string;
};

type Props = {
  bonus: BonusTask;
  bonusId: string;
  mode: ContentMode;
  isMine: boolean;
  myName: string;
  myRoleLabel: string;
  teamName: string;
  roleLabels?: RoleDisplayLabels | null;
  /** When true, non-assignees already play on the hub — no waiting UI. */
  asymmetricOverlay?: boolean;
  disabled: boolean;
  isPending: boolean;
  teamSession?: BonusSessionState | null;
  canPaceTeam?: boolean;
  leadLabel?: string;
  teammates?: TeammateOption[];
  clockScope?: string | null;
  captureContext?: {
    inviteCode: string;
    joinCode: string;
    sessionId: string;
  };
  onBegin: () => void;
  onSubmit: (selectedOptionId: string, extras?: { timedOut?: boolean; clockStartedAt?: string | null }) => void;
  onContinue: () => void;
  onSkipWaiting: () => void;
  onHandOff?: (toPlayerId: string) => void;
};

export function PlayBonusView({
  bonus,
  bonusId,
  mode,
  isMine,
  myName,
  myRoleLabel,
  teamName,
  roleLabels = null,
  asymmetricOverlay = false,
  disabled,
  isPending,
  teamSession = null,
  canPaceTeam = false,
  leadLabel = "Team Lead",
  onBegin,
  onSubmit,
  onContinue,
  onSkipWaiting,
  teammates = [],
  clockScope = null,
  captureContext,
  onHandOff,
}: Props) {
  const answerMode = bonus.answer_mode ?? (bonus.options.length > 0 ? "choice" : "text");
  const mediaKind = bonusMediaKind(bonus);
  const boxCount =
    bonus.number_fields ?? Math.min(CODE_BOX_MAX, Math.max(1, (bonus.answer ?? "").length || CODE_BOX_MAX));

  const [localIntro, setLocalIntro] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [numberParts, setNumberParts] = useState<string[]>(() =>
    Array.from({ length: boxCount }, () => ""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [activeTile, setActiveTile] = useState<LevelContentTile | null>(null);
  const clockKey = clockScope?.trim() || "play";
  const [localStartedAt, setLocalStartedAt] = useState<string | null>(() =>
    readStoredBonusClock(bonusId, clockKey),
  );
  const [localTimeout, setLocalTimeout] = useState(false);
  const [localTimeoutAt, setLocalTimeoutAt] = useState<string | null>(null);
  const sfxPlayedRef = useRef<string | null>(null);

  const scoringStartedAt = earliestIsoTimestamp(
    teamSession?.started_at,
    localStartedAt,
    readStoredBonusClock(bonusId, clockKey),
  );
  const reveal =
    teamSession?.reveal ??
    (localTimeout
      ? {
          bonus_id: bonusId,
          answered_by: myName,
          answered_by_player_id: "",
          correct: false,
          reward: 0,
          selected_option_id: "",
          attempt_label: "Zeit abgelaufen",
          revealed_at: localTimeoutAt ?? scoringStartedAt ?? "",
          timed_out: true,
        }
      : null);
  const introDone = Boolean(teamSession?.intro_done || localIntro || reveal);
  const show = Boolean(reveal);
  const correct = reveal?.correct ?? false;
  const locked = show || disabled || isPending || submitting;
  const busyHandOff = locked;
  const selectedId = reveal?.selected_option_id ?? picked ?? "";
  const attemptLabel =
    reveal?.attempt_label ??
    (answerMode === "choice" || answerMode === "confirm"
      ? bonus.options.find((o) => o.id === selectedId)?.label ?? selectedId
      : answerMode === "boxes"
        ? numberParts.map((p) => p.trim()).join("")
        : textAnswer.trim());

  const typed =
    answerMode === "boxes"
      ? numberParts.map((p) => p.trim()).join("")
      : textAnswer.trim();

  const hub = hubMeta(mode);
  const audience = bonusAudienceIconCount(bonus);
  const audienceLabel = bonusAudienceHeadline(bonus, roleLabels);
  const tiles = bonus.tiles ?? [];
  const scoringSnapshot = useLevelScoringTimer(
    introDone ? bonus.scoring : undefined,
    introDone ? scoringStartedAt : null,
  );
  const timedOutRef = useRef(false);

  const canCheck =
    answerMode === "choice" || answerMode === "confirm"
      ? Boolean(picked)
      : answerMode === "boxes"
        ? numberParts.every((p) => p.trim().length > 0)
        : Boolean(typed);

  useEffect(() => {
    if (reveal) return;
    if (!isPending && !timedOutRef.current) {
      setSubmitting(false);
      setContinuing(false);
    }
  }, [reveal, isPending]);

  useEffect(() => {
    if (!reveal) return;
    if (sfxPlayedRef.current) return;
    sfxPlayedRef.current = reveal.revealed_at;
    playPlaySfx(reveal.correct ? "correct" : "wrong");
  }, [reveal]);

  useEffect(() => {
    if (!introDone) return;
    const pinned =
      earliestIsoTimestamp(
        teamSession?.started_at,
        localStartedAt,
        readStoredBonusClock(bonusId, clockKey),
      ) ?? new Date().toISOString();
    writeStoredBonusClock(bonusId, clockKey, pinned);
    setLocalStartedAt((prev) => earliestIsoTimestamp(prev, pinned) ?? pinned);
    // localStartedAt is read once to seed; writing it must not re-run this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonusId, introDone, teamSession?.started_at]);

  useEffect(() => {
    if (
      !scoringSnapshot?.isExpired ||
      !scoringSnapshot.hasCountdown ||
      show ||
      submitting ||
      timedOutRef.current ||
      !introDone
    ) {
      return;
    }
    timedOutRef.current = true;
    const expiredAt = new Date().toISOString();
    setLocalTimeoutAt((prev) => prev ?? expiredAt);
    setLocalTimeout(true);
    setSubmitting(true);
    onSubmit("", { timedOut: true, clockStartedAt: scoringStartedAt });
  }, [
    introDone,
    onSubmit,
    scoringSnapshot?.hasCountdown,
    scoringSnapshot?.isExpired,
    scoringStartedAt,
    show,
    submitting,
  ]);

  function beginIntro() {
    if (introDone) return;
    const started = new Date().toISOString();
    setLocalStartedAt(started);
    writeStoredBonusClock(bonusId, clockKey, started);
    setLocalIntro(true);
    onBegin();
  }

  function checkAnswer() {
    if (!canCheck || show || submitting) return;
    const payload =
      answerMode === "choice" || answerMode === "confirm" ? picked : typed || picked;
    if (!payload) return;
    setSubmitting(true);
    onSubmit(payload, { clockStartedAt: scoringStartedAt });
  }

  function handleContinue() {
    if (continuing || !reveal || !canPaceTeam) return;
    setContinuing(true);
    onContinue();
  }

  if (!isMine) {
    if (asymmetricOverlay || bonus.for_team) {
      return null;
    }
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-5 sm:px-5">
        <CityTeamBar teamName={teamName} meName={myName} meRoleLabel={myRoleLabel} compact />
        <div className="mt-8 flex flex-col items-center text-center">
          <span className="cg-animate-pop-in flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
            <IconGift size={40} />
          </span>
          <SectionLabel>Bonusaufgabe läuft</SectionLabel>
          <h2 className="mt-2 text-2xl font-bold text-[var(--cg-fg)]">
            {audienceLabel} ist dran
          </h2>
          <p className="mt-3 max-w-sm text-base text-[var(--cg-muted)]">
            Nur {audienceLabel} sieht die Aufgabe. Danach geht es für alle weiter zur{" "}
            {hub.hubLabelDe}.
          </p>
        </div>
        <div className="mt-auto pt-8">
          <BigButton variant="ghost" disabled={disabled || isPending} onClick={onSkipWaiting}>
            Weiter ohne Bonus (Team)
          </BigButton>
        </div>
      </section>
    );
  }

  if (!introDone) {
    return (
      <PlayTransitionScreen
        kind="bonus"
        title={
          bonus.for_team
            ? "Nächste Aufgabe für alle"
            : "Folgende Aufgabe ist für dich"
        }
        highlight={audienceLabel}
        subtitle={
          bonus.for_team
            ? "Macht euch bereit — die Bonusaufgabe erscheint gleich auf jedem Gerät."
            : "Nur auf deinem Handy. Danach bist du wieder bei deinem Team."
        }
        audienceIcons={audience}
        onDone={beginIntro}
      />
    );
  }

  const inputTone = !show
    ? "border-[var(--cg-input)]"
    : correct
      ? "border-[var(--cg-success)]"
      : "border-[var(--cg-destructive)]";
  const solutionLabel = formatBonusSolution(bonus);
  const answerer = reveal?.answered_by ?? myName;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 pb-[max(2rem,calc(1rem+env(safe-area-inset-bottom)))] pt-5 sm:px-5">
      <CityTeamBar teamName={teamName} meName={myName} meRoleLabel={myRoleLabel} compact />

      <div className="mt-6 flex flex-col items-center text-center">
        <span className="cg-animate-pop-in flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
          <IconGift size={40} />
        </span>
        <SectionLabel>
          {bonus.scoring?.countdown_seconds
            ? "Bonusaufgabe"
            : `Bonusaufgabe · +${bonus.reward} Punkte`}
        </SectionLabel>
        <h1 className="mt-1 text-2xl font-bold text-[var(--cg-fg)]">{bonus.title}</h1>
      </div>

      {bonus.scoring && introDone && !show ? (
        <div className="mt-4">
          <LevelScoringBar
            scoring={bonus.scoring}
            startedAt={scoringStartedAt}
            snapshot={scoringSnapshot}
            compact
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--cg-primary)] px-3 py-2 text-sm font-bold text-[var(--cg-primary-fg)]">
          <IconUser size={16} />
          {bonus.for_team ? audienceLabel : `${myName} · ${audienceLabel}`}
        </span>
      </div>

      <div
        className={`mt-8 space-y-4 ${
          show && !correct ? "cg-animate-shake" : "cg-animate-rise-in"
        }`}
      >
        <p className="rounded-2xl bg-[var(--cg-accent)]/15 px-4 py-3 text-center text-base font-semibold text-[var(--cg-fg)]">
          {bonus.for_team
            ? "Diese Bonusaufgabe sehen alle im Team. Eine Antwort gilt für alle."
            : `Nur du siehst diese Aufgabe, ${myName}.`}
        </p>

        {bonus.hero_image_url ? (
          <div className="overflow-hidden rounded-2xl shadow-[var(--cg-shadow-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bonus.hero_image_url}
              alt=""
              className="max-h-[min(28vh,14rem)] w-full object-cover object-center"
            />
          </div>
        ) : null}

        {bonus.description?.trim() ? (
          <FormattedTaskText
            text={bonus.description}
            className="space-y-3 text-left text-[15px] leading-[1.65] text-[var(--cg-fg)] sm:text-base"
          />
        ) : null}

        {tiles.length > 0 ? (
          <ContentTileGrid
            tiles={tiles}
            purchasedHints={{}}
            score={0}
            onOpen={setActiveTile}
            onPurchaseHint={() => {}}
            cityStyle
            soloAlpha
          />
        ) : null}

        <p className="rounded-2xl bg-[var(--cg-card)] p-5 text-lg font-semibold shadow-[var(--cg-shadow-soft)] text-[var(--cg-fg)]">
          {bonus.question}
        </p>

        {mediaKind && !show ? (
          <MediaCapturePanel
            kind={mediaKind}
            overlayImageUrl={bonus.overlay_image_url}
            levelNumber={0}
            disabled={locked}
            isPending={isPending || submitting}
            captureContext={captureContext}
            allowSkip={false}
            onSubmit={(payload) => {
              if (payload.revealSolution || show || submitting) return;
              setSubmitting(true);
              onSubmit("done", { clockStartedAt: scoringStartedAt });
            }}
          />
        ) : null}

        {!mediaKind && (answerMode === "choice" || answerMode === "confirm") ? (
          <div className={`grid gap-3 ${bonus.options.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {bonus.options.map((opt) => {
              const isPicked = selectedId === opt.id;
              const isRight = opt.id === bonus.correct_option_id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setPicked(opt.id)}
                  className={`cg-tap-lift flex items-center justify-center gap-2 rounded-2xl border-2 py-6 text-xl font-bold ${
                    show && isRight
                      ? "border-[var(--cg-success)] bg-[var(--cg-success)]/20"
                      : show && isPicked
                        ? "border-[var(--cg-destructive)] bg-[var(--cg-destructive)]/10"
                        : "border-[var(--cg-border)] bg-[var(--cg-card)]"
                  }`}
                >
                  {opt.label}
                  {show && isRight ? <IconCheck className="text-[var(--cg-success)]" /> : null}
                  {show && isPicked && !isRight ? (
                    <IconX className="text-[var(--cg-destructive)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {answerMode === "text" ? (
          <input
            value={show ? attemptLabel : textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Antwort eintragen…"
            disabled={locked}
            className={`w-full rounded-2xl border-2 bg-[var(--cg-bg)] px-4 py-4 text-center text-xl font-bold text-[var(--cg-fg)] outline-none focus:border-[var(--cg-primary)] disabled:opacity-70 ${inputTone}`}
          />
        ) : null}

        {answerMode === "boxes" ? (
          <div
            className={
              show
                ? correct
                  ? "rounded-2xl ring-2 ring-[var(--cg-success)]/50"
                  : "rounded-2xl ring-2 ring-[var(--cg-destructive)]/50"
                : undefined
            }
          >
            <CodeBoxesInput
              count={boxCount}
              values={
                show && attemptLabel
                  ? Array.from({ length: boxCount }, (_, i) => attemptLabel[i] ?? "")
                  : numberParts
              }
              onChange={setNumberParts}
              disabled={locked}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-auto space-y-3 pt-6">
        {!show ? (
          <>
            {!mediaKind ? (
              <BigButton disabled={locked || !canCheck} onClick={checkAnswer}>
                Antwort prüfen
              </BigButton>
            ) : null}
            {onHandOff && teammates.length > 0 ? (
              <div className="space-y-2 pt-1">
                {pickOpen ? (
                  <div className="space-y-2 rounded-2xl bg-[var(--cg-secondary)] px-3 py-3">
                    <p className="px-1 text-center text-sm font-semibold text-[var(--cg-fg)]">
                      Wer übernimmt?
                    </p>
                    {teammates.map((mate) => (
                      <button
                        key={mate.id}
                        type="button"
                        disabled={busyHandOff}
                        onClick={() => onHandOff(mate.id)}
                        className="cg-tap-lift flex w-full items-center justify-between rounded-xl bg-[var(--cg-card)] px-4 py-3 text-left disabled:opacity-50"
                      >
                        <span className="font-semibold text-[var(--cg-fg)]">{mate.name}</span>
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--cg-muted)]">
                          {mate.roleLabel}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={busyHandOff}
                      onClick={() => setPickOpen(false)}
                      className="w-full pt-1 text-center text-sm font-semibold text-[var(--cg-muted)]"
                    >
                      Zurück
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setPickOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-semibold text-[var(--cg-muted)] disabled:opacity-40"
                  >
                    <IconUsers size={16} />
                    Geht bei mir nicht — wer übernimmt?
                  </button>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <div
            className={`space-y-3 ${correct ? "cg-animate-rise-in" : "cg-animate-pop-in"}`}
          >
            {correct ? (
              <div
                className="flex items-start gap-3 rounded-2xl bg-[var(--cg-success)]/15 px-4 py-3.5 text-left ring-2 ring-[var(--cg-success)]/40"
                role="status"
              >
                <span className="cg-animate-key-turn flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cg-success)] text-white">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-[var(--cg-fg)]">
                    {answerer} hat {reveal?.reward ?? bonus.reward} Punkte gerade geholt
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--cg-muted)]">
                    +{reveal?.reward ?? bonus.reward} Punkte für das Team.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="flex items-start gap-3 rounded-2xl bg-[var(--cg-destructive)]/12 px-4 py-3.5 text-left ring-2 ring-[var(--cg-destructive)]/35"
                  role="alert"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cg-destructive)] text-white">
                    <X className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-bold text-[var(--cg-destructive)]">
                      {reveal?.timed_out
                        ? "Zeit abgelaufen — die Bonusaufgabe gilt als nicht gelöst"
                        : `${answerer} konnte die Aufgabe nicht beantworten`}
                    </p>
                    {reveal?.timed_out ? (
                      <p className="mt-1 text-sm leading-snug text-[var(--cg-fg)]">
                        0 Extra-Punkte — {leadLabel} geht weiter, wenn ihr soweit seid.
                      </p>
                    ) : (
                      <>
                        {attemptLabel ? (
                          <p className="mt-1 text-sm leading-snug text-[var(--cg-fg)]">
                            Eingabe von {answerer}:{" "}
                            <span className="font-bold tracking-wide">{attemptLabel}</span>
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-sm leading-snug text-[var(--cg-muted)]">
                          Keine Extra-Punkte — {leadLabel} geht weiter, wenn ihr soweit seid.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {solutionLabel ? (
                  <div className="rounded-2xl border border-[var(--cg-success)]/40 bg-[var(--cg-success)]/10 px-4 py-3 text-left text-sm text-[var(--cg-fg)]">
                    <p className="font-semibold text-[var(--cg-success)]">Richtige Antwort</p>
                    <p className="mt-1 text-base font-bold tracking-wide">{solutionLabel}</p>
                  </div>
                ) : null}
              </>
            )}

            {canPaceTeam ? (
              <BigButton disabled={isPending || continuing} onClick={handleContinue}>
                {asymmetricOverlay ? "Zurück zum Team" : `Weiter zur ${hub.hubLabelDe}`}
              </BigButton>
            ) : (
              <TeamPaceHint canPaceTeam={false} leadLabel={leadLabel} />
            )}
          </div>
        )}
      </div>

      <MediaModal tile={activeTile} onClose={() => setActiveTile(null)} />
    </section>
  );
}
