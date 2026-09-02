"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BigButton } from "@/components/game/city/ui";
import { PlayDocSheet } from "@/components/game/play-doc-sheet";
import { PersonalResumeLinkCard } from "@/components/player/personal-resume-link-card";
import type { ContentMode } from "@/lib/cms/layer-model";
import {
  GPS_SETTINGS_TIP,
  INDOOR_STATION_TIP,
  ONLINE_SYNC_TIP,
  playHelpMenuHint,
  playHowToPlayHint,
} from "@/lib/grid/play-help";

export type PlayMorePanel =
  | "menu"
  | "briefing"
  | "faq"
  | "help"
  | "gps"
  | "station"
  | "sync"
  | "support"
  | "pause"
  | "team"
  | null;

type Props = {
  open: PlayMorePanel;
  onOpen: (panel: PlayMorePanel) => void;
  onClose: () => void;
  briefingText?: string | null;
  briefingIframeUrl?: string | null;
  faqIframeUrl?: string | null;
  crispWebsiteId?: string | null;
  paused: boolean;
  onTogglePause: () => void;
  isAlpha: boolean;
  teammates: Array<{ id: string; name: string; roleLabel: string }>;
  /** Full roster incl. me — exact spellings for device-switch help. */
  roster?: Array<{ id: string; name: string; roleLabel: string; isMe?: boolean }>;
  inviteCode?: string;
  joinCode?: string;
  sessionId?: string;
  onTransferAlpha?: (playerId: string) => void;
  onReleasePlayerSeat?: (playerId: string) => void;
  transferPending?: boolean;
  onReclaimSession?: () => void;
  onReleaseMySeat?: () => void;
  releasePending?: boolean;
  /** Hub only — Alpha / GPS-lead can unlock the waypoint from this sheet. */
  canUnlockGps?: boolean;
  onForceUnlockGps?: () => void;
  /** Play surface — help copy must match outdoor / indoor / online. */
  mode?: ContentMode;
};

/**
 * One compact entry point (⋯) keeps the hub clean.
 * Secondary actions live in a bottom sheet — Kurzinfo, FAQ, Support, Pause, Team.
 */
