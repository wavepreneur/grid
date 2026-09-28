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
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { BigButton } from "@/components/game/city/ui";
import { PlayDocSheet } from "@/components/game/play-doc-sheet";
import { TeamWalletList } from "@/components/game/team-wallet";
import { walletMenuHint, type WalletNote } from "@/lib/grid/wallet";
import { PersonalResumeLinkCard } from "@/components/player/personal-resume-link-card";
import type { ContentMode } from "@/lib/cms/layer-model";
import {
  playHelpMenuHint,
  playHowToPlayHint,
  playRulesSteps,
} from "@/lib/grid/play-help";
import { playUi } from "@/lib/grid/play-ui";
import { PlayGpsHelp } from "@/components/game/play-gps-help";

export type PlayMorePanel =
  | "menu"
  | "wallet"
  | "briefing"
  | "faq"
  | "help"
  | "gps"
  | "station"
  | "sync"
  | "reload"
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
  walletNotes?: WalletNote[];
  walletScore?: number;
  onPurchaseWallet?: (level: number) => void;
  walletPurchasePending?: boolean;
  language?: string | null;
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
  walletNotes = [],
  walletScore = 0,
  onPurchaseWallet,
  walletPurchasePending = false,
  language,
}: Props) {
  const t = playUi(language);
  const view: PlayMorePanel =
    open === "gps" && mode === "indoor"
      ? "station"
      : open === "gps" && mode === "online"
        ? "sync"
        : open;
  const [briefingDocOpen, setBriefingDocOpen] = useState(false);
  const showBriefingDoc = briefingDocOpen && Boolean(briefingIframeUrl?.trim());
  const showFaqDoc = view === "faq" && Boolean(faqIframeUrl?.trim());
  const busy = Boolean(transferPending || releasePending);
  const nameRoster = roster.length > 0 ? roster : teammates;

  useEffect(() => {
    if (view !== "briefing") setBriefingDocOpen(false);
  }, [view]);

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
      html.style.overflow = prevHtmlOverflow || "";
      body.style.overflow = prevBodyOverflow || "";
      html.style.overscrollBehavior = prevHtmlOverscroll || "";
      body.style.overscrollBehavior = prevBodyOverscroll || "";
      window.removeEventListener("wheel", blockBackgroundScroll);
      window.removeEventListener("touchmove", blockBackgroundScroll);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <PlayDocSheet
        open={showBriefingDoc}
        title={t.lobby.rules}
        url={briefingIframeUrl}
        emptyHint={t.intro.rulesEmpty}
        language={language}
        onClose={() => setBriefingDocOpen(false)}
      />
      <PlayDocSheet
        open={showFaqDoc}
        title={t.faq}
        url={faqIframeUrl}
        emptyHint={t.menu.faqEmpty}
        language={language}
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
            translate="no"
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden overscroll-none rounded-t-3xl bg-[var(--cg-card)] pb-[env(safe-area-inset-bottom)] shadow-[var(--cg-shadow-lift)] sm:rounded-3xl sm:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--cg-border)] px-5">
              <h2 className="m-0 text-lg font-bold leading-none text-[var(--cg-fg)]">
                {view ? panelTitle(view, t) : ""}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="tap-lift inline-flex h-9 items-center rounded-full bg-[var(--cg-secondary)] px-3 text-sm font-semibold leading-none"
              >
                {t.close}
              </button>
            </div>

            <div
              data-sheet-scroll
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
            >
              {view === "menu" ? (
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen("wallet")}
                    className="tap-lift flex w-full items-center gap-3 rounded-2xl bg-[var(--cg-accent)] px-3 py-4 text-left text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)] sm:px-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-accent-fg)]/15">
                      <Wallet className="h-6 w-6" strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold">{t.wallet}</span>
                      <span className="mt-0.5 block text-sm opacity-80">
                        {walletMenuHint(walletNotes, language)}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
                  </button>
                  <MenuRow
                    icon={<BookOpen className="h-5 w-5" />}
                    title={t.lobby.rules}
                    hint={t.menu.rulesHint}
                    onClick={() => onOpen("briefing")}
                  />
                  {mode === "outdoor" ? (
                    <MenuRow
                      icon={<MapPin className="h-5 w-5" />}
                      title={t.menu.gpsTitle}
                      hint={t.gpsHelp.menuHint}
                      onClick={() => onOpen("gps")}
                    />
                  ) : null}
                  <MenuRow
                    icon={<CircleHelp className="h-5 w-5" />}
                    title={t.menu.stuck}
                    hint={playHelpMenuHint(mode, language)}
                    onClick={() => onOpen("help")}
                  />
                  <MenuRow
                    icon={<MessagesSquare className="h-5 w-5" />}
                    title={t.faq}
                    hint={t.menu.faqHint}
                    onClick={() => onOpen("faq")}
                  />
                  <MenuRow
                    icon={<MessageCircle className="h-5 w-5" />}
                    title={t.menu.supportTitle}
                    hint={t.menu.supportHint}
                    onClick={() => onOpen("support")}
                  />
                  <MenuRow
                    icon={paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    title={paused ? t.menu.resume : t.pause}
                    hint={paused ? t.menu.resumeHint : t.menu.pauseHint}
                    onClick={() => {
                      onTogglePause();
                      if (!paused) onOpen("pause");
                      else onClose();
                    }}
                  />
                  <MenuRow
                    icon={<Users className="h-5 w-5" />}
                    title={t.team}
                    hint={t.menu.teamHint}
                    onClick={() => onOpen("team")}
                  />
                </div>
              ) : null}

              {view === "wallet" ? (
                <div className="space-y-4">
                  <TeamWalletList
                    notes={walletNotes}
                    score={walletScore}
                    onPurchase={onPurchaseWallet}
                    purchasePending={walletPurchasePending}
                    language={language}
                  />
                  <BigButton variant="ghost" onClick={() => onOpen("menu")}>
                    {t.back}
                  </BigButton>
                </div>
              ) : null}

              {view === "briefing" ? (
                <div className="space-y-5">
                  {briefingText?.trim() ? (
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-[var(--cg-muted)]">
                      {briefingText.trim()}
                    </p>
                  ) : null}
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--cg-fg)]">
                      {t.menu.howItWorks}
                    </h3>
                    <ol className="mt-3 space-y-3">
                      {playRulesSteps(mode ?? "outdoor", language).map((step, index) => (
                        <li key={step.title} className="flex gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--cg-secondary)] text-sm font-bold text-[var(--cg-fg)]">
                            {index + 1}
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className="font-bold text-[var(--cg-fg)]">{step.title}</p>
                            <p className="mt-0.5 text-sm leading-snug text-[var(--cg-muted)]">
                              {step.body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  {briefingIframeUrl?.trim() ? (
                    <BigButton variant="outline" onClick={() => setBriefingDocOpen(true)}>
                      {t.menu.openFullRules}
                    </BigButton>
                  ) : null}
                  <BigButton variant="ghost" onClick={onClose}>
                    {t.menu.understood}
                  </BigButton>
                </div>
              ) : null}

              {view === "help" ? (
                <div className="space-y-2">
                  <p className="mb-3 text-sm font-medium text-[var(--cg-fg)]">
                    {t.menu.helpPrompt}
                  </p>
                  {mode === "outdoor" ? (
                    <MenuRow
                      icon={<MapPin className="h-5 w-5" />}
                      title={t.menu.atPoint}
                      hint={t.menu.atPointHint}
                      onClick={() => onOpen("gps")}
                    />
                  ) : null}
                  {mode === "indoor" ? (
                    <MenuRow
                      icon={<MapPin className="h-5 w-5" />}
                      title={t.menu.stationCode}
                      hint={t.menu.stationCodeHint}
                      onClick={() => onOpen("station")}
                    />
                  ) : null}
                  {mode === "online" ? (
                    <MenuRow
                      icon={<Smartphone className="h-5 w-5" />}
                      title={t.menu.notInSync}
                      hint={t.menu.notInSyncHint}
                      onClick={() => onOpen("sync")}
                    />
                  ) : null}
                  <MenuRow
                    icon={<Lightbulb className="h-5 w-5" />}
                    title={t.menu.puzzleStuck}
                    hint={t.menu.puzzleStuckHint}
                    onClick={onClose}
                  />
                  <MenuRow
                    icon={<RotateCcw className="h-5 w-5" />}
                    title={t.menu.screenFrozen}
                    hint={t.menu.screenFrozenHint}
                    onClick={() => onOpen("reload")}
                  />
                  <MenuRow
                    icon={<Smartphone className="h-5 w-5" />}
                    title={t.menu.otherPhone}
                    hint={t.menu.otherPhoneHint}
                    onClick={() => onOpen("team")}
                  />
                  <MenuRow
                    icon={<CircleHelp className="h-5 w-5" />}
                    title={t.menu.howToPlay}
                    hint={playHowToPlayHint(mode, language)}
                    onClick={() => onOpen("faq")}
                  />
                </div>
              ) : null}

              {view === "gps" ? (
                <PlayGpsHelp
                  language={language}
                  canUnlockGps={canUnlockGps}
                  isAlpha={isAlpha}
                  canGiveLead={isAlpha && teammates.length > 0}
                  busy={busy}
                  onForceUnlock={
                    canUnlockGps && onForceUnlockGps
                      ? () => {
                          onForceUnlockGps();
                          onClose();
                        }
                      : undefined
                  }
                  onGiveLead={
                    isAlpha && teammates.length > 0 ? () => onOpen("team") : undefined
                  }
                  onBack={() => onOpen("menu")}
                />
              ) : null}

              {view === "station" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--cg-fg)]">{t.menu.indoorTip}</p>
                  <HelpCard
                    icon={<MapPin className="h-5 w-5" />}
                    title={t.menu.noNote}
                    hint={t.menu.noNoteHint}
                  />
                  <HelpCard
                    icon={<CircleHelp className="h-5 w-5" />}
                    title={t.menu.codeRejected}
                    hint={t.menu.codeRejectedHint}
                  />
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    {t.back}
                  </BigButton>
                </div>
              ) : null}

              {view === "sync" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--cg-fg)]">{t.menu.onlineTip}</p>
                  <HelpCard
                    icon={<Smartphone className="h-5 w-5" />}
                    title={t.menu.notInSync}
                    hint={t.menu.someoneLeftHint}
                  />
                  <HelpCard
                    icon={<Users className="h-5 w-5" />}
                    title={t.menu.someoneLeft}
                    hint={t.menu.someoneLeftHint}
                  >
                    <BigButton variant="outline" onClick={() => onOpen("team")}>
                      {t.menu.getTeamCode}
                    </BigButton>
                  </HelpCard>
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    {t.back}
                  </BigButton>
                </div>
              ) : null}

              {view === "reload" ? (
                <div className="space-y-4">
                  <p className="text-base leading-relaxed text-[var(--cg-fg)]">{t.menu.reloadTip}</p>
                  <p className="text-sm text-[var(--cg-muted)]">
                    {t.menu.reloadReassure}
                  </p>
                  <BigButton
                    icon={<RotateCcw className="h-5 w-5" />}
                    onClick={() => window.location.reload()}
                  >
                    {t.menu.reloadPage}
                  </BigButton>
                  <BigButton variant="ghost" onClick={() => onOpen("help")}>
                    {t.back}
                  </BigButton>
                </div>
              ) : null}

              {view === "faq" ? (
                <div className="space-y-4">
                  <p className="text-base leading-relaxed text-[var(--cg-muted)]">
                    {t.menu.faqEmpty}
                  </p>
                  <BigButton variant="ghost" onClick={onClose}>
                    {t.back}
                  </BigButton>
                </div>
              ) : null}

              {view === "support" ? (
                <CrispEmbed websiteId={crispWebsiteId} language={language} />
              ) : null}

              {view === "pause" ? (
                <div className="space-y-4">
                  <p className="text-base text-[var(--cg-muted)]">
                    {t.menu.pauseBody}
                  </p>
                  <BigButton
                    onClick={() => {
                      onTogglePause();
                      onClose();
                    }}
                  >
                    {t.menu.resume}
                  </BigButton>
                </div>
              ) : null}

              {view === "team" ? (
                <div className="space-y-5">
                  {nameRoster.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-[var(--cg-fg)]">{t.menu.whoPlays}</p>
                      <p className="text-sm text-[var(--cg-muted)]">
                        {t.menu.sameName}
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
                                  {t.you}
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
                      language={language}
                    />
                  ) : null}

                  {isAlpha ? (
                    teammates.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-[var(--cg-fg)]">{t.menu.giveLeadTitle}</p>
                        <p className="text-sm text-[var(--cg-muted)]">
                          {t.menu.giveLeadHint}
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
                                  {transferPending ? t.menu.transferring : t.lobby.giveLead}
                                </button>
                                {onReleasePlayerSeat ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onReleasePlayerSeat(m.id)}
                                    className="tap-lift rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-40"
                                  >
                                    {t.lobby.releaseSeat}
                                  </button>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--cg-muted)]">
                        {t.menu.playingAlone}
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-[var(--cg-muted)]">
                      {t.menu.leadStarts}
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
                          {t.menu.reclaimTitle}
                        </span>
                        <span className="mt-0.5 block text-sm text-[var(--cg-muted)]">
                          {t.menu.reclaimHint}
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
                      {releasePending ? t.menu.waitMoment : t.menu.releaseMine}
                    </BigButton>
                  ) : null}
                  <BigButton variant="ghost" onClick={onClose}>
                    {t.back}
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

