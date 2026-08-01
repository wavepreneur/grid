import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Footprints,
  Layers,
  LifeBuoy,
  Map as MapIcon,
  Pause,
  ScrollText,
  X,
} from "lucide-react";
import { PhoneShell, BigButton, SectionLabel } from "@/components/game/ui";
import { StatusHud } from "@/components/game/StatusHud";
import { TeamBar } from "@/components/game/TeamBar";

import { GameMap } from "@/components/game/GameMap";
import { setGame, useGame } from "@/lib/game-store";
import { waypoints } from "@/lib/game-data";

export const Route = createFileRoute("/outdoor")({
  head: () => ({
    meta: [
      { title: "Kartenansicht — Stadtjagd City Game" },
      {
        name: "description",
        content:
          "Laufe zum nächsten Wegpunkt, behalte Zeit, Punkte und offene Level im Blick und starte dein nächstes Rätsel.",
      },
      { property: "og:title", content: "Kartenansicht — Stadtjagd City Game" },
      {
        property: "og:description",
        content: "Der Karten-Hub des Outdoor-Escape-Games: Wegpunkte, Zeit, Punkte, Hinweise.",
      },
    ],
  }),
  component: MapScreen,
});

function MapScreen() {
  const g = useGame();
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const [support, setSupport] = useState(false);
  const [notes, setNotes] = useState(false);
  const wp = waypoints.find((w) => w.id === g.currentWaypoint) ?? waypoints[0]!;

  // Dieser Screen ist der Hub des Outdoor-Modus.
  useEffect(() => {
    if (g.mode !== "outdoor") {
      setGame({ mode: "outdoor", totalWaypoints: waypoints.length, currentWaypoint: 3 });
    }
  }, [g.mode]);

  return (
    <PhoneShell>
      <div className="flex min-h-screen flex-col sm:min-h-[calc(100vh-4rem)]">
        {/* Kopfzeile */}
        <div className="z-20 space-y-3 bg-background/95 px-4 pb-3 pt-5 backdrop-blur">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <SectionLabel>Stadtjagd Altstadt</SectionLabel>
              <h1 className="truncate text-xl font-bold">Wegpunkt {g.currentWaypoint} von {g.totalWaypoints}</h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <IconBtn label="Support" onClick={() => setSupport(true)}>
                <LifeBuoy className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Pause" onClick={() => setPaused(true)}>
                <Pause className="h-5 w-5" />
              </IconBtn>
            </div>
          </header>
          <TeamBar />
          <StatusHud />

        </div>


        {/* Karte */}
        <div className="relative min-h-[300px] flex-1">
          <GameMap />

          <div className="absolute left-4 top-4 flex rounded-full bg-card p-1 shadow-lift">
            <ModeBtn active={g.mapMode === "single"} onClick={() => setGame({ mapMode: "single" })}>
              <MapIcon className="h-4 w-4" /> Nur nächster
            </ModeBtn>
            <ModeBtn active={g.mapMode === "all"} onClick={() => setGame({ mapMode: "all" })}>
              <Layers className="h-4 w-4" /> Alle
            </ModeBtn>
          </div>

          <button
            type="button"
            onClick={() => setNotes(true)}
            className="tap-lift absolute right-4 top-4 flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold shadow-lift"
          >
            <ScrollText className="h-4 w-4 text-primary" />
            Hinweise {g.clues.length}
          </button>
        </div>

        {/* Aktionsleiste unten */}
        <div className="z-20 space-y-3 rounded-t-3xl bg-card px-4 pb-6 pt-4 shadow-lift">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <SectionLabel>Euer Ziel</SectionLabel>
              <p className="truncate text-lg font-bold">{wp.name}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">
              <Footprints className="h-4 w-4 text-primary" /> ca. 120 m
            </span>
          </div>

          {g.nearWaypoint ? (
            <div className="animate-pop-in space-y-2">
              <p className="rounded-xl bg-success/20 px-4 py-3 text-center text-base font-semibold">
                Ihr seid da! Der Wegpunkt hat sich aktiviert.
              </p>
              <BigButton variant="accent" onClick={() => navigate({ to: "/quiz" })}>
                Wegpunkt öffnen
              </BigButton>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Lauft zum Wegpunkt. Bei ca. 10 m Entfernung startet das Level automatisch.
              </p>
              <BigButton onClick={() => setGame({ nearWaypoint: true })}>
                Ankunft simulieren (Demo)
              </BigButton>
            </>
          )}
        </div>
      </div>

      {paused && (
        <Overlay onClose={() => setPaused(false)} title="Spiel pausiert">
          <p className="text-base text-muted-foreground">
            Die Zeit läuft nicht weiter. Ihr könnt die App schließen und später genau hier
            weitermachen.
          </p>
          <BigButton onClick={() => setPaused(false)}>Weiterspielen</BigButton>
        </Overlay>
      )}

      {support && (
        <Overlay onClose={() => setSupport(false)} title="Support-Chat">
          <div className="space-y-2">
            <Bubble side="them">Hallo! Wobei können wir euch helfen?</Bubble>
            <Bubble side="me">Wir finden den Brunnen nicht.</Bubble>
            <Bubble side="them">Kein Problem – geht die Gasse hoch bis zum Rathaus.</Bubble>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Nachricht schreiben…"
              className="min-w-0 flex-1 rounded-2xl border-2 border-input bg-background px-4 py-4 text-base outline-none focus:border-ring"
            />
            <button className="tap-lift shrink-0 rounded-2xl bg-primary px-5 text-base font-semibold text-primary-foreground">
              Senden
            </button>
          </div>
        </Overlay>
      )}

      {notes && (
        <Overlay onClose={() => setNotes(false)} title="Eure Hinweise">
          <ul className="space-y-2">
            {g.clues.map((c, i) => (
              <li key={c} className="rounded-2xl bg-secondary px-4 py-4 text-base font-semibold">
                <span className="mr-2 text-primary">#{i + 1}</span>
                {c}
              </li>
            ))}
          </ul>
          {g.players > 1 &&
            (g.role === "beta" ? (
              <BigButton variant="outline">Rätselblatt (PDF) öffnen — dein Job als Beta</BigButton>
            ) : (
              <p className="rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-muted-foreground">
                Das Rätselblatt liegt bei{" "}
                {g.roster.find((m) => m.role === "beta")?.name ?? "Beta"} (Beta).
              </p>
            ))}

        </Overlay>
      )}
    </PhoneShell>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="tap-lift flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
    >
      {children}
    </button>
  );
}

function ModeBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function Overlay({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-ink/60 backdrop-blur-sm sm:rounded-4xl">
      <div className="animate-rise-in w-full space-y-4 rounded-t-3xl bg-card p-5 pb-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-xl font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="tap-lift flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Bubble({ children, side }: { children: React.ReactNode; side: "me" | "them" }) {
  return (
    <p
      className={`max-w-[80%] rounded-2xl px-4 py-3 text-base ${
        side === "me"
          ? "ml-auto bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </p>
  );
}
