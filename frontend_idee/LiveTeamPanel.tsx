import { useState, type ReactNode } from "react";
import { Laptop, Monitor, Radio, Share2, Smartphone, Tablet, Users, X } from "lucide-react";
import { roleInfo, switchDevice, useGame, useMe, type TeamMember } from "@/lib/game-store";

const deviceIcon: Record<string, ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  phone: <Smartphone className="h-4 w-4" />,
};

function deviceLabel(m: TeamMember) {
  if (m.device === "desktop") return "am Laptop";
  if (m.device === "tablet") return "am Tablet";
  return "am Handy";
}

/** Ruhiges, mittiges Modal — alles Nebensächliche lebt hier drin, nicht auf dem Screen. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise-in max-h-[88vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 shadow-lift sm:rounded-3xl sm:pb-5"
      >
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

function TeamRoster({ onPick }: { onPick: () => void }) {
  const g = useGame();
  return (
    <>
      <ul className="space-y-2">
        {g.roster.map((m) => {
          const isMe = m.id === g.meId;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  switchDevice(m.id);
                  onPick();
                }}
                className={`tap-lift grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl px-3 py-3 text-left ${
                  isMe ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${
                    isMe ? "bg-primary-foreground/20" : "bg-card"
                  }`}
                >
                  {m.name.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold">
                    {m.name}
                    {isMe && " (du)"}
                  </span>
                  <span
                    className={`block truncate text-sm ${isMe ? "opacity-80" : "text-muted-foreground"}`}
                  >
                    {roleInfo[m.role].label} · {deviceLabel(m)}
                  </span>
                </span>
                <span className={`shrink-0 ${isMe ? "" : "text-muted-foreground"}`}>
                  {deviceIcon[m.device ?? "phone"]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs font-medium text-muted-foreground">
        Demo: Auf ein Teammitglied tippen, um dessen Gerät zu simulieren.
      </p>
    </>
  );
}

function LiveFeed() {
  return (
    <ul className="space-y-2">
      {useGame().feed.slice(0, 10).map((f) => (
        <li
          key={f.id}
          className={`rounded-2xl px-4 py-3 text-base ${
            f.tone === "good" ? "bg-success/15" : f.tone === "share" ? "bg-accent/15" : "bg-secondary"
          }`}
        >
          <span className="font-bold">{f.who}</span>{" "}
          <span className="text-muted-foreground">{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

function TeamBoard() {
  const g = useGame();
  if (g.board.length === 0) {
    return (
      <p className="rounded-2xl bg-secondary px-4 py-4 text-base text-muted-foreground">
        Noch nichts geteilt. Wer etwas findet, tippt in der Kachel auf „Mit Team teilen“ — dann
        sehen es hier alle.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {g.board.map((b) => (
        <li key={b.id} className="rounded-2xl bg-secondary px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {b.by} · {roleInfo[b.role].label}
          </p>
          <p className="text-base font-bold">{b.title}</p>
          <p className="text-base text-muted-foreground">{b.text}</p>
        </li>
      ))}
    </ul>
  );
}

function ToolButton({
  icon,
  label,
  count,
  onClick,
  ariaLabel,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="tap-lift flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-card px-3 py-3 text-sm font-semibold shadow-soft"
    >
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Eine ruhige Leiste mit drei Buttons. Team, Live-Verlauf und Board
 * liegen dahinter in Modalen — der Screen selbst bleibt der Aufgabe vorbehalten.
 */
export function TeamToolbar() {
  const g = useGame();
  const me = useMe();
  const [open, setOpen] = useState<null | "team" | "feed" | "board">(null);

  return (
    <>
      <div className="flex gap-2">
        <ToolButton
          icon={<Users className="h-4 w-4" />}
          ariaLabel="Team anzeigen"
          label={`${me.name} · ${roleInfo[me.role].label}`}
          onClick={() => setOpen("team")}
        />
        <ToolButton
          icon={<Radio className="h-4 w-4" />}
          label="Live"
          count={g.feed.length}
          onClick={() => setOpen("feed")}
        />
        <ToolButton
          icon={<Share2 className="h-4 w-4" />}
          label="Board"
          count={g.board.length}
          onClick={() => setOpen("board")}
        />
      </div>

      {open === "team" && (
        <Modal title={g.teamName} onClose={() => setOpen(null)}>
          <TeamRoster onPick={() => setOpen(null)} />
        </Modal>
      )}
      {open === "feed" && (
        <Modal title="Live im Team" onClose={() => setOpen(null)}>
          <LiveFeed />
          <p className="rounded-2xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground">
            Alles Wichtige landet automatisch hier — ihr müsst nebenbei nicht chatten.
          </p>
        </Modal>
      )}
      {open === "board" && (
        <Modal title="Team-Board" onClose={() => setOpen(null)}>
          <TeamBoard />
        </Modal>
      )}
    </>
  );
}

export function DeviceHintBar() {
  return (
    <p className="flex items-center justify-center gap-2 text-center text-xs font-medium text-muted-foreground">
      <Laptop className="h-4 w-4 shrink-0 text-primary" />
      Läuft auf Laptop, Tablet und Handy — Hoch- wie Querformat.
    </p>
  );
}
