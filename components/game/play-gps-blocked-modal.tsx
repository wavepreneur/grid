"use client";

import { MapPin, RefreshCw, Settings, Users } from "lucide-react";
import { LobbyPrimaryButton } from "@/components/lobby/lobby-identity";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  open: boolean;
  language?: string | null;
  canGiveLead: boolean;
  onRetry: () => void;
  onReload: () => void;
  onGiveLead?: () => void;
};

function settingsFlavor(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function PlayGpsBlockedModal({
  open,
  language,
  canGiveLead,
  onRetry,
  onReload,
  onGiveLead,
}: Props) {
  const t = playUi(language).gpsLead;
  if (!open) return null;

  const flavor = settingsFlavor();
  const steps =
    flavor === "ios" ? t.stepsIos : flavor === "android" ? t.stepsAndroid : t.stepsDesktop;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gps-blocked-title"
        className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <MapPin size={28} strokeWidth={2.4} />
        </div>
        <h2
          id="gps-blocked-title"
          className="text-center text-xl font-extrabold text-slate-900"
        >
          {t.title}
        </h2>
        <p className="mt-3 text-center text-base leading-relaxed text-slate-600">{t.body}</p>
        <p className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-center text-sm leading-relaxed text-teal-900">
          {steps}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <LobbyPrimaryButton type="button" onClick={onRetry}>
            {t.settings}
            <Settings size={18} strokeWidth={2.6} />
          </LobbyPrimaryButton>
          <button
            type="button"
            onClick={onReload}
            className="tap-lift inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-extrabold text-slate-800 shadow-sm"
          >
            <RefreshCw size={18} strokeWidth={2.4} />
            {t.reload}
          </button>
          {canGiveLead && onGiveLead ? (
            <button
              type="button"
              onClick={onGiveLead}
              className="tap-lift inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-teal-800"
            >
              <Users size={18} strokeWidth={2.4} />
              {t.giveLead}
            </button>
          ) : (
            <p className="pt-1 text-center text-xs font-medium text-slate-400">{t.soloHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
