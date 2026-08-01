import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  KeyRound,
  LifeBuoy,
  Lock,
  Pause,
  Puzzle,
  QrCode,
  ScrollText,
  Search,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import {
  PhoneShell,
  BigButton,
  SectionLabel,
  IconBtn,
  Sheet,
  ChatBubble,
} from "@/components/game/ui";
import { StatusHud } from "@/components/game/StatusHud";
import { TeamBar } from "@/components/game/TeamBar";
import { indoorGame, stationKindInfo, stations, type Station } from "@/lib/game-data";
import { setGame, useGame } from "@/lib/game-store";

export const Route = createFileRoute("/indoor")({
  head: () => ({
    meta: [
      { title: "Stationen — Indoor Escape Game" },
      {
        name: "description",
        content:
          "Der Stations-Hub für Indoor-Games ohne GPS: Stationen antippen oder Stationscode eingeben, Zeit, Punkte und Hinweise im Blick.",
      },
      { property: "og:title", content: "Stationen — Indoor Escape Game" },
      {
        property: "og:description",
        content:
          "Indoor-Escape ohne Karte: Stationen frei wählen, Rätsel öffnen, Team-Rollen sehen.",
      },
    ],
  }),
  component: IndoorHub,
});

const kindIcon: Record<string, React.ReactNode> = {
  puzzle: <Puzzle className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
  logic: <Sparkles className="h-5 w-5" />,
  team: <Users className="h-5 w-5" />,
  finale: <Trophy className="h-5 w-5" />,
};

