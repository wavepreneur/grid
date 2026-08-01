import { Users } from "lucide-react";
import { roleInfo, switchDevice, useGame, useMe } from "@/lib/game-store";

/**
 * Zeigt Teamname und die eigene Rolle. Jedes Gerät weiss so sofort,
 * wer es im Team ist — nichts muss weitergereicht werden.
 * Der kleine Umschalter ist nur für die Demo (simuliert die anderen Handys).
 */
export function TeamBar({ compact = false }: { compact?: boolean }) {
  const g = useGame();
  const me = useMe();

  return (
    <div className="rounded-2xl bg-secondary px-3 py-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-bold">{g.teamName}</span>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          Du: {me.name} · {roleInfo[me.role].label}
        </span>
      </div>

      {!compact && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {g.roster.map((m) => {
            const isMe = m.id === g.meId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => switchDevice(m.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isMe ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${m.online ? "bg-success" : "bg-muted-foreground"}`}
                />
                {m.name}
                <span className="opacity-70">{roleInfo[m.role].label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