export function PlayMoreTrigger({
  onClick,
  language,
}: {
  onClick: () => void;
  language?: string | null;
}) {
  return (
    <button
      type="button"
      aria-label={playUi(language).menu.moreAria}
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

function panelTitle(
  panel: Exclude<PlayMorePanel, null>,
  t: ReturnType<typeof playUi>,
): string {
  switch (panel) {
    case "menu":
      return t.menu.title;
    case "wallet":
      return t.wallet;
    case "briefing":
      return t.lobby.rules;
    case "help":
      return t.menu.stuck;
    case "gps":
      return t.menu.gpsTitle;
    case "station":
      return t.menu.stationTitle;
    case "sync":
      return t.menu.devicesTitle;
    case "reload":
      return t.menu.reloadTitle;
    case "faq":
      return t.faq;
    case "support":
      return t.support;
    case "pause":
      return t.pause;
    case "team":
      return t.team;
  }
}

function CrispEmbed({
  websiteId,
  language,
}: {
  websiteId?: string | null;
  language?: string | null;
}) {
  const [ready, setReady] = useState(false);
  const t = playUi(language);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!websiteId) {
    return (
      <p className="text-sm text-[var(--cg-muted)]">
        {t.menu.supportEmpty}
      </p>
    );
  }

  if (!ready) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)]">
      <iframe
        title={t.menu.supportTitle}
        src={`https://go.crisp.chat/chat/embed/?website_id=${encodeURIComponent(websiteId)}`}
        className="h-[min(60vh,520px)] w-full border-0"
        allow="microphone; camera"
      />
    </div>
  );
}

export function PauseBanner({
  onResume,
  language,
}: {
  onResume: () => void;
  language?: string | null;
}): ReactNode {
  const t = playUi(language);
  return (
    <div className="fixed inset-x-0 top-0 z-[2000] bg-[var(--cg-primary)] px-4 py-3 text-center text-[var(--cg-primary-fg)] shadow-[var(--cg-shadow-lift)]">
      <p className="text-sm font-bold">{t.menu.pausedBanner}</p>
      <button type="button" onClick={onResume} className="mt-1 text-xs font-semibold underline">
        {t.menu.tapToResume}
      </button>
    </div>
  );
}
