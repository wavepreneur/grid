import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Lock,
  PartyPopper,
  Play,
  Share2,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import {
  PhoneShell,
  BigButton,
  SectionLabel,
  StageShell,
} from "@/components/game/ui";
import { TeamBar } from "@/components/game/TeamBar";
import { Modal, TeamToolbar } from "@/components/game/LiveTeamPanel";

import {
  bonusTask,
  indoorHeroImage,
  indoorLevel,
  level,
  levelHeroImage,
  missions,
  onlineHeroImage,
  onlineLevel,
  onlineTiles,
  stations,
  type MediaType,
  type OnlineTile,
  type Tile,
} from "@/lib/game-data";
import {
  hubPath,
  pushFeed,
  roleInfo,
  setDraft,
  setGame,
  shareToBoard,
  useGame,
  useMe,
} from "@/lib/game-store";

export const Route = createFileRoute("/level")({
  head: () => ({
    meta: [
      { title: "Level-Rätsel — Stadtjagd City Game" },
      {
        name: "description",
        content:
          "Öffne die Rätselkacheln mit Bild, Text, Audio, Video oder 360°-Ansicht und löse die Level-Aufgabe.",
      },
      { property: "og:title", content: "Level-Rätsel — Stadtjagd City Game" },
      {
        property: "og:description",
        content: "Kacheln antippen, Medien entdecken, Tipps kaufen und die Lösung eintragen.",
      },
    ],
  }),
  component: LevelScreen,
});

const mediaMeta: Record<MediaType, { icon: React.ReactNode; label: string }> = {
  image: { icon: <ImageIcon className="h-6 w-6" />, label: "Bild" },
  text: { icon: <FileText className="h-6 w-6" />, label: "Text" },
  video: { icon: <Play className="h-6 w-6" />, label: "Video" },
  gif: { icon: <Sparkles className="h-6 w-6" />, label: "GIF" },
  audio: { icon: <Volume2 className="h-6 w-6" />, label: "Audio" },
  iframe: { icon: <Globe className="h-6 w-6" />, label: "Interaktiv" },
};