function IndoorHub() {
  const g = useGame();
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const [support, setSupport] = useState(false);
  const [notes, setNotes] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Station | null>(null);

  // Dieser Screen ist der Hub des Indoor-Modus — Modus im Spielstand setzen.
  useEffect(() => {
    if (g.mode !== "indoor") setGame({ mode: "indoor", totalWaypoints: stations.length });
  }, [g.mode]);

  const done = g.doneStations;
  const nextOpen = stations.find((s) => !done.includes(s.id));

  function isLocked(s: Station) {
    if (done.includes(s.id)) return false;
    if (indoorGame.order === "free") return false;
    return s.id !== nextOpen?.id;
  }

  function startStation(s: Station) {
    setGame({
      mode: "indoor",
      activeStation: s.id,
      currentWaypoint: s.id,
      totalWaypoints: stations.length,
      nearWaypoint: true,
      quizAnswered: false,
      quizCorrect: null,
      openedHints: [],
      solutionRevealed: false,
    });
    navigate({ to: "/quiz" });
  }

  function submitCode() {
    const match = stations.find((s) => s.code.toLowerCase() === code.trim().toLowerCase());
    if (!match) {
      setCodeError("Diesen Code gibt es hier nicht. Schaut nochmal auf das Schild an der Station.");
      return;
    }
    if (done.includes(match.id)) {
      setCodeError(`„${match.name}“ habt ihr schon gelöst. Sucht eine offene Station.`);
      return;
    }
    setCodeOpen(false);
    setCode("");
    setCodeError(null);
    startStation(match);
  }

  return (
    <PhoneShell>
      <div className="flex min-h-screen flex-col sm:min-h-[calc(100vh-4rem)]">
        <div className="z-20 space-y-3 bg-background/95 px-4 pb-3 pt-5 backdrop-blur">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <SectionLabel>{indoorGame.place}</SectionLabel>
              <h1 className="truncate text-xl font-bold">{indoorGame.title}</h1>
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

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {/* Fortschritts-Leiste ersetzt den Laufweg auf der Karte */}
          <div className="rounded-3xl bg-card p-4 shadow-soft">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="text-base font-bold">
                {done.length} von {stations.length} Stationen gelöst
              </p>
              <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                {indoorGame.order === "free" ? "Freie Reihenfolge" : "Der Reihe nach"}
              </span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {stations.map((s) => (
                <span
                  key={s.id}
                  className={`h-2.5 flex-1 rounded-full ${
                    done.includes(s.id)
                      ? "bg-success"
                      : s.id === nextOpen?.id
                        ? "bg-primary"
                        : "bg-secondary"
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Kein Laufen, kein GPS: Tippt die Station an, an der ihr gerade steht — oder gebt den
              Stationscode ein, der dort aushängt.
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <SectionLabel>Stationen im Raum</SectionLabel>
            <button
              type="button"
              onClick={() => setNotes(true)}
              className="tap-lift flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-soft"
            >
              <ScrollText className="h-4 w-4 text-primary" />
              Hinweise {g.clues.length}
            </button>
          </div>

          <ul className="space-y-3">
            {stations.map((s) => {
              const isDone = done.includes(s.id);
              const locked = isLocked(s);
              const isNext = !isDone && s.id === nextOpen?.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setDetail(s)}
                    className={`tap-lift grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border-2 p-4 text-left ${
                      isDone
                        ? "border-success/40 bg-success/10"
                        : isNext
                          ? "border-primary bg-card shadow-lift"
                          : locked
                            ? "border-border bg-secondary opacity-60"
                            : "border-border bg-card"
                    }`}
                  >
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${
                        isDone
                          ? "bg-success text-success-foreground"
                          : locked
                            ? "bg-card text-muted-foreground"
                            : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isDone ? <Check className="h-7 w-7" /> : locked ? <Lock className="h-6 w-6" /> : s.id}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-bold">{s.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {s.place}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                          {kindIcon[s.kind]} {stationKindInfo[s.kind].label}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5" /> ca. {s.minutes} Min
                        </span>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                          Code {s.code}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-muted-foreground">
                      {isDone ? "gelöst" : `${s.points} P`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="z-20 space-y-3 rounded-t-3xl bg-card px-4 pb-6 pt-4 shadow-lift">
          {nextOpen ? (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <SectionLabel>Vorschlag</SectionLabel>
                  <p className="truncate text-lg font-bold">{nextOpen.name}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">
                  {nextOpen.place}
                </span>
              </div>
              <BigButton variant="accent" onClick={() => startStation(nextOpen)}>
                Station starten
              </BigButton>
              <BigButton
                variant="outline"
                icon={<QrCode className="h-5 w-5" />}
                onClick={() => setCodeOpen(true)}
              >
                Stationscode eingeben
              </BigButton>
            </>
          ) : (
            <p className="rounded-2xl bg-success/20 px-4 py-4 text-center text-base font-bold">
              Alle Stationen gelöst — auf zur Auswertung!
            </p>
          )}
        </div>
      </div>

      {detail && (
        <Sheet onClose={() => setDetail(null)} title={detail.name}>
          <p className="text-base text-muted-foreground">
            {detail.place} · {stationKindInfo[detail.kind].label} · ca. {detail.minutes} Minuten ·{" "}
            {detail.points} Punkte
          </p>
          <p className="rounded-2xl bg-secondary px-4 py-3 text-base font-semibold">
            Stellt euch an diese Station. Zuerst kommt eine kurze Frage zur Umgebung — sie ist euer
            Schlüssel zum Rätsel.
          </p>
          {g.doneStations.includes(detail.id) ? (
            <BigButton variant="outline" onClick={() => setDetail(null)}>
              Schon gelöst — schließen
            </BigButton>
          ) : (
            <BigButton
              variant="accent"
              icon={<KeyRound className="h-5 w-5" />}
              onClick={() => startStation(detail)}
            >
              Station öffnen
            </BigButton>
          )}
        </Sheet>
      )}

      {codeOpen && (
        <Sheet
          onClose={() => {
            setCodeOpen(false);
            setCodeError(null);
          }}
          title="Stationscode eingeben"
        >
          <p className="text-base text-muted-foreground">
            An jeder Station hängt ein Schild mit einem kurzen Code, z. B. „A1“. So weiß die App, wo
            ihr steht — ganz ohne GPS.
          </p>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCodeError(null);
            }}
            placeholder="z. B. A1"
            autoComplete="off"
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-5 text-center text-2xl font-bold uppercase tracking-[0.3em] outline-none focus:border-ring"
          />
          {codeError && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
              {codeError}
            </p>
          )}
          <BigButton onClick={submitCode} disabled={code.trim().length === 0}>
            Station öffnen
          </BigButton>
        </Sheet>
      )}

      {paused && (
        <Sheet onClose={() => setPaused(false)} title="Spiel pausiert">
          <p className="text-base text-muted-foreground">
            Die Zeit läuft nicht weiter. Ihr könnt die App schließen und später an derselben Station
            weitermachen.
          </p>
          <BigButton onClick={() => setPaused(false)}>Weiterspielen</BigButton>
        </Sheet>
      )}

      {support && (
        <Sheet onClose={() => setSupport(false)} title="Support-Chat">
          <div className="space-y-2">
            <ChatBubble side="them">Hallo! Wobei können wir euch helfen?</ChatBubble>
            <ChatBubble side="me">Wir finden das Archivregal nicht.</ChatBubble>
            <ChatBubble side="them">
              Kein Problem – Saal B, direkt hinter der großen Vitrine.
            </ChatBubble>
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
        </Sheet>
      )}

      {notes && (
        <Sheet onClose={() => setNotes(false)} title="Eure Hinweise">
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
        </Sheet>
      )}
    </PhoneShell>
  );
}
