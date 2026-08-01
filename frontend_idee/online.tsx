import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  Lock,
  Pause,
  ScrollText,
} from "lucide-react";
import { BigButton, ChatBubble, IconBtn, SectionLabel, StageShell } from "@/components/game/ui";
import { StatusHud } from "@/components/game/StatusHud";
import { DeviceHintBar, Modal, TeamToolbar } from "@/components/game/LiveTeamPanel";
import { missionKindInfo, missions, onlineGame, type Mission } from "@/lib/game-data";
import { pushFeed, roleInfo, setGame, toggleReady, useGame, useMe } from "@/lib/game-store";

export const Route = createFileRoute("/online")({
  head: () => ({
    meta: [
      { title: "Missions-Deck — Online Escape Game" },
      {
        name: "description",
        content:
          "Der Hub für Online-Escape-Games: eine Mission im Fokus, gemeinsamer Bereit-Check und alle Team-Infos hinter ruhigen Buttons.",
      },
      { property: "og:title", content: "Missions-Deck — Online Escape Game" },
      {
        property: "og:description",
        content:
          "Remote spielen ohne Extra-Chat: eine klare Aufgabe pro Screen, Team-Board und Live-Verlauf per Knopfdruck.",
      },
    ],
  }),
  component: OnlineHub,
});

