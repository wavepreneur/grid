"use client";

import type { ReactNode } from "react";
import {
  BookOpen,
  CircleHelp,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Pause,
  Users,
  Wallet,
} from "lucide-react";
import { BigButton } from "@/components/game/city/ui";
import type { ContentMode } from "@/lib/cms/layer-model";
import { playHelpMenuHint } from "@/lib/grid/play-help";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  mode?: ContentMode;
  language?: string | null;
  onDismiss: () => void;
};

/**
 * First-start pointer at the ⋯ menu. Local only — no new play write path.
 */
export function PlayMenuTour({ mode = "outdoor", language, onDismiss }: Props) {
  const t = playUi(language);
  const items: Array<{ icon: ReactNode; title: string; hint: string; accent?: boolean }> = [
    { icon: <Wallet className="h-5 w-5" />, title: t.wallet, hint: t.walletHint.empty, accent: true },
    { icon: <BookOpen className="h-5 w-5" />, title: t.lobby.rules, hint: t.menu.rulesHint },
    ...(mode === "outdoor"
      ? [{ icon: <MapPin className="h-5 w-5" />, title: t.menu.gpsTitle, hint: t.gpsHelp.menuHint }]
      : []),
    { icon: <CircleHelp className="h-5 w-5" />, title: t.menu.stuck, hint: playHelpMenuHint(mode, language) },
    { icon: <MessagesSquare className="h-5 w-5" />, title: t.faq, hint: t.menu.faqHint },
    { icon: <MessageCircle className="h-5 w-5" />, title: t.menu.supportTitle, hint: t.menu.supportHint },
    { icon: <Pause className="h-5 w-5" />, title: t.pause, hint: t.menu.pauseHint },
    { icon: <Users className="h-5 w-5" />, title: t.team, hint: t.menu.teamHint },
  ];

  return (
    <div className="fixed inset-0 z-[1800] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[var(--cg-ink)]/65 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-menu-tour-title"
        className="cg-animate-rise-in relative z-10 flex max-h-[min(78vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[var(--cg-card)] pb-[env(safe-area-inset-bottom)] shadow-[var(--cg-shadow-lift)] sm:rounded-3xl sm:pb-0"
      >
        <div className="flex justify-end px-5 pt-3">
          <span className="rounded-full bg-[var(--cg-primary)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--cg-primary-fg)]">
            {t.menuTour.pointer} ↗
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
          <h2
            id="play-menu-tour-title"
            className="m-0 text-xl font-extrabold leading-tight text-[var(--cg-fg)]"
          >
            {t.menuTour.title}
          </h2>
          <p className="mt-2 text-sm leading-snug text-[var(--cg-muted)]">{t.menuTour.body}</p>
          <ul className="mt-4 grid gap-1.5">
            {items.map((item) => (
              <li
                key={item.title}
                className={
                  item.accent
                    ? "flex items-center gap-3 rounded-2xl bg-[var(--cg-accent)] px-3 py-2.5 text-[var(--cg-accent-fg)]"
                    : "flex items-center gap-3 rounded-2xl bg-[var(--cg-secondary)] px-3 py-2.5"
                }
              >
                <span
                  className={
                    item.accent
                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-accent-fg)]/15"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-card)] text-[var(--cg-fg)]"
                  }
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-extrabold ${item.accent ? "" : "text-[var(--cg-fg)]"}`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-xs ${item.accent ? "opacity-80" : "text-[var(--cg-muted)]"}`}
                  >
                    {item.hint}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 px-5 pb-5 pt-3">
          <BigButton onClick={onDismiss}>{t.menuTour.start}</BigButton>
        </div>
      </div>
    </div>
  );
}
