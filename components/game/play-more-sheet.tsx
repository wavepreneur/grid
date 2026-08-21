"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BigButton } from "@/components/game/city/ui";

export type PlayMorePanel = "menu" | "briefing" | "support" | "pause" | "team" | null;

type Props = {
  open: PlayMorePanel;
  onOpen: (panel: PlayMorePanel) => void;
  onClose: () => void;
  briefingText?: string | null;
  crispWebsiteId?: string | null;
  paused: boolean;
  onTogglePause: () => void;
  isAlpha: boolean;
  teammates: Array<{ id: string; name: string; roleLabel: string }>;
  onTransferAlpha?: (playerId: string) => void;
  transferPending?: boolean;
  onReclaimSession?: () => void;
};

/**
 * One compact entry point (⋯) keeps the hub clean.
 * Secondary actions live in a bottom sheet — Briefing, Support, Pause, Team.
 */
export function PlayMoreSheet({
  open,
  onOpen,
  onClose,
  briefingText,
  crispWebsiteId,
  paused,
  onTogglePause,
  isAlpha,
  teammates,
  onTransferAlpha,
  transferPending,
  onReclaimSession,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[var(--cg-ink)]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[var(--cg-card)] shadow-[var(--cg-shadow-lift)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--cg-fg)]">{panelTitle(open)}</h2>
          <button
            type="button"
            onClick={onClose}
            className="tap-lift rounded-full bg-[var(--cg-secondary)] px-3 py-1.5 text-sm font-semibold"
          >
            Schließen
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {open === "menu" ? (
            <div className="grid gap-2">
              <MenuRow
                title="Briefing"
                hint="Spielregeln und Einstieg jederzeit nachlesen"
                onClick={() => onOpen("briefing")}
              />
              <MenuRow
                title="Support-Chat"
                hint="Hilfe vom Team — öffnet den Chat im Spiel"
                onClick={() => onOpen("support")}
              />
              <MenuRow
                title={paused ? "Weiterspielen" : "Pause"}
                hint={
                  paused
                    ? "Countdown läuft wieder"
                    : "Zeit anhalten, z. B. für Toilettengang"
                }
                onClick={() => {
                  onTogglePause();
                  if (!paused) onOpen("pause");
                  else onClose();
                }}
              />
              <MenuRow
                title="Team & Alpha"
                hint="Rolle abgeben oder Sitzung zurückholen"
                onClick={() => onOpen("team")}
              />
            </div>
          ) : null}

          {open === "briefing" ? (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-base leading-relaxed text-[var(--cg-muted)]">
                {briefingText?.trim() ||
                  "Für dieses Spiel ist noch kein Briefing hinterlegt. Der Einstieg läuft über die erste Aufgabe."}
              </p>
              <BigButton variant="ghost" onClick={onClose}>
                Verstanden
              </BigButton>
            </div>
          ) : null}

          {open === "support" ? (
            <CrispEmbed websiteId={crispWebsiteId} />
          ) : null}

          {open === "pause" ? (
            <div className="space-y-4">
              <p className="text-base text-[var(--cg-muted)]">
                Das Spiel ist pausiert. Der Countdown läuft lokal nicht weiter. Schließt die App ruhig —
                danach hier weiterspielen.
              </p>
              <BigButton
                onClick={() => {
                  onTogglePause();
                  onClose();
                }}
              >
                Weiterspielen
              </BigButton>
            </div>
          ) : null}

          {open === "team" ? (
            <div className="space-y-4">
              {isAlpha ? (
                <>
                  <p className="text-sm text-[var(--cg-muted)]">
                    Du bist Alpha. Aufgaben-Aktivierung und GPS liegen bei dir. Gib die Rolle ab, wenn
                    jemand anderes übernehmen soll.
                  </p>
                  <ul className="space-y-2">
                    {teammates.length === 0 ? (
                      <li className="rounded-2xl bg-[var(--cg-secondary)] px-4 py-3 text-sm text-[var(--cg-muted)]">
                        Keine anderen Spieler im Team.
                      </li>
                    ) : (
                      teammates.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--cg-secondary)] px-4 py-3"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-[var(--cg-fg)]">
                              {m.name}
                            </span>
                            <span className="text-xs text-[var(--cg-muted)]">{m.roleLabel}</span>
                          </span>
                          <button
                            type="button"
                            disabled={transferPending || !onTransferAlpha}
                            onClick={() => onTransferAlpha?.(m.id)}
                            className="tap-lift shrink-0 rounded-full bg-[var(--cg-primary)] px-3 py-1.5 text-xs font-bold text-[var(--cg-primary-fg)] disabled:opacity-40"
                          >
                            Alpha geben
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-[var(--cg-muted)]">
                  Alpha aktiviert die Aufgaben. Wenn Alpha offline ist, kann die Rolle übertragen werden —
                  oder du holst deine Sitzung zurück, falls du aus dem Browser geflogen bist.
                </p>
              )}
              {onReclaimSession ? (
                <BigButton variant="outline" onClick={onReclaimSession}>
                  Meine Sitzung zurückholen
                </BigButton>
              ) : null}
              <BigButton variant="ghost" onClick={onClose}>
                Zurück
              </BigButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PlayMoreTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Mehr Optionen"
      onClick={onClick}
      className="tap-lift flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cg-secondary)] text-lg font-bold text-[var(--cg-fg)]"
    >
      ···
    </button>
  );
}

function MenuRow({
  title,
  hint,
  onClick,
}: {
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-lift w-full rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5 text-left"
    >
      <span className="block text-base font-bold text-[var(--cg-fg)]">{title}</span>
      <span className="mt-0.5 block text-sm text-[var(--cg-muted)]">{hint}</span>
    </button>
  );
}

function panelTitle(panel: Exclude<PlayMorePanel, null>): string {
  switch (panel) {
    case "menu":
      return "Spiel-Menü";
    case "briefing":
      return "Briefing";
    case "support":
      return "Support";
    case "pause":
      return "Pause";
    case "team":
      return "Team & Alpha";
  }
}

function CrispEmbed({ websiteId }: { websiteId?: string | null }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!websiteId) {
    return (
      <p className="text-sm text-[var(--cg-muted)]">
        Support-Chat ist noch nicht konfiguriert. Setze{" "}
        <code className="text-xs">NEXT_PUBLIC_CRISP_WEBSITE_ID</code> in der Umgebung.
      </p>
    );
  }

  if (!ready) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)]">
      <iframe
        title="Support-Chat"
        src={`https://go.crisp.chat/chat/embed/?website_id=${encodeURIComponent(websiteId)}`}
        className="h-[min(60vh,520px)] w-full border-0"
        allow="microphone; camera"
      />
    </div>
  );
}

export function PauseBanner({
  onResume,
}: {
  onResume: () => void;
}): ReactNode {
  return (
    <div className="fixed inset-x-0 top-0 z-[110] bg-[var(--cg-primary)] px-4 py-3 text-center text-[var(--cg-primary-fg)] shadow-[var(--cg-shadow-lift)]">
      <p className="text-sm font-bold">Spiel pausiert</p>
      <button type="button" onClick={onResume} className="mt-1 text-xs font-semibold underline">
        Tippen zum Weiterspielen
      </button>
    </div>
  );
}
