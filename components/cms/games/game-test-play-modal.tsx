"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getOrCreateStudioTestSession,
  regenerateStudioTestSession,
  type StudioTestSession,
} from "@/app/actions/cms/events";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { IconCopy, IconInfo, IconRefresh } from "@/components/cms/studio-icons";
import { StudioButton, StudioError } from "@/components/cms/studio-ui";
import { localeLabel, localeShort, type StudioLanguage } from "@/lib/cms/languages";

type Props = {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
  publishedVersionNumber: number;
  locales: StudioLanguage[];
  defaultLanguage: StudioLanguage;
};

const REGENERATE_INFO =
  "Neu generieren beendet die aktuelle Testsession — Fortschritt geht verloren. Der Inhalt kommt immer aus dem gespeicherten Editor-Stand.";

export function GameTestPlayModal({
  open,
  onClose,
  gameId,
  gameName,
  publishedVersionNumber,
  locales,
  defaultLanguage,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [session, setSession] = useState<StudioTestSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<StudioLanguage>(defaultLanguage);

  function absoluteUrl(path: string) {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  useEffect(() => {
    if (open) setLanguage(defaultLanguage);
  }, [open, defaultLanguage]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCopied(false);
    setSession(null);
    startTransition(async () => {
      const result = await getOrCreateStudioTestSession(gameId, language);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSession(result.data!);
    });
  }, [open, gameId, language]);

  function handleRegenerate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await regenerateStudioTestSession(gameId, language);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSession(result.data!);
    });
  }

  async function handleCopy() {
    if (!session) return;
    const url = absoluteUrl(session.playPath);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren fehlgeschlagen — Link manuell markieren.");
    }
  }

  const playUrl = session ? absoluteUrl(session.playPath) : null;
  const languageOptions = locales.length > 0 ? locales : [defaultLanguage];

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      title="Spiel testen"
      subtitle={`${gameName} · ${localeShort(language)} · Version ${publishedVersionNumber} · bis ${session?.maxPlayers ?? 3} Spieler (Alpha, Beta, Gamma)`}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <StudioButton
            type="button"
            disabled={pending || !session}
            icon={<IconCopy size={16} />}
            onClick={() => void handleCopy()}
          >
            {copied ? "Kopiert" : "Link kopieren"}
          </StudioButton>
          <StudioButton
            type="button"
            variant="secondary"
            disabled={pending || !session}
            onClick={() => {
              if (playUrl) window.open(playUrl, "_blank", "noopener,noreferrer");
            }}
          >
            Öffnen
          </StudioButton>
          <StudioButton
            type="button"
            variant="ghost"
            disabled={pending}
            icon={<IconRefresh size={16} />}
            onClick={handleRegenerate}
          >
            {pending ? "…" : "Neu generieren"}
          </StudioButton>
          {session ? (
            <a
              href={absoluteUrl(session.cockpitPath)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline"
            >
              Cockpit
            </a>
          ) : null}
        </div>
      }
    >
      {error ? (
        <div className="mb-4">
          <StudioError message={error} />
        </div>
      ) : null}

      {languageOptions.length > 1 ? (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Sprache
          </p>
          <div className="inline-flex flex-wrap rounded-2xl bg-secondary p-1">
            {languageOptions.map((item) => {
              const active = item === language;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={pending}
                  onClick={() => setLanguage(item)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                    active
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {localeLabel(item)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Bereits geöffnete Test-Tabs nach dem Sprachwechsel neu laden.
          </p>
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-muted-foreground">
        Als Team Lead zuerst <strong>Teamnamen</strong> und deinen Namen festlegen. Danach denselben
        Link an Mitspieler schicken — sie sehen die Einladung, tragen nur ihren Namen ein und landen
        im Wartebereich. Nach größeren Inhaltsänderungen besser „Neu generieren“.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Bonus nach Metern bleibt im Spiel auf dem echten Wert (z. B. 80 m). Denselben Testlink
        kannst du am Tisch prüfen (+25 m / Bonus jetzt zeigen) und danach draußen laufen — beides
        zählt. Echte Buchungen sehen diese Testleiste nicht.
      </p>

      {playUrl ? (
        <div className="mt-4 rounded-2xl border border-border bg-secondary/50 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Testlink · {localeShort(language)}
            </p>
            <span className="group relative inline-flex">
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground"
                aria-label={REGENERATE_INFO}
                title={REGENERATE_INFO}
              >
                <IconInfo className="h-3.5 w-3.5" />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs leading-5 text-muted-foreground opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {REGENERATE_INFO}
              </span>
            </span>
          </div>
          <a
            href={playUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            {playUrl}
          </a>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {pending ? "Testlink wird vorbereitet…" : "Kein Testlink geladen."}
        </p>
      )}
    </StudioModal>
  );
}
