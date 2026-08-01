import { useSyncExternalStore } from "react";

export type PlayerRole = "alpha" | "beta" | "gamma";

export type TeamMember = {
  id: string;
  name: string;
  role: PlayerRole;
  online: boolean;
  /** Online-Modus: womit sitzt die Person am Spiel? */
  device?: "desktop" | "tablet" | "phone";
};

export const roleInfo: Record<PlayerRole, { label: string; task: string }> = {
  alpha: { label: "Alpha", task: "Team-Lead · führt das Team" },
  beta: { label: "Beta", task: "Rätselblatt & Notizen" },
  gamma: { label: "Gamma", task: "Bonusaufgaben" },
};

export type GameMode = "outdoor" | "indoor" | "online";

/** Online-Modus: Eintrag auf dem gemeinsamen Team-Board. */
export type BoardEntry = {
  id: string;
  by: string;
  role: PlayerRole;
  title: string;
  text: string;
};

/** Online-Modus: Live-Verlauf, damit niemand nebenbei chatten muss. */
export type FeedItem = {
  id: string;
  who: string;
  text: string;
  tone: "info" | "good" | "share";
};

export type GameState = {
  mode: GameMode;
  players: number;
  teamName: string;
  roster: TeamMember[];
  meId: string;
  role: PlayerRole;
  points: number;
  secondsLeft: number;
  currentWaypoint: number;
  totalWaypoints: number;
  mapMode: "single" | "all";
  /** Indoor/Online: bereits abgeschlossene Stationen bzw. Missionen (IDs) */
  doneStations: number[];
  /** Indoor/Online: gerade geöffnete Station bzw. Mission */
  activeStation: number;
  nearWaypoint: boolean;
  quizAnswered: boolean;
  quizCorrect: boolean | null;
  openedHints: string[];
  solutionRevealed: boolean;
  clues: string[];
  /** Online: gemeinsam geteilte Fundstücke */
  board: BoardEntry[];
  /** Online: Live-Verlauf des Teams */
  feed: FeedItem[];
  /** Online: gemeinsamer Antwortentwurf, den alle sehen */
  draftAnswer: string;
  draftBy: string | null;
  /** Online: wer hat sich für „bereit“ gemeldet? */
  ready: string[];
};

const roster: TeamMember[] = [
  { id: "p1", name: "Mira", role: "alpha", online: true, device: "desktop" },
  { id: "p2", name: "Jonas", role: "beta", online: true, device: "tablet" },
  { id: "p3", name: "Elif", role: "gamma", online: true, device: "phone" },
];

const initial: GameState = {
  mode: "outdoor",
  players: 3,
  teamName: "Die Brunnenjäger",
  roster,
  meId: "p1",
  role: "alpha",
  points: 850,
  secondsLeft: 62 * 60 + 14,
  currentWaypoint: 3,
  totalWaypoints: 7,
  mapMode: "single",
  doneStations: [1, 2],
  activeStation: 3,
  nearWaypoint: false,
  quizAnswered: false,
  quizCorrect: null,
  openedHints: [],
  solutionRevealed: false,
  clues: ["Der Löwe blickt nach Westen", "Zahl am Brunnen: 14"],
  board: [],
  feed: [
    { id: "f1", who: "Jonas", text: "ist dem Team beigetreten (Tablet)", tone: "info" },
    { id: "f2", who: "Elif", text: "ist dem Team beigetreten (Smartphone)", tone: "info" },
  ],
  draftAnswer: "",
  draftBy: null,
  ready: [],
};


let state: GameState = { ...initial };
const listeners = new Set<() => void>();

export function setGame(patch: Partial<GameState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function resetGame() {
  state = { ...initial };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return state;
}

export function useGame() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useMe() {
  const g = useGame();
  return g.roster.find((m) => m.id === g.meId) ?? g.roster[0]!;
}

/** Wohin führt "zurück"? Outdoor = Karte, Indoor = Stations-Hub, Online = Missions-Deck. */
export function hubPath(mode: GameMode) {
  if (mode === "indoor") return "/indoor";
  if (mode === "online") return "/online";
  return "/outdoor";
}

export function useHub() {
  const g = useGame();
  return {
    path: hubPath(g.mode),
    label: g.mode === "indoor" ? "Stationen" : g.mode === "online" ? "Missionen" : "Karte",
    unit: g.mode === "indoor" ? "Station" : g.mode === "online" ? "Mission" : "Wegpunkt",
  } as const;
}

export function switchDevice(memberId: string) {
  const member = state.roster.find((m) => m.id === memberId);
  if (!member) return;
  setGame({ meId: member.id, role: member.role });
}

/* ---------- Online-Modus: gemeinsames Spielen ohne Extra-Chat ---------- */

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function pushFeed(who: string, text: string, tone: FeedItem["tone"] = "info") {
  setGame({ feed: [{ id: uid(), who, text, tone }, ...state.feed].slice(0, 20) });
}

/** Ein Fundstück für alle sichtbar aufs Team-Board legen. */
export function shareToBoard(entry: Omit<BoardEntry, "id">) {
  if (state.board.some((b) => b.title === entry.title && b.by === entry.by)) return;
  setGame({ board: [...state.board, { ...entry, id: uid() }] });
  pushFeed(entry.by, `teilt „${entry.title}“ mit dem Team`, "share");
}

/** Antwortentwurf, den alle Geräte live sehen. */
export function setDraft(text: string, by: string) {
  setGame({ draftAnswer: text, draftBy: by });
}

export function toggleReady(memberId: string, name: string) {
  const isReady = state.ready.includes(memberId);
  setGame({
    ready: isReady ? state.ready.filter((r) => r !== memberId) : [...state.ready, memberId],
  });
  pushFeed(name, isReady ? "ist doch noch nicht bereit" : "ist bereit", isReady ? "info" : "good");
}
