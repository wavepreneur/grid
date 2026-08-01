import tile1 from "@/assets/tile-1.jpg";
import tile2 from "@/assets/tile-2.jpg";
import tile3 from "@/assets/tile-3.jpg";
import tile4 from "@/assets/tile-4.jpg";
import tile5 from "@/assets/tile-5.jpg";
import levelHero from "@/assets/level-hero.jpg";
import indoorHero from "@/assets/indoor-hero.jpg";
import onlineHero from "@/assets/online-hero.jpg";
import type { PlayerRole } from "@/lib/game-store";

export type MediaType = "image" | "text" | "video" | "gif" | "audio" | "iframe";

export type Tile = {
  id: string;
  label: string;
  badge: string;
  media: MediaType;
  bg: string;
  hint: string;
  hintCost: number;
  body: string;
};

export const levelHeroImage = levelHero;

export const level = {
  number: 3,
  title: "Das Geheimnis des Marktbrunnens",
  description:
    "Vor euch plätschert der Brunnen seit 1687. Drei Zeugen erzählen seine Geschichte – hört, seht und lest genau hin. Erst gemeinsam ergeben sie die Zahl, die das Schloss öffnet.",
  question: "Welche vierstellige Zahl ist im Brunnen verborgen?",
  answer: "1687",
  solution: "1687",
  tiles: [
    {
      id: "t1",
      label: "Die Inschrift",
      badge: "1",
      media: "image" as MediaType,
      bg: tile1,
      hint: "Schaut auf die römischen Ziffern über dem Wasserspeier.",
      hintCost: 50,
      body: "Ein Foto der Steintafel: MDCLXXXVII – darunter ein eingemeißelter Löwenkopf.",
    },
    {
      id: "t2",
      label: "Der Brief",
      badge: "2",
      media: "text" as MediaType,
      bg: tile2,
      hint: "Der Brunnenmeister nennt sein Alter, nicht das Jahr.",
      hintCost: 50,
      body: '"Als der Brunnen gebaut ward, zählte ich 40 Lenze. Geboren bin ich im Jahre 1647." – Brunnenmeister Anselm',
    },
    {
      id: "t3",
      label: "Die Stimme",
      badge: "3",
      media: "audio" as MediaType,
      bg: tile3,
      hint: "Zählt die Glockenschläge im Hintergrund.",
      hintCost: 75,
      body: "Audioaufnahme (0:42): Eine alte Stimme zählt die Glockenschläge des Rathausturms.",
    },
    {
      id: "t4",
      label: "360°-Blick",
      badge: "4",
      media: "iframe" as MediaType,
      bg: tile4,
      hint: "Dreht euch im Panorama nach Norden zum Portal.",
      hintCost: 75,
      body: "Eingebettetes 360°-Panorama des Platzes – schwenkbar per Finger.",
    },
    {
      id: "t5",
      label: "Puzzle",
      badge: "5",
      media: "iframe" as MediaType,
      bg: tile5,
      hint: "Die Ecken zuerst legen.",
      hintCost: 100,
      body: "Mini-Game: Schiebepuzzle mit dem Wappen der Stadt (iFrame).",
    },
  ] as Tile[],
};

export const arrivalQuiz = {
  question: "Was steht in der Mitte des Platzes, vor dem ihr gerade steht?",
  options: [
    "Ein steinerner Brunnen",
    "Eine Kirchenglocke",
    "Ein Reiterdenkmal",
    "Ein alter Marktstand",
  ],
  correctIndex: 0,
};

export const bonusTask = {
  forRole: "gamma" as const,
  title: "Bonusaufgabe für Gamma",
  intro:
    "Nur Gamma darf diese Aufgabe sehen. Gebt das Handy an Gamma weiter – die anderen dürfen nicht mitlesen!",
  question: "Frage die Gruppe: Wie viele Fenster hat das Rathaus im ersten Stock?",
  options: ["8", "11", "14", "17"],
  correctIndex: 2,
  reward: 150,
};

export const waypoints = [
  { id: 1, name: "Altes Tor", x: 22, y: 78, status: "done" as const },
  { id: 2, name: "Gasse der Gilden", x: 40, y: 55, status: "done" as const },
  { id: 3, name: "Marktbrunnen", x: 58, y: 40, status: "active" as const },
  { id: 4, name: "Rathaustreppe", x: 74, y: 58, status: "locked" as const },
  { id: 5, name: "Uferpromenade", x: 82, y: 26, status: "locked" as const },
  { id: 6, name: "Turmwächter", x: 34, y: 24, status: "locked" as const },
  { id: 7, name: "Finale", x: 62, y: 14, status: "locked" as const },
];

