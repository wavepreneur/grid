"use client";

import { EXAMPLE, EXAMPLE_SLOTS, EXAMPLE_TEAMS } from "@/components/marketing/tells-example-data";
import { useStoryTimeline } from "@/components/marketing/use-story-timeline";
import { CodeLock, PointsDecay, Tile } from "@/components/marketing/tells-play-bits";

/** 0 mission · 1 wrong code · 2 hint + vault open · 3 tell · 4 report (end state) */
const DURATIONS = [2200, 2200, 2800, 3000] as const;

/** Missions done per team (of 6) at each step. */
const PROGRESS: Record<string, readonly number[]> = {
  Falcon: [3, 3, 4, 4, 6],
  Lynx: [4, 4, 4, 5, 6],
  Orca: [3, 3, 3, 3, 6],
  Heron: [2, 3, 3, 3, 6],
  Bison: [3, 3, 3, 3, 6],
};

const HINTS: readonly (readonly string[])[] = [
  [],
  ["Falcon"],
  ["Falcon", "Orca", "Heron"],
  ["Falcon", "Orca", "Heron"],
  [],
];

const POINTS = [120, 104, 96, 96, 96] as const;

export function GridHeroLive() {
  const { ref, step } = useStoryTimeline<HTMLDivElement>({
    durations: DURATIONS,
    loopPauseMs: 4000,
  });

  const done = step >= 4;
  const open = step >= 2;

  return (
    <div ref={ref} className="grid-hero-live ts-hero">
      <section className="ts-hero-side" aria-label="What your team sees">
        <p className="ts-side-label">What your team sees</p>
        <div className="ts-phone">
          <div className="ts-phone-notch" aria-hidden />
          {done ? (
            <div className="ts-phone-screen ts-end" key="end">
              <p className="ts-end-kicker">Game over</p>
              <p className="ts-end-team">Team Falcon</p>
              <p className="ts-end-score">{EXAMPLE_TEAMS[0].score}</p>
              <p className="ts-end-rank">#1 of {EXAMPLE.teamCount} teams</p>
            </div>
          ) : (
            <div className="ts-phone-screen">
              <div className="ts-hud">
                <span>Falcon · Alpha</span>
                <span className="ts-pill">⏱ 0{open ? "6:12" : "7:40"}</span>
              </div>
              <p className="ts-task-n">{step >= 3 ? "Mission 5 · The archive" : EXAMPLE.mission4}</p>
              <PointsDecay points={POINTS[step]!} max={120} />
              <div className="ts-tiles">
                <Tile
                  label={EXAMPLE_SLOTS.tile.label}
                  text={EXAMPLE_SLOTS.tile.text}
                  hint={step >= 2 ? "unlocked" : step === 1 ? "offer" : undefined}
                />
                <Tile label="Deal list" text="3 deals · 8 %, 12 %, 15 %" />
              </div>
              {step >= 3 ? (
                <p className="ts-feedback is-right ts-fade" key="next">
                  Vault open · next mission
                </p>
              ) : (
                <CodeLock
                  digits={step === 0 ? "" : step === 1 ? "0812" : "1215"}
                  state={step === 1 ? "wrong" : open ? "right" : "idle"}
                />
              )}
              {step === 2 ? <p className="ts-toast ts-fade">💡 Hint unlocked · −20 P for the team</p> : null}
            </div>
          )}
        </div>
      </section>

      <section className="ts-hero-side is-you" aria-label="What you see">
        <p className="ts-side-label">What you see</p>
        <div className="ts-dash">
          <div className="ts-dash-top">
            <span className="ts-live-dot" aria-hidden />
            {done ? "Session finished" : `Live · ${EXAMPLE.teamCount} teams playing`}
            <em>
              {EXAMPLE.company} · {EXAMPLE.session}
            </em>
          </div>
          {done ? (
            <div className="ts-report-mini ts-fade" key="report">
              <p className="ts-report-mini-head">Report ready</p>
              <div className="ts-report-mini-stats">
                <span>
                  <strong>{EXAMPLE.avgScore}</strong> Ø team score
                </span>
                <span>
                  <strong>3</strong> tells
                </span>
              </div>
              <p className="ts-next">
                <b>Next step</b> {EXAMPLE.nextStep}
              </p>
            </div>
          ) : (
            <ul className="ts-bars">
              {EXAMPLE_TEAMS.map((team) => {
                const value = PROGRESS[team.name]![step]!;
                const hint = HINTS[step]!.includes(team.name);
                return (
                  <li key={team.name} className={hint ? "is-stuck" : undefined}>
                    <span className="ts-bar-name">{team.name}</span>
                    <span className="ts-bar-track" aria-hidden>
                      <i style={{ width: `${(value / 6) * 100}%` }} />
                    </span>
                    <span className="ts-bar-meta">{hint ? "💡 hint" : `${value}/6`}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {done ? null : step === 3 ? (
            <p className="ts-tell ts-pop" key="tell">
              <span aria-hidden>⚡</span> 3 of 5 teams needed a hint on the policy tile. Topic not
              understood.
            </p>
          ) : (
            <p className="ts-tell is-idle">
              <span aria-hidden>⚡</span>
              {step === 2 ? "Same tile, three teams…" : "Live tells · watching every team"}
            </p>
          )}
        </div>
      </section>
      <p className="ts-example">Example data</p>
    </div>
  );
}
