"use client";

import { MapPin, RefreshCw, Smartphone, Users } from "lucide-react";
import { BigButton } from "@/components/game/city/ui";
import { playUi } from "@/lib/grid/play-ui";
import { useGeoAccess } from "@/lib/hooks/use-geo-access";

function settingsFlavor(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

type Props = {
  language?: string | null;
  canUnlockGps: boolean;
  isAlpha: boolean;
  canGiveLead: boolean;
  busy?: boolean;
  onForceUnlock?: () => void;
  onGiveLead?: () => void;
  onBack: () => void;
};

export function PlayGpsHelp({
  language,
  canUnlockGps,
  isAlpha,
  canGiveLead,
  busy = false,
  onForceUnlock,
  onGiveLead,
  onBack,
}: Props) {
  const copy = playUi(language);
  const t = copy.gpsHelp;
  const flavor = settingsFlavor();
  const geo = useGeoAccess(true);

  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed text-[var(--cg-muted)]">{t.intro}</p>

      <div className="rounded-2xl border border-[var(--cg-primary)]/25 bg-[var(--cg-primary)]/10 px-4 py-3.5">
        <p className="text-sm font-extrabold text-[var(--cg-fg)]">{t.noDialogTitle}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--cg-fg)]/80">{t.noDialogBody}</p>
      </div>

      <OsSteps
        title={t.iosTitle}
        steps={t.iosSteps}
        active={flavor === "ios"}
      />
      <OsSteps
        title={t.androidTitle}
        steps={t.androidSteps}
        active={flavor === "android"}
      />
      {flavor === "desktop" ? (
        <OsSteps title={t.desktopTitle} steps={t.desktopSteps} active />
      ) : null}

      <div className="space-y-2 pt-1">
        <BigButton
          variant="outline"
          icon={<MapPin className="h-5 w-5" />}
          onClick={geo.retry}
        >
          {copy.hub.gpsBroken}
        </BigButton>
        <p className="px-1 text-center text-xs leading-snug text-[var(--cg-muted)]">
          {t.tryAgainHint}
        </p>
        <BigButton
          variant="ghost"
          icon={<RefreshCw className="h-5 w-5" />}
          onClick={() => window.location.reload()}
        >
          {copy.gpsLead.reload}
        </BigButton>
        {canGiveLead && onGiveLead ? (
          <div className="space-y-1.5">
            <BigButton
              variant="ghost"
              icon={<Users className="h-5 w-5" />}
              onClick={onGiveLead}
            >
              {copy.gpsLead.giveLead}
            </BigButton>
            <p className="px-1 text-center text-xs leading-snug text-[var(--cg-muted)]">
              {t.giveLeadHint}
            </p>
          </div>
        ) : isAlpha ? (
          <p className="px-1 text-center text-xs leading-snug text-[var(--cg-muted)]">
            {copy.gpsLead.soloHint}
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--cg-border)] pt-4">
        <p className="text-sm font-extrabold text-[var(--cg-fg)]">{t.lastResortTitle}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--cg-muted)]">{t.lastResortBody}</p>
        {canUnlockGps && onForceUnlock ? (
          <button
            type="button"
            disabled={busy}
            onClick={onForceUnlock}
            className="tap-lift mt-3 block w-full py-1.5 text-center text-sm font-medium text-[var(--cg-muted)] underline decoration-[var(--cg-border)] underline-offset-4 disabled:opacity-40"
          >
            {copy.hub.gpsSkip}
          </button>
        ) : (
          <p className="mt-3 text-center text-xs leading-snug text-[var(--cg-muted)]">
            {copy.hub.gpsSkipLead}
          </p>
        )}
      </div>

      <BigButton variant="ghost" onClick={onBack}>
        {copy.back}
      </BigButton>
    </div>
  );
}

function OsSteps({
  title,
  steps,
  active,
}: {
  title: string;
  steps: string[];
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        active
          ? "border-[var(--cg-primary)]/45 bg-[var(--cg-card)] shadow-[var(--cg-shadow-lift)]"
          : "border-[var(--cg-border)] bg-[var(--cg-bg)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            active
              ? "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)]"
              : "bg-[var(--cg-secondary)] text-[var(--cg-fg)]"
          }`}
        >
          <Smartphone className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <p className="text-sm font-extrabold text-[var(--cg-fg)]">{title}</p>
      </div>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--cg-secondary)] text-xs font-bold text-[var(--cg-fg)]">
              {index + 1}
            </span>
            <p className="pt-0.5 text-sm leading-snug text-[var(--cg-fg)]">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
