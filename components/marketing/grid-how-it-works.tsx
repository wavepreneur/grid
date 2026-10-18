"use client";

import type { ReactNode, Ref } from "react";
import {
  EXAMPLE,
  EXAMPLE_SEATS,
  EXAMPLE_SLOTS,
  EXAMPLE_TEAMS,
  EXAMPLE_TELLS,
} from "@/components/marketing/tells-example-data";
import { CodeLock, PointsDecay, Tile } from "@/components/marketing/tells-play-bits";
import { useStoryTimeline } from "@/components/marketing/use-story-timeline";

const CHAPTERS = [
  {
    n: "01",
    title: "Start with one code",
    text: "You get a code. The first person types it in at tells.team/go, names the team and becomes Alpha. Then one invite link to the rest. Every new player gets a role on the spot.",
    points: ["No app, no login", "Teams form themselves", "Ready in 60 seconds"],
    Window: StartWindow,
  },
  {
    n: "02",
    title: "Your content. Our game.",
    text: "Pick a proven game. Fill the few slots we prepared for you: your facts, your quiz questions, your images. Missions, difficulty, roles and timing stay exactly as tested. Every slot is checked before it goes live. For your team it feels made for them.",
    points: ["No game building", "Nothing left to chance", "Your topic, inside the mission"],
    Window: ContentWindow,
  },
  {
    n: "03",
    title: "Play like one team",
    text: "Escape missions against the clock. Every role sees different tiles, and only together do they crack the code. Points drop while they think. Stuck? Buy a hint with team points. Can't solve a bonus? Hand it to a teammate. Someone drops out? Roles move on by themselves.",
    points: ["Roles that need each other", "Every device in sync", "Fixes itself, no host"],
    Window: PlayWindow,
  },
  {
    n: "04",
    title: "Win as a team",
    text: "Points for every mission and bonus task, fewer the longer you think, and a live ranking for everyone. People cheer for their team, not for themselves. That's when they stop performing and start working together.",
    points: ["Live leaderboard", "Team points only", "A clear winner"],
    Window: ScoreWindow,
  },
  {
    n: "05",
    title: "Know what to do on Monday",
    text: "Seconds after the last task you get the report. Each tell says what happened, what it means and what to do next. Team level only. Nobody gets graded.",
    points: ["Cause, tell, next step", "Ready in 8 seconds", "Compare with the next session"],
    Window: ReportWindow,
  },
] as const;

export function GridHowItWorks() {
  return (
    <ol className="ts-chapters">
      {CHAPTERS.map(({ n, title, text, points, Window }) => (
        <li key={n} className="ts-chapter">
          <div className="ts-chapter-copy">
            <p className="ts-chapter-n">{n}</p>
            <h3 className="grid-product-header ts-chapter-title">{title}</h3>
            <p className="ts-chapter-text">{text}</p>
            <ul className="ts-chapter-points">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <Window />
        </li>
      ))}
    </ol>
  );
}

function Frame({
  label,
  children,
  onReplay,
  finished,
  frameRef,
}: {
  label: string;
  children: ReactNode;
  onReplay: () => void;
  finished: boolean;
  frameRef: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={frameRef} className="ts-window">
      <div className="ts-window-bar">
        <span className="ts-window-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="ts-window-label">{label}</span>
        <button
          type="button"
          className={`ts-replay${finished ? " is-on" : ""}`}
          onClick={onReplay}
          tabIndex={finished ? 0 : -1}
        >
          ↻ Replay
        </button>
      </div>
      <div className="ts-window-body">{children}</div>
      <p className="ts-example">Example data</p>
    </div>
  );
}

/* 01 · code → team name → invite link → seats fill with roles */
const START_STEPS = [900, 1500, 1800, 1700] as const;