export function PlayMoreSheet({
  open,
  onOpen,
  onClose,
  briefingText,
  briefingIframeUrl,
  faqIframeUrl,
  crispWebsiteId,
  paused,
  onTogglePause,
  isAlpha,
  teammates,
  roster = [],
  inviteCode,
  joinCode,
  sessionId,
  onTransferAlpha,
  onReleasePlayerSeat,
  transferPending,
  onReclaimSession,
  onReleaseMySeat,
  releasePending,
  canUnlockGps = false,
  onForceUnlockGps,
  mode = "outdoor",
}: Props) {
  const view: PlayMorePanel =
    open === "gps" && mode === "indoor"
      ? "station"
      : open === "gps" && mode === "online"
        ? "sync"
        : open;
  const showBriefingDoc = view === "briefing" && Boolean(briefingIframeUrl?.trim());
  const showFaqDoc = view === "faq" && Boolean(faqIframeUrl?.trim());
  const busy = Boolean(transferPending || releasePending);
  const nameRoster = roster.length > 0 ? roster : teammates;

  if (!open) return null;

  return (
    <>
      <PlayDocSheet
        open={showBriefingDoc}
        title="Kurzinformationen"
        url={briefingIframeUrl}
        emptyHint="Für dieses Spiel ist noch kein Briefing-Link hinterlegt."
        onClose={onClose}
      />
      <PlayDocSheet
        open={showFaqDoc}
        title="FAQ"
        url={faqIframeUrl}
        emptyHint="Für dieses Spiel ist noch kein FAQ-Link hinterlegt."
        onClose={onClose}
      />

      {!showBriefingDoc && !showFaqDoc ? (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-[var(--cg-ink)]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[var(--cg-card)] pb-[env(safe-area-inset-bottom)] shadow-[var(--cg-shadow-lift)] sm:rounded-3xl sm:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-5 py-4">
              <h2 className="text-lg font-bold text-[var(--cg-fg)]">
                {view ? panelTitle(view) : ""}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="tap-lift rounded-full bg-[var(--cg-secondary)] px-3 py-1.5 text-sm font-semibold"
              >
                Schließen
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {view === "menu" ? (
                <div className="grid gap-2">
                  <MenuRow
                    title="Kurzinformationen"
                    hint="Spielregeln und Ablauf — jederzeit nachlesen"
                    onClick={() => onOpen("briefing")}
                  />
                  <MenuRow
                    title="Steckt ihr fest?"
                    hint={playHelpMenuHint(mode)}
                    onClick={() => onOpen("help")}
                  />
                  <MenuRow
                    title="FAQ"
                    hint="Technik, Störungen und Tipps, wenn ihr nicht weiterkommt"
                    onClick={() => onOpen("faq")}
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
                    title="Team"
                    hint="Namen, Weiterspiel-Link, Leitung, Platz freigeben"
                    onClick={() => onOpen("team")}
                  />
                </div>
              ) : null}

              {view === "briefing" ? (
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

              {view === "help" ? (
                <div className="space-y-2">
                  <p className="mb-3 text-sm leading-relaxed text-[var(--cg-muted)]">
                    Sagt kurz, was hakt. Technische Störungen heilt das Spiel selbst; bei Rätsel
                    oder Verständnis gibt es Tipps, Freischalten und FAQ — ohne Support-Ticket.
                  </p>
                  {mode === "outdoor" ? (
                    <MenuRow
                      title="Standort / GPS"
                      hint="Wir stehen davor, oder das Gerät liefert keinen Ort"
                      onClick={() => onOpen("gps")}
                    />
                  ) : null}
                  {mode === "indoor" ? (
                    <MenuRow
                      title="Station / Code"
                      hint="Zettel nicht gefunden, oder der Code wird nicht angenommen"
                      onClick={() => onOpen("station")}
                    />
                  ) : null}
                  {mode === "online" ? (
                    <MenuRow
                      title="Geräte sehen nicht dasselbe"
                      hint="Seite neu laden, warten, Weiterspiel-Link"
                      onClick={() => onOpen("sync")}
                    />
                  ) : null}
                  <MenuRow
                    title="Wir kommen bei der Lösung nicht weiter"
                    hint="Tipp auf einer Kachel, oder unten Lösung anzeigen"
                    onClick={onClose}
                  />
                  <MenuRow
                    title="Verbindung oder anderes Gerät"
                    hint="Seite neu laden, Weiterspiel-Link, Leitung übergeben"
                    onClick={() => onOpen("team")}
                  />
                  <MenuRow
                    title="Wie funktioniert das Spiel?"
                    hint={playHowToPlayHint(mode)}
                    onClick={() => onOpen("faq")}
                  />
                </div>
              ) : null}

              {view === "gps" ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-[var(--cg-muted)]">
                    Was trifft zu? Technische GPS-Störungen heilt das Spiel mit, oder ihr schaltet
                    den Punkt frei.
                  </p>
                  <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
                    <p className="font-bold text-[var(--cg-fg)]">
                      Wir stehen direkt davor — GPS greift nicht
                    </p>
                    <p className="mt-1 text-sm text-[var(--cg-muted)]">
                      Radius-Heal läuft automatisch. Wenn ihr klar am Punkt seid, schaltet die
                      Team-Leitung frei.
                    </p>
                    {canUnlockGps && onForceUnlockGps ? (
                      <div className="mt-3">
                        <BigButton
                          disabled={busy}
                          onClick={() => {
                            onForceUnlockGps();
                            onClose();
                          }}
                        >
                          Aufgabe freischalten
                        </BigButton>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-[var(--cg-fg)]">
                        Alpha / GPS-Leiter tippt auf der Karte „Wir sind am Punkt“.
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
                    <p className="font-bold text-[var(--cg-fg)]">GPS funktioniert nicht richtig</p>
                    <p className="mt-1 text-sm text-[var(--cg-muted)]">{GPS_SETTINGS_TIP}</p>
                    {canUnlockGps && onForceUnlockGps ? (
                      <div className="mt-3">
                        <BigButton
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            onForceUnlockGps();
                            onClose();
                          }}
                        >
                          Trotzdem freischalten
                        </BigButton>
                      </div>
                    ) : null}
                  </div>
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    Zurück
                  </BigButton>
                </div>
              ) : null}

              {view === "station" ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-[var(--cg-muted)]">
                    {INDOOR_STATION_TIP}
                  </p>
                  <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
                    <p className="font-bold text-[var(--cg-fg)]">Wir finden den Zettel nicht</p>
                    <p className="mt-1 text-sm text-[var(--cg-muted)]">
                      Der Code hängt an der Station im Raum — nicht am Handy. Sucht Schilder,
                      Tische, Wände. Tippt danach die Station in der Liste an und gebt den Code
                      ein.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
                    <p className="font-bold text-[var(--cg-fg)]">Code wird nicht angenommen</p>
                    <p className="mt-1 text-sm text-[var(--cg-muted)]">
                      Genau den Code vom Zettel dieser Station. Groß- und Kleinschreibung ist egal,
                      Leerzeichen nicht nötig. Anderer Zettel = andere Station.
                    </p>
                  </div>
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    Zurück
                  </BigButton>
                </div>
              ) : null}

              {view === "sync" ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-[var(--cg-muted)]">
                    {ONLINE_SYNC_TIP}
                  </p>
                  <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
                    <p className="font-bold text-[var(--cg-fg)]">Nicht alle sehen dasselbe</p>
                    <p className="mt-1 text-sm text-[var(--cg-muted)]">
                      Kurz warten oder die Seite neu laden. Eine Antwort vom Team gilt für alle
                      Geräte.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
                    <p className="font-bold text-[var(--cg-fg)]">Jemand ist raus oder wechselt Gerät</p>
                    <p className="mt-1 text-sm text-[var(--cg-muted)]">
                      Weiterspiel-Link und Leitung liegen unter Team — ohne GPS, ohne neuen Code.
                    </p>
                    <div className="mt-3">
                      <BigButton variant="outline" onClick={() => onOpen("team")}>
                        Zum Team
                      </BigButton>
                    </div>
                  </div>
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    Zurück
                  </BigButton>
                </div>
              ) : null}

              {view === "faq" ? (
                <div className="space-y-4">
                  <p className="text-base leading-relaxed text-[var(--cg-muted)]">
                    Für dieses Spiel ist noch kein FAQ-Link hinterlegt. Bei Problemen nutzt den
                    Support-Chat oder meldet euch beim Spielleiter.
                  </p>
                  <BigButton variant="ghost" onClick={onClose}>
                    Zurück
                  </BigButton>
                </div>
              ) : null}

              {view === "support" ? (
                <CrispEmbed websiteId={crispWebsiteId} />
              ) : null}

              {view === "pause" ? (
                <div className="space-y-4">
                  <p className="text-base text-[var(--cg-muted)]">
                    Das Spiel ist pausiert. Der Countdown läuft lokal nicht weiter. Schließt die App
                    ruhig — danach hier weiterspielen.
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

              {view === "team" ? (
                <div className="space-y-4">
                  {nameRoster.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--cg-fg)]">
                        Namen im Team
                      </p>
                      <p className="text-xs text-[var(--cg-muted)]">
                        Exakte Schreibweise — bei Gerätewechsel tippt die Person ihren Namen
                        an oder nutzt den persönlichen Link.
                      </p>
                      <ul className="space-y-1.5">
                        {nameRoster.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between gap-2 rounded-xl bg-[var(--cg-secondary)] px-3 py-2.5"
                          >
                            <span className="min-w-0 truncate font-semibold text-[var(--cg-fg)]">
                              {m.name}
                              {"isMe" in m && m.isMe ? (
                                <span className="ml-1.5 text-xs font-medium text-[var(--cg-muted)]">
                                  du
                                </span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-xs text-[var(--cg-muted)]">
                              {m.roleLabel}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {inviteCode && joinCode && sessionId ? (
                    <PersonalResumeLinkCard
                      inviteCode={inviteCode}
                      joinCode={joinCode}
                      sessionId={sessionId}
                      compact
                    />
                  ) : null}

                  {isAlpha ? (
                    <>
                      <p className="text-sm text-[var(--cg-muted)]">
                        Du führst das Team. Gib die Leitung ab oder gib einen Platz frei, damit
                        jemand anderes (oder du auf einem neuen Gerät) weiterspielen kann.
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
                              className="flex flex-col gap-2 rounded-2xl bg-[var(--cg-secondary)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-[var(--cg-fg)]">
                                  {m.name}
                                </span>
                                <span className="text-xs text-[var(--cg-muted)]">{m.roleLabel}</span>
                              </span>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={busy || !onTransferAlpha}
                                  onClick={() => onTransferAlpha?.(m.id)}
                                  className="tap-lift rounded-full bg-[var(--cg-primary)] px-3 py-1.5 text-xs font-bold text-[var(--cg-primary-fg)] disabled:opacity-40"
                                >
                                  {transferPending ? "Übertrage…" : "Leitung geben"}
                                </button>
                                {onReleasePlayerSeat ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onReleasePlayerSeat(m.id)}
                                    className="tap-lift rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-40"
                                  >
                                    Platz freigeben
                                  </button>
                                ) : null}
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--cg-muted)]">
                      Die Team-Leitung aktiviert die Aufgaben. Wenn du das Gerät wechselst oder
                      den Platz für jemand anderen freigibst, nutze die Aktionen unten.
                    </p>
                  )}
                  {onReclaimSession ? (
                    <BigButton variant="outline" onClick={onReclaimSession}>
                      Meine Sitzung zurückholen
                    </BigButton>
                  ) : null}
                  {onReleaseMySeat ? (
                    <BigButton
                      variant="ghost"
                      disabled={busy}
                      onClick={onReleaseMySeat}
                    >
                      {releasePending ? "Einen Moment…" : "Meinen Platz freigeben"}
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
      ) : null}
    </>
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
      return "Kurzinformationen";
    case "help":
      return "Steckt ihr fest?";
    case "gps":
      return "Standort / GPS";
    case "station":
      return "Station / Code";
    case "sync":
      return "Geräte";
    case "faq":
      return "FAQ";
    case "support":
      return "Support";
    case "pause":
      return "Pause";
    case "team":
      return "Team";
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
        Support-Chat ist noch nicht konfiguriert.
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
    <div className="fixed inset-x-0 top-0 z-[2000] bg-[var(--cg-primary)] px-4 py-3 text-center text-[var(--cg-primary-fg)] shadow-[var(--cg-shadow-lift)]">
      <p className="text-sm font-bold">Spiel pausiert</p>
      <button type="button" onClick={onResume} className="mt-1 text-xs font-semibold underline">
        Tippen zum Weiterspielen
      </button>
    </div>
  );
}
