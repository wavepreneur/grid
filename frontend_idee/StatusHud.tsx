import { Clock, Flag, Star } from "lucide-react";
import { formatTime, useGame } from "@/lib/game-store";

export function StatusHud() {
  const g = useGame();
  const indoor = g.mode === "indoor";
  const online = g.mode === "online";
  const remaining =
    indoor || online
      ? g.totalWaypoints - g.doneStations.length
      : g.totalWaypoints - (g.currentWaypoint - 1);
  const label = indoor ? "Stationen übrig" : online ? "Missionen übrig" : "Level übrig";

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card p-2 shadow-soft">
      <Stat icon={<Flag className="h-5 w-5" />} value={`${remaining}`} label={label} />
      <Stat icon={<Clock className="h-5 w-5" />} value={formatTime(g.secondsLeft)} label="Zeit" />
      <Stat icon={<Star className="h-5 w-5" />} value={`${g.points}`} label="Punkte" />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl bg-secondary px-2 py-2.5 sm:flex-row sm:justify-center sm:gap-2">
      <span className="text-primary">{icon}</span>
      <span className="truncate text-lg font-bold leading-none text-foreground">{value}</span>
      <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
