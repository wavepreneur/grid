import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Gift, UserRound, X } from "lucide-react";
import { PhoneShell, BigButton, SectionLabel } from "@/components/game/ui";
import { TeamBar } from "@/components/game/TeamBar";
import { bonusTask } from "@/lib/game-data";
import { hubPath, roleInfo, setGame, useGame, useMe } from "@/lib/game-store";


export const Route = createFileRoute("/bonus")({
  head: () => ({
    meta: [
      { title: "Bonusaufgabe — Stadtjagd City Game" },
      {
        name: "description",
        content:
          "Rollenbasierte Bonusaufgabe für Alpha, Beta oder Gamma — richtig oder falsch, das Spiel geht weiter.",
      },
      { property: "og:title", content: "Bonusaufgabe — Stadtjagd City Game" },
      {
        property: "og:description",
        content: "Extra-Punkte zwischen zwei Wegpunkten, zugeschnitten auf eine Spielerrolle.",
      },
    ],
  }),
  component: BonusScreen,
});

function BonusScreen() {
  const g = useGame();
  const me = useMe();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === bonusTask.correctIndex;

  const isMine = me.role === bonusTask.forRole;

  // Auf allen anderen Handys passiert nichts: sie bleiben einfach auf der Karte.
  useEffect(() => {
    if (!isMine) {
      setGame({
        currentWaypoint: g.mode === "outdoor" ? Math.min(g.currentWaypoint + 1, g.totalWaypoints) : g.currentWaypoint,
        openedHints: [],
        quizCorrect: null,
      });
      navigate({ to: hubPath(g.mode), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMine]);

  function next() {
    setGame({
      currentWaypoint: g.mode === "outdoor" ? Math.min(g.currentWaypoint + 1, g.totalWaypoints) : g.currentWaypoint,
      points: g.points + (correct ? bonusTask.reward : 0),
      openedHints: [],
      quizCorrect: null,
    });
    navigate({ to: hubPath(g.mode) });
  }

  if (!isMine) return null;

  return (
    <PhoneShell>
      <div className="flex min-h-screen flex-col px-5 pb-8 pt-6 sm:min-h-[calc(100vh-4rem)]">
        <TeamBar />

        <div className="mt-6 flex flex-col items-center text-center">
          <span className="animate-pop-in flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-accent-foreground shadow-lift">
            <Gift className="h-10 w-10" />
          </span>
          <SectionLabel>Bonusaufgabe · +{bonusTask.reward} Punkte</SectionLabel>
          <h1 className="mt-1 text-2xl font-bold">{bonusTask.title}</h1>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
            <UserRound className="h-4 w-4" /> {me.name}
            <span className="opacity-70">{roleInfo[me.role].label}</span>
          </span>
        </div>

        <div className="animate-rise-in mt-8 space-y-4">
          <p className="rounded-2xl bg-accent/15 px-4 py-3 text-center text-base font-semibold">
            Nur du siehst diese Aufgabe, {me.name}.
          </p>
          <p className="rounded-2xl bg-card p-5 text-lg font-semibold shadow-soft">
            {bonusTask.question}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {bonusTask.options.map((opt, i) => {
              const show = picked !== null;
              const isRight = i === bonusTask.correctIndex;
              const isPicked = picked === i;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={show}
                  onClick={() => setPicked(i)}
                  className={`tap-lift flex items-center justify-center gap-2 rounded-2xl border-2 py-6 text-xl font-bold ${
                    show && isRight
                      ? "border-success bg-success/20"
                      : show && isPicked
                        ? "border-destructive bg-destructive/10"
                        : "border-border bg-card"
                  }`}
                >
                  {opt}
                  {show && isRight && <Check className="h-5 w-5 text-success" />}
                  {show && isPicked && !isRight && <X className="h-5 w-5 text-destructive" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-6">
          {picked !== null && (
            <div className="animate-rise-in space-y-3">
              <p className="text-center text-base font-semibold">
                {correct
                  ? `Richtig! +${bonusTask.reward} Punkte für das Team.`
                  : "Diesmal daneben — keine Punkte, es geht direkt weiter."}
              </p>
              <BigButton onClick={next}>{g.mode === "indoor" ? "Zurück zu den Stationen" : g.mode === "online" ? "Zurück zum Missions-Deck" : "Zurück zur Karte"}</BigButton>
            </div>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}
