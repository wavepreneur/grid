import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, KeyRound, X } from "lucide-react";
import { PhoneShell, BigButton, SectionLabel, StageShell } from "@/components/game/ui";
import { TeamBar } from "@/components/game/TeamBar";
import { TeamToolbar } from "@/components/game/LiveTeamPanel";

import { arrivalQuiz, missions, onlineQuiz, stationQuiz, stations, waypoints } from "@/lib/game-data";
import { hubPath, setGame, useGame } from "@/lib/game-store";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Umgebungsquiz — Stadtjagd City Game" },
      {
        name: "description",
        content:
          "Das Umgebungsquiz am Wegpunkt: eine Multiple-Choice-Frage als Schlüssel zum nächsten Level.",
      },
      { property: "og:title", content: "Umgebungsquiz — Stadtjagd City Game" },
      {
        property: "og:description",
        content: "Beantworte die Frage vor Ort und schließe damit das nächste Level auf.",
      },
    ],
  }),
  component: QuizScreen,
});

function QuizScreen() {
  const g = useGame();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<number | null>(null);
  const indoor = g.mode === "indoor";
  const online = g.mode === "online";
  const hub = hubPath(g.mode);
  const station = stations.find((s) => s.id === g.activeStation) ?? stations[0]!;
  const mission = missions.find((m) => m.id === g.activeStation) ?? missions[0]!;
  const wp = waypoints.find((w) => w.id === g.currentWaypoint) ?? waypoints[0]!;
  const quiz = online ? onlineQuiz : indoor ? stationQuiz : arrivalQuiz;
  const spot = online ? mission.name : indoor ? station.name : wp.name;
  const correct = picked === quiz.correctIndex;
  const Shell = online ? StageShell : PhoneShell;

  const header = (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <button
        type="button"
        aria-label={online ? "Zurück zu den Missionen" : indoor ? "Zurück zu den Stationen" : "Zurück zur Karte"}
        onClick={() => navigate({ to: hub })}
        className="tap-lift flex h-11 w-11 items-center justify-center rounded-full bg-secondary"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <SectionLabel>
          {online ? "Mission gestartet · alle gleichzeitig" : indoor ? "Station geöffnet" : "Wegpunkt erreicht"}
        </SectionLabel>
        <p className="truncate text-base font-bold">{spot}</p>
      </div>
    </div>
  );

  const intro = (
    <div className="mt-8 flex flex-col items-center text-center">
      <span className="animate-key-turn flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-accent-foreground shadow-lift">
        <KeyRound className="h-10 w-10" strokeWidth={2.5} />
      </span>
      <h1 className="mt-5 text-2xl font-bold sm:text-3xl">
        {online ? "Einstiegsfrage" : indoor ? "Frage vor Ort" : "Umgebungsquiz"}
      </h1>
      <p className="mt-2 max-w-md text-base text-muted-foreground">
        {online
          ? "Alle sehen dieselbe Frage auf ihrem eigenen Bildschirm. Eine Antwort genügt — sie ist der Schlüssel zum Rätsel."
          : "Diese Frage ist euer Schlüssel. Beantwortet sie und das Rätsel öffnet sich."}
      </p>
    </div>
  );

  const questionBlock = (
    <>
      <p className="mt-7 rounded-2xl bg-card p-5 text-lg font-semibold shadow-soft">
        {quiz.question}
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {quiz.options.map((opt, i) => {
          const isPicked = picked === i;
          const isRight = i === quiz.correctIndex;
          const show = picked !== null;
          return (
            <button
              key={opt}
              type="button"
              disabled={show}
              onClick={() => setPicked(i)}
              className={`tap-lift grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-2 px-4 py-5 text-left text-base font-semibold ${
                show && isRight
                  ? "border-success bg-success/20"
                  : show && isPicked
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-card"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0">{opt}</span>
              {show && isRight && <Check className="h-6 w-6 shrink-0 text-success" />}
              {show && isPicked && !isRight && <X className="h-6 w-6 shrink-0 text-destructive" />}
            </button>
          );
        })}
      </div>
    </>
  );

  const footer = picked !== null && (
    <div className="animate-rise-in space-y-3">
      <p className="text-center text-base font-semibold">
        {correct
          ? "Richtig! +100 Punkte — der Schlüssel passt."
          : "Leider falsch — der Schlüssel passt trotzdem, aber ohne Bonuspunkte."}
      </p>
      <BigButton
        variant="accent"
        onClick={() => {
          setGame({
            quizAnswered: true,
            quizCorrect: correct,
            points: g.points + (correct ? 100 : 0),
          });
          navigate({ to: "/level" });
        }}
      >
        {online
          ? "Rätsel für alle öffnen"
          : indoor
            ? "Rätsel aufschließen"
            : `Level ${g.currentWaypoint} aufschließen`}
      </BigButton>
    </div>
  );

  if (online) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 sm:px-6">
          {header}
          <div className="mt-4">
            <TeamToolbar />
          </div>
          {intro}
          {questionBlock}
          <div className="mt-6">{footer}</div>
        </div>
      </Shell>
    );
  }

  return (
    <PhoneShell>
      <div className="flex min-h-screen flex-col px-5 pb-8 pt-5 sm:min-h-[calc(100vh-4rem)]">
        {header}

        <div className="mt-3">
          <TeamBar compact />
        </div>

        {intro}
        {questionBlock}

        <div className="mt-auto pt-6">{footer}</div>
      </div>
    </PhoneShell>
  );
}