/* ---------- Indoor-Modus (ohne GPS) ---------- */

export type StationKind = "puzzle" | "search" | "logic" | "team" | "finale";

export type Station = {
  id: number;
  name: string;
  place: string;
  kind: StationKind;
  minutes: number;
  points: number;
  /** Stationscode, der am Objekt/Tisch klebt — ersetzt den Geofence */
  code: string;
};

export const indoorGame = {
  title: "Museum Escape: Der verschwundene Kodex",
  place: "Stadtmuseum · 1. Etage",
  /** frei = Stationen in beliebiger Reihenfolge, linear = nacheinander */
  order: "free" as "free" | "linear",
};

export const stations: Station[] = [
  { id: 1, name: "Die Vitrine", place: "Saal A · Tisch 1", kind: "search", minutes: 8, points: 300, code: "A1" },
  { id: 2, name: "Der Kartentisch", place: "Saal A · Fenster", kind: "logic", minutes: 10, points: 300, code: "A2" },
  { id: 3, name: "Das Archivregal", place: "Saal B · Regal 4", kind: "puzzle", minutes: 12, points: 300, code: "B4" },
  { id: 4, name: "Die Uhrenwand", place: "Flur · gegenüber Treppe", kind: "logic", minutes: 9, points: 300, code: "C1" },
  { id: 5, name: "Der Lesesaal", place: "Saal C · Leseecke", kind: "team", minutes: 11, points: 300, code: "C3" },
  { id: 6, name: "Die Kodex-Kammer", place: "Saal C · Tür rechts", kind: "finale", minutes: 15, points: 500, code: "C9" },
];

export const stationKindInfo: Record<StationKind, { label: string }> = {
  puzzle: { label: "Puzzle" },
  search: { label: "Suchen" },
  logic: { label: "Logik" },
  team: { label: "Teamwork" },
  finale: { label: "Finale" },
};

/** Indoor-Variante des Umgebungsquiz: bezieht sich auf das Objekt an der Station. */
export const stationQuiz = {
  question: "Welches Objekt liegt in der Vitrine direkt vor euch?",
  options: ["Ein Siegelring", "Eine Federzeichnung", "Ein Tonkrug", "Ein Schlüsselbund"],
  correctIndex: 1,
};

export const indoorHeroImage = indoorHero;

/** Indoor-Aufgabe der Station „Das Archivregal“ — gleiche Kachel-Mechanik, andere Story. */
export const indoorLevel = {
  title: "Der verschwundene Kodex",
  description:
    "Im Archivregal fehlt ein Buch. Karteikarte, Tonaufnahme und das Regalschema verraten euch gemeinsam die Signatur des verschwundenen Kodex.",
  question: "Wie lautet die vierstellige Signatur des fehlenden Kodex?",
};

/* ---------- Online-Modus (alle sitzen an ihrem eigenen Gerät) ---------- */

export const onlineHeroImage = onlineHero;

export const onlineGame = {
  title: "Remote Escape: Das Archiv 2099",
  subtitle: "Gemeinsam spielen — jeder an seinem eigenen Bildschirm",
  /** Missionen laufen synchron: alle sind zeitgleich in derselben Mission. */
  sync: "gemeinsam" as const,
};

export type MissionKind = "recherche" | "logik" | "beobachtung" | "team" | "finale";

export type Mission = {
  id: number;
  name: string;
  teaser: string;
  kind: MissionKind;
  minutes: number;
  points: number;
  /** Jede Mission verteilt Material auf die Rollen — nur zusammen lösbar. */
  split: string;
};