function StartWindow() {
  const { ref, step, replay } = useStoryTimeline<HTMLDivElement>({ durations: START_STEPS });
  const code = EXAMPLE.code.replace("-", "");
  const joined = step >= 4 ? EXAMPLE_SEATS.length : step >= 3 ? 1 : 0;

  return (
    <Frame label="tells.team/go" onReplay={replay} finished={step === START_STEPS.length} frameRef={ref}>
      <div className="ts-start">
        <div className={`ts-start-pane${step <= 1 ? " is-on" : " is-done"}`}>
          <p className="ts-mini-kicker">Enter your code</p>
          <div className="ts-code-boxes">
            {code.split("").map((char, index) => (
              <span
                key={index}
                className={step >= 1 ? "is-filled" : undefined}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                {step >= 1 ? char : ""}
              </span>
            ))}
          </div>
        </div>

        <div className={`ts-start-pane${step === 2 ? " is-on" : step > 2 ? " is-done" : ""}`}>
          <p className="ts-mini-kicker">Name your team</p>
          <p className="ts-team-name">{step >= 2 ? "Falcon" : ""}</p>
          <p className="ts-role-chip is-alpha">You are Alpha · team lead</p>
        </div>

        <div className={`ts-start-pane is-invite${step >= 3 ? " is-on" : ""}`}>
          <p className="ts-mini-kicker">Invite your team</p>
          <div className="ts-invite">
            <span className="ts-invite-link">{EXAMPLE.link}</span>
            <span className="ts-invite-btns">
              <b>Copy</b>
              <b>Slack</b>
              <b>Teams</b>
            </span>
          </div>
          <ul className="ts-seats">
            {EXAMPLE_SEATS.map((role, index) => (
              <li
                key={index}
                className={index < joined ? "is-in" : undefined}
                style={{ transitionDelay: `${index * 160}ms` }}
              >
                <span className="ts-seat-avatar" aria-hidden />
                <span className="ts-seat-role">{index < joined ? role : "…"}</span>
              </li>
            ))}
          </ul>
          <p className={`ts-start-go${step >= 4 ? " is-on" : ""}`}>
            Team Falcon · {joined}/6 joined <b>Start</b>
          </p>
        </div>
      </div>
    </Frame>
  );
}

/* 02 · locked blueprint → Northwind content drops into slots → checked → appears inside the mission */
const CONTENT_STEPS = [1200, 1500, 1500, 1500] as const;

const LOCKED = ["Missions & story", "Difficulty", "Roles & teamwork", "Timer & points"] as const;