function LevelScreen() {
  const g = useGame();
  const me = useMe();
  const indoor = g.mode === "indoor";
  const online = g.mode === "online";
  const hub = hubPath(g.mode);
  const station = stations.find((s) => s.id === g.activeStation) ?? stations[0]!;
  const mission = missions.find((m) => m.id === g.activeStation) ?? missions[0]!;
  const hero = online ? onlineHeroImage : indoor ? indoorHeroImage : levelHeroImage;
  const title = online ? onlineLevel.title : indoor ? indoorLevel.title : level.title;
  const description = online
    ? onlineLevel.description
    : indoor
      ? indoorLevel.description
      : level.description;
  const question = online ? onlineLevel.question : indoor ? indoorLevel.question : level.question;
  const tiles: OnlineTile[] = online ? onlineTiles : level.tiles;
  const navigate = useNavigate();
  const [openTile, setOpenTile] = useState<OnlineTile | null>(null);
  const [localValue, setLocalValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [solved, setSolved] = useState(false);
  const single = tiles.length === 1;
  const value = online ? g.draftAnswer : localValue;

  function onValueChange(v: string) {
    if (online) setDraft(v, me.name);
    else setLocalValue(v);
  }

  function check() {
    if (value.trim() === level.answer) {
      setSolved(true);
      if (online) pushFeed(me.name, "trägt die richtige Lösung ein", "good");
      setGame({
        points: g.points + (g.solutionRevealed ? 0 : 300),
        clues: [...g.clues, "Der Schlüssel liegt unter der dritten Stufe"],
      });
    } else {
      setWrong(true);
      if (online) pushFeed(me.name, "probiert eine Antwort — passt noch nicht", "info");
      setTimeout(() => setWrong(false), 1200);
    }
  }

  const badgeText = online
    ? `Mission ${mission.id} · ${roleInfo[me.role].label}`
    : indoor
      ? `Station ${station.id} · ${station.place}`
      : `Level ${level.number}`;

  const heroBlock = (
    <div className="relative">
      <img
        src={hero}
        alt=""
        width={1280}
        height={720}
        className={`w-full object-cover ${online ? "h-44 sm:h-60 xl:h-72" : "h-52"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
      <button
        type="button"
        aria-label={
          online ? "Zurück zu den Missionen" : indoor ? "Zurück zu den Stationen" : "Zurück zur Karte"
        }
        onClick={() => navigate({ to: hub })}
        className="tap-lift absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-card"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 left-5 right-5">
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
          {badgeText}
        </span>
        <h1 className="mt-2 text-2xl font-bold text-ink-foreground sm:text-3xl">{title}</h1>
      </div>
    </div>
  );

  const briefingBlock = (
    <button
      type="button"
      onClick={() => setBriefing(true)}
      className="tap-lift flex w-full items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-semibold shadow-soft"
    >
      <Info className="h-4 w-4 shrink-0 text-primary" />
      Briefing zur Aufgabe lesen
    </button>
  );

  const briefingModal = briefing && (
    <Modal title={title} onClose={() => setBriefing(false)}>
      <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
      <BigButton variant="ghost" onClick={() => setBriefing(false)}>
        Verstanden
      </BigButton>
    </Modal>
  );

  const tilesBlock = (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <SectionLabel>
          {single
            ? "Eure Rätselkachel"
            : online
              ? `${tiles.length} Fragmente — jede Rolle sieht ihres`
              : `${tiles.length} Rätselkacheln — wischen`}
        </SectionLabel>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          Antippen zum Öffnen
        </span>
      </div>

      <div
        className={
          single
            ? "mt-3 flex justify-center"
            : online
              ? "mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5"
              : "mt-3 -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2"
        }
      >
        {tiles.map((t) => {
          const mine = !online || !t.owner || t.owner === me.role;
          const ownerName = g.roster.find((m) => m.role === t.owner)?.name;
          return (
            <button
              key={t.id}
              type="button"
              disabled={!mine}
              onClick={() => setOpenTile(t)}
              className={`tap-lift relative aspect-square shrink-0 snap-center overflow-hidden rounded-3xl shadow-tile ${
                online ? "w-full" : "w-40"
              } ${mine ? "" : "opacity-60"}`}
            >
              <img
                src={t.bg}
                alt=""
                loading="lazy"
                width={640}
                height={640}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-ink/45" />
              <span className="absolute inset-x-0 top-3 text-3xl font-extrabold text-ink-foreground">
                {t.badge}
              </span>
              <span className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 px-2 text-ink-foreground">
                {mine ? mediaMeta[t.media].icon : <Lock className="h-6 w-6" />}
                <span className="truncate text-sm font-semibold">{t.label}</span>
                {online && t.owner && (
                  <span className="truncate text-[11px] font-medium opacity-85">
                    {mine ? "dein Fragment" : `bei ${ownerName ?? roleInfo[t.owner].label}`}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const taskBlock = (
    <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <SectionLabel>Eure Aufgabe</SectionLabel>
      <p className="text-lg font-semibold">{question}</p>
      <input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Antwort eintragen…"
        className={`w-full rounded-2xl border-2 bg-background px-4 py-5 text-center text-2xl font-bold tracking-widest outline-none ${
          wrong ? "border-destructive" : "border-input focus:border-ring"
        }`}
      />
      {online && g.draftBy && g.draftAnswer && (
        <p className="text-center text-sm text-muted-foreground">
          {g.draftBy} tippt gerade — alle sehen denselben Entwurf.
        </p>
      )}
      {wrong && (
        <p className="animate-pop-in text-center text-base font-semibold text-destructive">
          Noch nicht richtig — probiert es weiter!
        </p>
      )}
      <BigButton onClick={check} disabled={!value.trim()}>
        Antwort prüfen
      </BigButton>
      {g.solutionRevealed && (
        <p className="text-center text-sm text-muted-foreground">
          Lösung angezeigt — diese Aufgabe wird mit 0 Punkten gewertet.
        </p>
      )}
    </div>
  );

  const successOverlay = solved && (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/80 px-6 text-center backdrop-blur-sm">
      <span className="animate-key-turn flex h-24 w-24 items-center justify-center rounded-full bg-success text-success-foreground shadow-lift">
        <PartyPopper className="h-12 w-12" />
      </span>
      <h2 className="animate-pop-in text-3xl font-bold text-ink-foreground">
        {online ? "Mission gelöst!" : indoor ? "Station gelöst!" : "Level gelöst!"}
      </h2>
      <p className="text-lg text-ink-foreground/80">
        {g.solutionRevealed ? "+0 Punkte" : "+300 Punkte"}
      </p>
      <div className="animate-rise-in w-full max-w-sm rounded-3xl bg-card p-5">
        <SectionLabel>Notiert euch diesen Hinweis</SectionLabel>
        <p className="mt-2 text-xl font-bold">„Der Schlüssel liegt unter der dritten Stufe“</p>
      </div>
      <div className="w-full max-w-sm">
        <BigButton
          variant="accent"
          onClick={() => {
            const mine = me.role === bonusTask.forRole;
            setGame({
              nearWaypoint: false,
              quizAnswered: false,
              solutionRevealed: false,
              ...(indoor || online
                ? {
                    doneStations: g.doneStations.includes(g.activeStation)
                      ? g.doneStations
                      : [...g.doneStations, g.activeStation],
                  }
                : {}),
              ...(online ? { ready: [], draftAnswer: "", draftBy: null, board: [] } : {}),
              ...(mine
                ? {}
                : {
                    ...(indoor || online
                      ? {}
                      : { currentWaypoint: Math.min(g.currentWaypoint + 1, g.totalWaypoints) }),
                    openedHints: [],
                    quizCorrect: null,
                  }),
            });
            navigate({ to: mine ? "/bonus" : hub });
          }}
        >
          Weiter
        </BigButton>
      </div>
    </div>
  );

  if (online) {
    return (
      <StageShell>
        <div className="overflow-hidden xl:rounded-4xl">{heroBlock}</div>
        <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-10 pt-5 sm:px-6">
          <TeamToolbar />
          {briefingBlock}
          {tilesBlock}
          {taskBlock}
        </div>
        {openTile && <TileSheet tile={openTile} onClose={() => setOpenTile(null)} />}
        {briefingModal}
        {successOverlay}
      </StageShell>
    );
  }

  return (
    <PhoneShell>
      <div className="min-h-screen pb-8 sm:min-h-[calc(100vh-4rem)]">
        {heroBlock}
        <div className="space-y-5 px-5 pt-5">
          <TeamBar compact />
          {briefingBlock}
          {tilesBlock}
          {taskBlock}
        </div>
      </div>

      {openTile && <TileSheet tile={openTile} onClose={() => setOpenTile(null)} />}
      {briefingModal}
      {successOverlay}
    </PhoneShell>
  );
}

function TileSheet({ tile, onClose }: { tile: Tile & { owner?: string }; onClose: () => void }) {
  const g = useGame();
  const me = useMe();
  const online = g.mode === "online";
  const [hintOpen, setHintOpen] = useState(g.openedHints.includes(tile.id));
  const shared = g.board.some((b) => b.title === tile.label);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center">
      <div className="animate-rise-in max-h-[92%] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 sm:rounded-3xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <SectionLabel>
              Kachel {tile.badge} · {mediaMeta[tile.media].label}
            </SectionLabel>
            <h2 className="truncate text-xl font-bold">{tile.label}</h2>
          </div>
          <button
            type="button"
            aria-label="Kachel schließen"
            onClick={onClose}
            className="tap-lift flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-3xl">
          <img
            src={tile.bg}
            alt=""
            loading="lazy"
            width={640}
            height={640}
            className="h-52 w-full object-cover sm:h-64"
          />
          <span className="absolute inset-0 bg-ink/55" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-ink-foreground">
            {mediaMeta[tile.media].icon}
            <span className="text-base font-semibold">{tile.body}</span>
          </span>
        </div>

        {online &&
          (shared ? (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-accent/20 py-4 text-base font-semibold">
              <Check className="h-5 w-5" /> Auf dem Team-Board — alle sehen es
            </p>
          ) : (
            <BigButton
              variant="accent"
              icon={<Share2 className="h-5 w-5" />}
              onClick={() =>
                shareToBoard({ by: me.name, role: me.role, title: tile.label, text: tile.body })
              }
            >
              Mit Team teilen
            </BigButton>
          ))}

        {hintOpen ? (
          <div className="animate-pop-in rounded-2xl bg-accent/20 p-4">
            <SectionLabel>Tipp</SectionLabel>
            <p className="mt-1 text-base font-semibold">{tile.hint}</p>
          </div>
        ) : (
          <BigButton
            variant="outline"
            icon={<Lightbulb className="h-5 w-5 text-accent" />}
            onClick={() => {
              setHintOpen(true);
              if (online) pushFeed(me.name, `kauft einen Tipp für „${tile.label}“`, "info");
              setGame({
                openedHints: [...g.openedHints, tile.id],
                points: g.points - tile.hintCost,
              });
            }}
          >
            Tipp kaufen (−{tile.hintCost} Punkte)
          </BigButton>
        )}

        {g.solutionRevealed ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-4 text-base font-semibold">
            <Check className="h-5 w-5 text-success" /> Lösung: {level.solution}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setGame({ solutionRevealed: true })}
            className="w-full py-2 text-base font-semibold text-muted-foreground underline"
          >
            Wir wissen nicht weiter — Lösung anzeigen (0 Punkte)
          </button>
        )}
      </div>
    </div>
  );
}
