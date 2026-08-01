import { waypoints } from "@/lib/game-data";
import { useGame } from "@/lib/game-store";
import { Check, Lock, MapPin } from "lucide-react";

export function GameMap() {
  const g = useGame();
  const visible =
    g.mapMode === "all" ? waypoints : waypoints.filter((w) => w.id === g.currentWaypoint);

  return (
    <div className="absolute inset-0 overflow-hidden bg-map">
      {/* Straßen / Blöcke – Platzhalter für die Google-Map-Kachel */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect x="0" y="0" width="100" height="100" fill="var(--map)" />
        <rect x="0" y="0" width="34" height="22" fill="var(--map-water)" opacity="0.7" />
        <rect x="66" y="70" width="34" height="30" fill="var(--map-park)" opacity="0.8" />
        {[10, 30, 50, 70, 90].map((y) => (
          <rect key={`h${y}`} x="-5" y={y} width="110" height="4.5" fill="var(--map-road)" />
        ))}
        {[15, 38, 60, 84].map((x) => (
          <rect key={`v${x}`} x={x} y="-5" width="4" height="110" fill="var(--map-road)" />
        ))}
        <path d="M0 66 L40 44 L72 52 L100 30" stroke="var(--map-road)" strokeWidth="5" fill="none" />
        {[
          [20, 14],
          [44, 34],
          [66, 16],
          [24, 56],
          [70, 76],
          [46, 78],
        ].map(([x, y]) => (
          <rect
            key={`b${x}-${y}`}
            x={x}
            y={y}
            width="11"
            height="8"
            rx="1"
            fill="var(--map-block)"
          />
        ))}
      </svg>

      {/* Laufweg zum aktiven Wegpunkt */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M46 72 C50 62, 52 50, 58 40"
          stroke="var(--primary)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          fill="none"
          opacity="0.65"
        />
      </svg>

      {/* Spielerposition */}
      <div className="absolute" style={{ left: "46%", top: "72%", transform: "translate(-50%,-50%)" }}>
        <span className="absolute inset-0 -z-10 rounded-full bg-primary/40 pulse-ring" />
        <span className="block h-5 w-5 rounded-full border-4 border-card bg-primary shadow-soft" />
      </div>

      {visible.map((w) => (
        <button
          key={w.id}
          type="button"
          className="tap-lift absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
          style={{ left: `${w.x}%`, top: `${w.y}%` }}
        >
          {w.status === "active" && (
            <span className="absolute bottom-1 h-14 w-14 rounded-full bg-accent/50 pulse-ring" />
          )}
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-card shadow-lift ${
              w.status === "active"
                ? "bg-accent text-accent-foreground"
                : w.status === "done"
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {w.status === "done" ? (
              <Check className="h-6 w-6" strokeWidth={3} />
            ) : w.status === "locked" ? (
              <Lock className="h-5 w-5" />
            ) : (
              <MapPin className="h-6 w-6" strokeWidth={2.5} />
            )}
          </span>
          {(w.status === "active" || g.mapMode === "all") && (
            <span className="mt-1 rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold shadow-soft">
              {w.id}. {w.name}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