function ContentWindow() {
  const { ref, step, replay } = useStoryTimeline<HTMLDivElement>({ durations: CONTENT_STEPS });
  const slots = [
    { kind: "Tile", value: `${EXAMPLE_SLOTS.tile.label} · “${EXAMPLE_SLOTS.tile.text}”`, at: 1 },
    { kind: "Quiz", value: EXAMPLE_SLOTS.quiz, at: 2 },
    { kind: "Image", value: EXAMPLE_SLOTS.image, at: 2 },
  ];

  return (
    <Frame
      label={`Game · ${EXAMPLE.game} · for ${EXAMPLE.company}`}
      onReplay={replay}
      finished={step === CONTENT_STEPS.length}
      frameRef={ref}
    >
      <div className="ts-content">
        <div className="ts-content-col">
          <p className="ts-mini-kicker">Stays as tested</p>
          <ul className="ts-locked">
            {LOCKED.map((item) => (
              <li key={item}>
                <span aria-hidden>🔒</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="ts-content-col">
          <p className="ts-mini-kicker">Your slots</p>
          <ul className="ts-slots">
            {slots.map((slot) => {
              const filled = step >= slot.at;
              return (
                <li key={slot.kind} className={`${filled ? "is-filled" : ""}${step >= 3 ? " is-checked" : ""}`}>
                  <span className="ts-slot-kind">{slot.kind}</span>
                  <span className="ts-slot-value">{filled ? slot.value : "Add yours"}</span>
                  <span className="ts-slot-check" aria-hidden>
                    ✓
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={`ts-checked${step >= 3 ? " is-on" : ""}`}>✓ Checked · answers, length, languages</p>
        </div>
        <div className={`ts-content-preview${step >= 4 ? " is-on" : ""}`}>
          <p className="ts-mini-kicker">In the game · {EXAMPLE.mission4}</p>
          <div className="ts-tiles">
            <Tile label={EXAMPLE_SLOTS.tile.label} text={EXAMPLE_SLOTS.tile.text} mine />
            <Tile label="Deal list" text="3 deals · 8 %, 12 %, 15 %" />
          </div>
          <p className="ts-content-note">Your policy is now the clue that opens the vault.</p>
        </div>
      </div>
    </Frame>
  );
}

/* 03 · split tiles → points drop → hint bought → bonus handed off → Gamma drops, roles move on → vault open */
const PLAY_STEPS = [1900, 1900, 1900, 2100, 2100] as const;

const PLAY_LOG = [
  "Mission 4 · every role holds one piece",
  "Points drop while the team thinks",
  "Beta bought a hint · −20 P · shown on every device",
  "Bonus for Gamma · “Can't do this” · handed to Beta",
  "Gamma lost connection · roles moved on automatically",
  "Vault open · every device updated",
] as const;

const PLAY_POINTS = [120, 108, 96, 96, 96, 96] as const;

function PlayWindow() {
  const { ref, step, replay } = useStoryTimeline<HTMLDivElement>({ durations: PLAY_STEPS });
  const solved = step >= 5;
  const gammaOff = step === 4;

  const phones = [
    {
      role: "Alpha",
      sub: "Holds the lock",
      body: (
        <>
          <PointsDecay points={PLAY_POINTS[step]!} max={120} />
          <CodeLock digits={solved ? "1215" : step >= 2 ? "12" : ""} state={solved ? "right" : "idle"} small />
        </>
      ),
    },
    {
      role: "Beta",
      sub: step === 3 ? "Took over the bonus" : "Sees the policy",
      body:
        step === 3 ? (
          <p className="ts-bonus ts-pop">
            <b>Bonus · from Gamma</b>
            Only you see this task now.
          </p>
        ) : (
          <Tile
            label={EXAMPLE_SLOTS.tile.label}
            text={EXAMPLE_SLOTS.tile.text}
            hint={step === 1 ? "offer" : step >= 2 ? "unlocked" : undefined}
          />
        ),
    },
    {
      role: "Gamma",
      sub: gammaOff ? "Disconnected" : step === 5 ? "Taken over automatically" : "Sees the deals",
      body:
        step === 3 ? (
          <p className="ts-bonus is-pass ts-pop">
            <b>Can&apos;t do this?</b>
            Who takes over? → Beta
          </p>
        ) : (
          <Tile label="Deal list" text="3 deals · 8 %, 12 %, 15 %" />
        ),
    },
  ];

  return (
    <Frame label={`Team Falcon · ${EXAMPLE.mission4}`} onReplay={replay} finished={step === PLAY_STEPS.length} frameRef={ref}>
      <div className="ts-play">
        <div className="ts-play-phones">
          {phones.map((phone) => {
            const off = phone.role === "Gamma" && gammaOff;
            return (
              <div
                key={phone.role}
                className={`ts-mini-phone${off ? " is-off" : ""}${solved ? " is-solved" : ""}`}
              >
                <p className="ts-mini-role">
                  <strong>{phone.role}</strong>
                  <em>{phone.sub}</em>
                </p>
                {step === 2 ? <p className="ts-toast is-small ts-fade">💡 Hint unlocked</p> : null}
                {solved ? <p className="ts-feedback is-right ts-pop">Vault open · +96</p> : phone.body}
              </div>
            );
          })}
        </div>
        <ul className="ts-log" aria-live="polite">
          {PLAY_LOG.slice(0, step + 1).map((line, index) => (
            <li
              key={line}
              className={`ts-fade${index === 1 ? " is-warn" : ""}${index >= 2 ? " is-fix" : ""}`}
            >
              {line}
            </li>
          ))}
        </ul>
        <p className={`ts-play-host${solved ? " is-on" : ""}`}>
          Host interventions: <b>0</b>
        </p>
      </div>
    </Frame>
  );
}

/* 03 · scores tick, Falcon climbs, final winner */
const SCORE_STEPS = [1600, 1600, 1800] as const;

const SCORE_FRAMES: readonly Record<string, number>[] = [
  { Falcon: 52, Lynx: 61, Orca: 58, Heron: 49, Bison: 45 },
  { Falcon: 64, Lynx: 66, Orca: 63, Heron: 55, Bison: 51 },
  { Falcon: 74, Lynx: 71, Orca: 68, Heron: 62, Bison: 58 },
  Object.fromEntries(EXAMPLE_TEAMS.map((team) => [team.name, team.score])),
];

const SCORE_POP: readonly (string | null)[] = [null, "+96 · Mission 5", "+80 · bonus task", null];

function ScoreWindow() {
  const { ref, step, replay } = useStoryTimeline<HTMLDivElement>({ durations: SCORE_STEPS });
  const scores = SCORE_FRAMES[step]!;
  const ranked = [...EXAMPLE_TEAMS].sort((a, b) => scores[b.name]! - scores[a.name]!);
  const final = step === SCORE_STEPS.length;

  return (
    <Frame label="Live ranking · on every screen" onReplay={replay} finished={final} frameRef={ref}>
      <div className="ts-score">
        <ol className="ts-rank" style={{ height: EXAMPLE_TEAMS.length * 46 }}>
          {EXAMPLE_TEAMS.map((team) => {
            const place = ranked.findIndex((t) => t.name === team.name);
            const mine = team.name === "Falcon";
            return (
              <li
                key={team.name}
                className={`${mine ? "is-mine" : ""}${final && place === 0 ? " is-winner" : ""}`}
                style={{ transform: `translateY(${place * 46}px)` }}
              >
                <span className="ts-rank-place">#{place + 1}</span>
                <span className="ts-rank-name">
                  {team.name}
                  {mine ? <em>your team</em> : null}
                </span>
                {mine && SCORE_POP[step] ? (
                  <span className="ts-rank-pop ts-pop" key={step}>
                    {SCORE_POP[step]}
                  </span>
                ) : null}
                <span className="ts-rank-score">{scores[team.name]}</span>
              </li>
            );
          })}
        </ol>
        <p className={`ts-winner${final ? " is-on" : ""}`}>
          🏆 Team Falcon wins · 6 players, one score
        </p>
      </div>
    </Frame>
  );
}

/* 04 · report builds: score → three tells → next session */
const REPORT_STEPS = [800, 1300, 1300, 1300] as const;

function ReportWindow() {
  const { ref, step, replay } = useStoryTimeline<HTMLDivElement>({ durations: REPORT_STEPS });

  return (
    <Frame
      label={`${EXAMPLE.company} · ${EXAMPLE.session} · Report`}
      onReplay={replay}
      finished={step === REPORT_STEPS.length}
      frameRef={ref}
    >
      <div className="ts-report">
        <div className="ts-report-head">
          <span>
            <strong>{EXAMPLE.avgScore}</strong> Ø team score
          </span>
          <span>
            {EXAMPLE.teamCount} teams · {EXAMPLE.playerCount} players · {EXAMPLE.minutes} min
          </span>
          <span className="ts-team-only">Team level only</span>
        </div>
        <ul className="ts-report-tells">
          {EXAMPLE_TELLS.map((item, index) => (
            <li
              key={item.kind}
              className={`is-${item.kind.toLowerCase()}${step > index ? " is-in" : ""}`}
            >
              <span className="ts-report-kind">{item.kind}</span>
              <p className="ts-report-tell">{item.tell}</p>
              <p className="ts-report-meaning">{item.meaning}</p>
              <p className="ts-report-next">
                <b>Next</b> {item.next}
              </p>
            </li>
          ))}
        </ul>
        <p className={`ts-report-rerun${step >= 4 ? " is-on" : ""}`}>
          <span>Re-run in 2 weeks · same game, new team mix</span>
          <b>Schedule</b>
        </p>
      </div>
    </Frame>
  );
}