function OnlineHub() {
  const g = useGame();
  const me = useMe();
  const navigate = useNavigate();
  const [modal, setModal] = useState<null | "paused" | "support" | "notes" | "all">(null);
  const [detail, setDetail] = useState<Mission | null>(null);

  useEffect(() => {
    if (g.mode !== "online") {
      setGame({ mode: "online", totalWaypoints: missions.length, doneStations: [1, 2] });
    }
  }, [g.mode]);

  const done = g.doneStations;
  const next = missions.find((m) => !done.includes(m.id));
  const allReady = g.roster.every((m) => g.ready.includes(m.id));
  const iAmReady = g.ready.includes(g.meId);

  function startMission(m: Mission) {
    setGame({
      mode: "online",
      activeStation: m.id,
      currentWaypoint: m.id,
      totalWaypoints: missions.length,
      nearWaypoint: true,
      quizAnswered: false,
      quizCorrect: null,
      openedHints: [],
      solutionRevealed: false,
      ready: [],
      draftAnswer: "",
      draftBy: null,
    });
    pushFeed(me.name, `startet Mission ${m.id}: „${m.name}“ für alle`, "good");
    navigate({ to: "/quiz" });
  }

  return (
    <StageShell>
      <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 sm:px-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <SectionLabel>{onlineGame.subtitle}</SectionLabel>
            <h1 className="truncate text-xl font-bold sm:text-2xl">{onlineGame.title}</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <IconBtn label="Support" onClick={() => setModal("support")}>
              <LifeBuoy className="h-5 w-5" />
            </IconBtn>
            <IconBtn label="Pause" onClick={() => setModal("paused")}>
              <Pause className="h-5 w-5" />
            </IconBtn>
          </div>
        </header>

        <div className="mt-4 space-y-2">
          <StatusHud />
          <TeamToolbar />
        </div>

        {/* Fokus: genau eine Mission */}
        {next && (
          <section className="mt-6 rounded-3xl border-2 border-primary bg-card p-5 shadow-lift sm:p-7">
            <SectionLabel>
              Mission {next.id} von {missions.length} · gemeinsamer Start
            </SectionLabel>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{next.name}</h2>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">{next.teaser}</p>
            <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-base font-semibold">
              {next.split}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {g.roster.map((m) => {
                const r = g.ready.includes(m.id);
                return (
                  <span
                    key={m.id}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
                      r ? "bg-success/25" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${r ? "bg-success" : "bg-muted-foreground"}`}
                    />
                    {m.name}
                    <span className="opacity-70">{roleInfo[m.role].label}</span>
                  </span>
                );
              })}
            </div>

            <div className="mt-5 space-y-3">
              <BigButton
                variant={iAmReady ? "outline" : "ghost"}
                icon={<Check className="h-5 w-5" />}
                onClick={() => toggleReady(g.meId, me.name)}
              >
                {iAmReady ? "Bereit zurücknehmen" : "Ich bin bereit"}
              </BigButton>
              <BigButton
                variant="accent"
                icon={<KeyRound className="h-5 w-5" />}
                disabled={!allReady}
                onClick={() => startMission(next)}
              >
                {allReady ? "Mission für alle starten" : "Warten auf das Team…"}
              </BigButton>
            </div>
          </section>
        )}

        {/* Nebensächliches: nur Buttons */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setModal("all")}
            className="tap-lift flex items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-semibold shadow-soft"
          >
            <LayoutGrid className="h-4 w-4 text-primary" />
            Alle Missionen ({done.length}/{missions.length})
          </button>
          <button
            type="button"
            onClick={() => setModal("notes")}
            className="tap-lift flex items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-semibold shadow-soft"
          >
            <ScrollText className="h-4 w-4 text-primary" />
            Hinweise ({g.clues.length})
          </button>
        </div>

        <div className="mt-3">
          <DeviceHintBar />
        </div>
      </div>

      {modal === "all" && (
        <Modal title="Alle Missionen" onClose={() => setModal(null)}>
          <div className="flex gap-1.5">
            {missions.map((m) => (
              <span
                key={m.id}
                className={`h-2.5 flex-1 rounded-full ${
                  done.includes(m.id) ? "bg-success" : m.id === next?.id ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </div>
          <ul className="space-y-2">
            {missions.map((m) => {
              const isDone = done.includes(m.id);
              const isNext = m.id === next?.id;
              const locked = !isDone && !isNext;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setModal(null);
                      setDetail(m);
                    }}
                    className={`tap-lift grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border-2 p-3 text-left ${
                      isDone
                        ? "border-success/40 bg-success/10"
                        : isNext
                          ? "border-primary bg-card"
                          : "border-border bg-secondary opacity-60"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${
                        isDone
                          ? "bg-success text-success-foreground"
                          : locked
                            ? "bg-card text-muted-foreground"
                            : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isDone ? <Check className="h-6 w-6" /> : locked ? <Lock className="h-5 w-5" /> : m.id}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold">{m.name}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        {missionKindInfo[m.kind].label} · {m.points} P
                        <Clock className="h-3.5 w-3.5" /> {m.minutes} Min
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <p className="text-base text-muted-foreground">
            {missionKindInfo[detail.kind].label} · ca. {detail.minutes} Minuten · {detail.points} Punkte
          </p>
          <p className="rounded-2xl bg-secondary px-4 py-3 text-base font-semibold">{detail.split}</p>
          {done.includes(detail.id) ? (
            <BigButton variant="outline" onClick={() => setDetail(null)}>
              Schon gelöst — schließen
            </BigButton>
          ) : (
            <BigButton
              variant="accent"
              icon={<KeyRound className="h-5 w-5" />}
              onClick={() => startMission(detail)}
            >
              Mission öffnen
            </BigButton>
          )}
        </Modal>
      )}

      {modal === "paused" && (
        <Modal title="Spiel pausiert" onClose={() => setModal(null)}>
          <p className="text-base text-muted-foreground">
            Die Zeit steht für das ganze Team still. Alle sehen die Pause auf ihrem Gerät und können
            den Tab schließen.
          </p>
          <BigButton onClick={() => setModal(null)}>Weiterspielen</BigButton>
        </Modal>
      )}

      {modal === "support" && (
        <Modal title="Support-Chat" onClose={() => setModal(null)}>
          <div className="space-y-2">
            <ChatBubble side="them">Hallo! Wobei können wir euch helfen?</ChatBubble>
            <ChatBubble side="me">Elifs Kachel lädt nicht.</ChatBubble>
            <ChatBubble side="them">
              Wir schicken sie neu — kurz die Seite aktualisieren, der Spielstand bleibt.
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
        </Modal>
      )}

      {modal === "notes" && (
        <Modal title="Eure Hinweise" onClose={() => setModal(null)}>
          <ul className="space-y-2">
            {g.clues.map((c, i) => (
              <li key={c} className="rounded-2xl bg-secondary px-4 py-4 text-base font-semibold">
                <span className="mr-2 text-primary">#{i + 1}</span>
                {c}
              </li>
            ))}
          </ul>
          {g.role === "beta" ? (
            <BigButton variant="outline">Rätselblatt (PDF) öffnen — dein Job als Beta</BigButton>
          ) : (
            <p className="rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-muted-foreground">
              Das Rätselblatt liegt bei {g.roster.find((m) => m.role === "beta")?.name ?? "Beta"}{" "}
              (Beta) auf dem Bildschirm.
            </p>
          )}
        </Modal>
      )}

    </StageShell>
  );
}
