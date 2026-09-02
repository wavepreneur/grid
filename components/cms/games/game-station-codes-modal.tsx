"use client";

import { useEffect, useState, useTransition } from "react";
import { listGameStationCodes, type GameStationCodeCard } from "@/app/actions/cms/games";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { IconDownload } from "@/components/cms/studio-icons";
import { StudioButton, StudioError } from "@/components/cms/studio-ui";

type Props = {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
};

export function GameStationCodesModal({ open, onClose, gameId, gameName }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<GameStationCodeCard[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCards([]);
    startTransition(async () => {
      const result = await listGameStationCodes(gameId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCards(result.data!.cards);
    });
  }, [open, gameId]);

  function handlePrint() {
    const page = window.open("", "_blank", "noopener,noreferrer");
    if (!page) {
      setError("Popup blockiert — Druckfenster erlauben.");
      return;
    }
    page.document.write(printDocument(gameName, cards));
    page.document.close();
    page.focus();
    window.setTimeout(() => page.print(), 250);
  }

  return (
    <StudioModal open={open} onClose={onClose} title="Stationscodes">
      <p className="text-sm text-muted-foreground">
        Zum Ausdrucken und Aufhängen. Der Code steht in der Mitte — Spieler tippen ihn im
        Hub ein, um die Aufgabe zu öffnen.
      </p>
      {error ? <StudioError message={error} /> : null}
      {pending ? (
        <p className="mt-4 text-sm text-muted-foreground">Codes werden gelesen…</p>
      ) : cards.length === 0 && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">Noch keine Aufgaben in diesem Spiel.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <li
              key={`${card.index}-${card.code}`}
              className="rounded-3xl border-2 border-primary/25 bg-secondary px-4 py-5 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Station {card.index}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">{card.title}</p>
              <p className="mt-3 font-mono text-3xl font-black tracking-[0.28em] text-primary">
                {card.code}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <StudioButton
          type="button"
          icon={<IconDownload size={16} />}
          disabled={pending || cards.length === 0}
          onClick={handlePrint}
        >
          Drucken / PDF
        </StudioButton>
        <StudioButton type="button" variant="ghost" onClick={onClose}>
          Schließen
        </StudioButton>
      </div>
    </StudioModal>
  );
}

function printDocument(gameName: string, cards: GameStationCodeCard[]): string {
  const tiles = cards
    .map(
      (card) => `
      <article class="card">
        <p class="kicker">GRID Indoor · Station ${card.index}</p>
        <p class="title">${escapeHtml(card.title)}</p>
        <p class="code">${escapeHtml(card.code)}</p>
        <p class="game">${escapeHtml(gameName)}</p>
      </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Stationscodes · ${escapeHtml(gameName)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: #f4efe6;
      color: #14241c;
    }
    h1 { font-size: 14px; margin: 0 0 12px; letter-spacing: 0.08em; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; }
    .card {
      break-inside: avoid;
      min-height: 88mm;
      padding: 10mm 8mm;
      border-radius: 18px;
      background: #fffaf2;
      border: 3px solid #1f6b4a;
      box-shadow: 0 10px 0 #123d2a;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .kicker { margin: 0; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #5b6b62; }
    .title { margin: 8px 0 0; font-size: 16px; font-weight: 700; }
    .code {
      margin: 16px 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 0.28em;
      color: #1f6b4a;
    }
    .game { margin: 0; font-size: 12px; color: #5b6b62; }
  </style>
</head>
<body>
  <h1>Aufhängen · ${escapeHtml(gameName)}</h1>
  <div class="grid">${tiles}</div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
