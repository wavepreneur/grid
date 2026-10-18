/** Small, content-free look-alikes of the real play UI for marketing windows. */

export function Tile({
  label,
  text,
  hint,
  locked = false,
  mine = false,
}: {
  label: string;
  text?: string;
  hint?: "offer" | "unlocked";
  locked?: boolean;
  mine?: boolean;
}) {
  return (
    <div className={`ts-tile${locked ? " is-locked" : ""}${mine ? " is-mine" : ""}`}>
      <span className="ts-tile-label">{label}</span>
      {locked ? (
        <span className="ts-tile-text">🔒 Only another role sees this</span>
      ) : text ? (
        <span className="ts-tile-text">{text}</span>
      ) : null}
      {hint === "offer" ? <span className="ts-tile-hint">💡 Hint · 20 P</span> : null}
      {hint === "unlocked" ? <span className="ts-tile-hint is-on">💡 Unlocked</span> : null}
    </div>
  );
}

export function CodeLock({
  digits,
  state,
  small = false,
}: {
  digits: string;
  state: "idle" | "wrong" | "right";
  small?: boolean;
}) {
  return (
    <div
      className={`ts-lock is-${state}${small ? " is-small" : ""}${state === "wrong" ? " ts-shake" : ""}`}
      key={state}
    >
      <span className="ts-lock-icon" aria-hidden>
        {state === "right" ? "🔓" : "🔒"}
      </span>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="ts-lock-digit">
          {digits[i] ?? ""}
        </span>
      ))}
    </div>
  );
}

export function PointsDecay({ points, max }: { points: number; max: number }) {
  return (
    <div className="ts-decay">
      <span className="ts-pill is-accent">
        Still +{points} P{points !== max ? <s>+{max}</s> : null}
      </span>
      <span className="ts-decay-track" aria-hidden>
        <i style={{ width: `${(points / max) * 100}%` }} />
      </span>
    </div>
  );
}
