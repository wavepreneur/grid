"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  Lightbulb,
  MapPin,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
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

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    function inSheetScroll(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest("[data-sheet-scroll]"));
    }
    function blockBackgroundScroll(event: Event) {
      if (!inSheetScroll(event.target)) event.preventDefault();
    }

    window.addEventListener("wheel", blockBackgroundScroll, { passive: false });
    window.addEventListener("touchmove", blockBackgroundScroll, { passive: false });
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
      window.removeEventListener("wheel", blockBackgroundScroll);
      window.removeEventListener("touchmove", blockBackgroundScroll);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <PlayDocSheet
        open={showBriefingDoc}
        title="Spielregeln"
        url={briefingIframeUrl}
        emptyHint="Für dieses Spiel sind noch keine Spielregeln hinterlegt."
        onClose={onClose}
      />
      <PlayDocSheet
        open={showFaqDoc}
        title="Häufige Fragen"
        url={faqIframeUrl}
        emptyHint="Für dieses Spiel ist noch kein FAQ-Link hinterlegt."
        onClose={onClose}
      />

      {!showBriefingDoc && !showFaqDoc ? (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center overscroll-none bg-[var(--cg-ink)]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden overscroll-none rounded-t-3xl bg-[var(--cg-card)] pb-[env(safe-area-inset-bottom)] shadow-[var(--cg-shadow-lift)] sm:rounded-3xl sm:pb-0"
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

            <div
              data-sheet-scroll
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
            >
              {view === "menu" ? (
                <div className="grid gap-2">
                  <MenuRow
                    icon={<BookOpen className="h-5 w-5" />}
                    title="Spielregeln"
                    hint="Ablauf nachlesen"
                    onClick={() => onOpen("briefing")}
                  />
                  <MenuRow
                    icon={<CircleHelp className="h-5 w-5" />}
                    title="Steckt ihr fest?"
                    hint={playHelpMenuHint(mode)}
                    onClick={() => onOpen("help")}
                  />
                  <MenuRow
                    icon={<MessagesSquare className="h-5 w-5" />}
                    title="Häufige Fragen"
                    hint="Technik und Tipps"
                    onClick={() => onOpen("faq")}
                  />
                  <MenuRow
                    icon={<MessageCircle className="h-5 w-5" />}
                    title="Support-Chat"
                    hint="Mit dem Team sprechen"
                    onClick={() => onOpen("support")}
                  />
                  <MenuRow
                    icon={paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    title={paused ? "Weiterspielen" : "Pause"}
                    hint={paused ? "Countdown läuft wieder" : "Zeit anhalten"}
                    onClick={() => {
                      onTogglePause();
                      if (!paused) onOpen("pause");
                      else onClose();
                    }}
                  />
                  <MenuRow
                    icon={<Users className="h-5 w-5" />}
                    title="Team"
                    hint="Namen, Code, Leitung"
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
                  <p className="mb-3 text-sm font-medium text-[var(--cg-fg)]">
                    Tippe, was gerade nicht klappt.
                  </p>
                  {mode === "outdoor" ? (
                    <MenuRow
                      icon={<MapPin className="h-5 w-5" />}
                      title="Wir stehen am Punkt"
                      hint="GPS öffnet die Aufgabe nicht"
                      onClick={() => onOpen("gps")}
                    />
                  ) : null}
                  {mode === "indoor" ? (
                    <MenuRow
                      icon={<MapPin className="h-5 w-5" />}
                      title="Station oder Code"
                      hint="Zettel fehlt, oder der Code geht nicht"
                      onClick={() => onOpen("station")}
                    />
                  ) : null}
                  {mode === "online" ? (
                    <MenuRow
                      icon={<Smartphone className="h-5 w-5" />}
                      title="Nicht alle sehen dasselbe"
                      hint="Seite neu laden oder Team-Code holen"
                      onClick={() => onOpen("sync")}
                    />
                  ) : null}
                  <MenuRow
                    icon={<Lightbulb className="h-5 w-5" />}
                    title="Das Rätsel hängt"
                    hint="Zurück zur Aufgabe — Tipp oder Lösung holen"
                    onClick={onClose}
                  />
                  <MenuRow
                    icon={<Smartphone className="h-5 w-5" />}
                    title="Anderes Handy"
                    hint="Team-Code holen und Namen tippen"
                    onClick={() => onOpen("team")}
                  />
                  <MenuRow
                    icon={<CircleHelp className="h-5 w-5" />}
                    title="So geht das Spiel"
                    hint={playHowToPlayHint(mode)}
                    onClick={() => onOpen("faq")}
                  />
                </div>
              ) : null}

              {view === "gps" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--cg-fg)]">
                    Was soll jetzt passieren?
                  </p>
                  <HelpCard
                    icon={<MapPin className="h-5 w-5" />}
                    title="Wir stehen am Punkt"
                    hint="Die Aufgabe soll jetzt starten."
                  >
                    {canUnlockGps && onForceUnlockGps ? (
                      <BigButton
                        disabled={busy}
                        onClick={() => {
                          onForceUnlockGps();
                          onClose();
                        }}
                      >
                        Aufgabe jetzt öffnen
                      </BigButton>
                    ) : (
                      <p className="text-sm font-semibold leading-snug text-[var(--cg-fg)]">
                        Die Team-Leitung tippt auf der Karte „Wir sind am Punkt“.
                      </p>
                    )}
                  </HelpCard>
                  <HelpCard
                    icon={<Settings className="h-5 w-5" />}
                    title="Standort am Handy prüfen"
                    hint={GPS_SETTINGS_TIP}
                  >
                    {canUnlockGps && onForceUnlockGps ? (
                      <BigButton
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          onForceUnlockGps();
                          onClose();
                        }}
                      >
                        Trotzdem öffnen
                      </BigButton>
                    ) : null}
                  </HelpCard>
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    Zurück
                  </BigButton>
                </div>
              ) : null}

              {view === "station" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--cg-fg)]">{INDOOR_STATION_TIP}</p>
                  <HelpCard
                    icon={<MapPin className="h-5 w-5" />}
                    title="Wir finden den Zettel nicht"
                    hint="Der Code hängt im Raum — Schilder, Tische, Wände. Danach Station antippen und Code eingeben."
                  />
                  <HelpCard
                    icon={<CircleHelp className="h-5 w-5" />}
                    title="Code wird nicht angenommen"
                    hint="Genau den Code von diesem Zettel. Groß/klein ist egal. Anderer Zettel = andere Station."
                  />
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    Zurück
                  </BigButton>
                </div>
              ) : null}

              {view === "sync" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--cg-fg)]">{ONLINE_SYNC_TIP}</p>
                  <HelpCard
                    icon={<Smartphone className="h-5 w-5" />}
                    title="Nicht alle sehen dasselbe"
                    hint="Kurz warten oder die Seite neu laden. Eine Antwort gilt für alle."
                  />
                  <HelpCard
                    icon={<Users className="h-5 w-5" />}
                    title="Jemand ist raus oder wechselt Handy"
                    hint="Team-Code holen und denselben Namen tippen."
                  >
                    <BigButton variant="outline" onClick={() => onOpen("team")}>
                      Team-Code holen
                    </BigButton>
                  </HelpCard>
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
                <div className="space-y-5">
                  {nameRoster.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-[var(--cg-fg)]">Wer spielt</p>
                      <p className="text-sm text-[var(--cg-muted)]">
                        Neues Handy? Denselben Namen tippen.
                      </p>
                      <ul className="space-y-1.5">
                        {nameRoster.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center gap-3 rounded-2xl bg-[var(--cg-secondary)] px-3 py-2.5"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-card)] text-sm font-bold text-[var(--cg-fg)]">
                              {m.name.trim().slice(0, 1).toUpperCase() || "?"}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-semibold text-[var(--cg-fg)]">
                              {m.name}
                              {"isMe" in m && m.isMe ? (
                                <span className="ml-1.5 text-xs font-medium text-[var(--cg-muted)]">
                                  du
                                </span>
                              ) : null}
                            </span>
                            <span className="shrink-0 rounded-full bg-[var(--cg-card)] px-2 py-1 text-[11px] font-semibold text-[var(--cg-muted)]">
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
                    teammates.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-[var(--cg-fg)]">Leitung abgeben</p>
                        <p className="text-sm text-[var(--cg-muted)]">
                          Du führst das Team. Tippe, wer als Nächstes führen soll.
                        </p>
                        <ul className="space-y-2">
                          {teammates.map((m) => (
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
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--cg-muted)]">
                        Du spielst allein — die Leitung bleibt bei dir.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-[var(--cg-muted)]">
                      Die Team-Leitung startet die Aufgaben.
                    </p>
                  )}
                  {onReclaimSession ? (
                    <button
                      type="button"
                      onClick={onReclaimSession}
                      className="tap-lift flex w-full items-center gap-3 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-secondary)] text-[var(--cg-fg)]">
                        <RotateCcw className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-[var(--cg-fg)]">
                          Sitzung zurückholen
                        </span>
                        <span className="mt-0.5 block text-sm text-[var(--cg-muted)]">
                          Wenn du rausgeflogen bist
                        </span>
                      </span>
                    </button>
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
      className="tap-lift flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--cg-primary)] text-[var(--cg-primary-fg)] shadow-[var(--cg-shadow-lift)] ring-2 ring-[var(--cg-bg)]"
    >
      <MoreHorizontal className="h-6 w-6" strokeWidth={2.75} />
    </button>
  );
}

function MenuRow({
  title,
  hint,
  icon,
  onClick,
}: {
  title: string;
  hint: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-lift flex w-full items-center gap-3 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-3 py-3.5 text-left sm:px-4"
    >
      {icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-secondary)] text-[var(--cg-fg)]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-[var(--cg-fg)]">{title}</span>
        <span className="mt-0.5 block text-sm text-[var(--cg-muted)]">{hint}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--cg-muted)]" />
    </button>
  );
}

function HelpCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-secondary)] text-[var(--cg-fg)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[var(--cg-fg)]">{title}</p>
          <p className="mt-0.5 text-sm leading-snug text-[var(--cg-muted)]">{hint}</p>
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function panelTitle(panel: Exclude<PlayMorePanel, null>): string {
  switch (panel) {
    case "menu":
      return "Spiel-Menü";
    case "briefing":
      return "Spielregeln";
    case "help":
      return "Steckt ihr fest?";
    case "gps":
      return "Standort / GPS";
    case "station":
      return "Station / Code";
    case "sync":
      return "Geräte";
    case "faq":
      return "Häufige Fragen";
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