export const missions: Mission[] = [
  {
    id: 1,
    name: "Der Anruf um 3 Uhr",
    teaser: "Eine Sprachnachricht, drei Stimmen, ein Widerspruch.",
    kind: "beobachtung",
    minutes: 8,
    points: 300,
    split: "Alpha hört, Beta liest das Protokoll, Gamma sieht die Uhrzeit",
  },
  {
    id: 2,
    name: "Die Serverhalle",
    teaser: "Ein Grundriss, der nur zu dritt vollständig wird.",
    kind: "logik",
    minutes: 10,
    points: 300,
    split: "Jede Rolle sieht ein Viertel des Plans",
  },
  {
    id: 3,
    name: "Das Archiv 2099",
    teaser: "Drei Dokumentfragmente ergeben eine Signatur.",
    kind: "recherche",
    minutes: 12,
    points: 300,
    split: "Alpha: Karteikarte · Beta: Tonband · Gamma: Regalschema",
  },
  {
    id: 4,
    name: "Die stille Kamera",
    teaser: "Vier Standbilder, ein fehlender Moment.",
    kind: "beobachtung",
    minutes: 9,
    points: 300,
    split: "Bilder rotieren zwischen den Geräten",
  },
  {
    id: 5,
    name: "Der Codewechsel",
    teaser: "Nur wenn alle gleichzeitig bereit sind, öffnet sich die Tür.",
    kind: "team",
    minutes: 11,
    points: 400,
    split: "Alle drei müssen gleichzeitig „bereit“ melden",
  },
  {
    id: 6,
    name: "Finale: Das Backup",
    teaser: "Die letzte Signatur entscheidet.",
    kind: "finale",
    minutes: 15,
    points: 500,
    split: "Team-Board entscheidet",
  },
];

export const missionKindInfo: Record<MissionKind, { label: string }> = {
  recherche: { label: "Recherche" },
  logik: { label: "Logik" },
  beobachtung: { label: "Beobachtung" },
  team: { label: "Teamwork" },
  finale: { label: "Finale" },
};

/** Online-Variante des Einstiegsquiz — bezieht sich auf das Intro-Video. */
export const onlineQuiz = {
  question: "Was war im Intro-Clip auf dem Bildschirm im Hintergrund zu sehen?",
  options: ["Ein Sternenhimmel", "Eine Regalreihe", "Ein Aktenschrank", "Eine leere Wand"],
  correctIndex: 1,
};

export const onlineLevel = {
  title: "Das Archiv 2099",
  description:
    "Ihr sitzt an drei verschiedenen Orten — und jede und jeder von euch sieht ein anderes Fragment. Öffnet eure eigene Kachel, teilt den Fund mit einem Tipp aufs Team-Board und setzt die Signatur gemeinsam zusammen. Ein Extra-Chat ist nicht nötig.",
  question: "Wie lautet die vierstellige Signatur des Backups?",
};

/** Kacheln mit Besitzer: nur diese Rolle sieht den Inhalt, teilen geht per Board. */
export type OnlineTile = Tile & { owner?: PlayerRole };

export const onlineTiles: OnlineTile[] = [
  {
    id: "o1",
    label: "Karteikarte",
    badge: "1",
    media: "image",
    bg: tile1,
    owner: "alpha",
    hint: "Die Jahreszahl steht klein unten rechts.",
    hintCost: 50,
    body: "Scan einer Karteikarte: „Bestand 16—, Reihe VII, Rückgabe offen.“",
  },
  {
    id: "o2",
    label: "Tonband",
    badge: "2",
    media: "audio",
    bg: tile3,
    owner: "beta",
    hint: "Die Stimme nennt die dritte Ziffer zweimal.",
    hintCost: 50,
    body: "Audio (0:38): „…acht, dann nochmal acht, danach war die Aufnahme zu Ende.“",
  },
  {
    id: "o3",
    label: "Regalschema",
    badge: "3",
    media: "iframe",
    bg: tile4,
    owner: "gamma",
    hint: "Zählt die belegten Fächer in der obersten Reihe.",
    hintCost: 75,
    body: "Interaktives Regalschema (iFrame): sieben Fächer, das letzte trägt eine 7.",
  },
  {
    id: "o4",
    label: "Aktenkopf",
    badge: "4",
    media: "text",
    bg: tile2,
    hint: "Für alle sichtbar: der Kopf nennt das Jahrhundert.",
    hintCost: 25,
    body: "„Archivakte, 17. Jahrhundert — Signatur vierstellig, beginnend mit 1.“",
  },
  {
    id: "o5",
    label: "Live-Puzzle",
    badge: "5",
    media: "iframe",
    bg: tile5,
    hint: "Ecken zuerst — jeder zieht an seinem Gerät.",
    hintCost: 100,
    body: "Gemeinsames Schiebepuzzle (iFrame): alle drei Geräte bewegen dieselben Teile.",
  },
];
