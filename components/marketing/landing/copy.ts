/**
 * All landing page copy in one place. English only for now; other languages
 * get a sibling object with the same shape.
 *
 * Every figure here must match the example report (`components/report/example-data.ts`)
 * and the pricing that sales quotes.
 */
export const LINKS = {
  contact: "#contact",
  pricing: "#pricing",
  report: "/report/example",
  playFirst: "https://exitmania.com/try-tells",
  login: "/login",
  imprint: "/imprint",
} as const;

export const EXAMPLE = {
  company: "Northwind",
  session: "Onboarding Q4",
  format: "Escape",
  minutes: 30,
  teams: 5,
  players: 30,
  score: 72,
  code: "NW-4821",
  date: "14 Oct 2026",
} as const;

export const copy = {
  nav: {
    how: "How it works",
    report: "The report",
    pricing: "Pricing",
    faq: "FAQ",
    login: "Log in",
    cta: "Book a session",
  },

  hero: {
    title: ["Don’t ask your team.", "Let it tell."],
    lead:
      "Your team plays a game for 10 to 120 minutes. Tells measures how they work together and gives you a report: where they get stuck, which topic didn’t land, and what to do next.",
    primary: "Book a session",
    secondary: "See an example report",
    playFirst: "Or play an Exitmania game first",
    facts: ["Ready in 60 seconds", "Share one link in Slack, Teams or email", "10 to 5,000 people"],
  },

  /** Shown above the hero when the visitor arrives with ?from=exitmania. */
  fromExitmania:
    "You just played Exitmania. Now play your own topic: your onboarding, your kickoff, your rules. We credit your Exitmania booking to the setup, up to €245.",

  /** The report as it appears inside the hero window. Same story as /report/example. */
  preview: {
    crumbs: ["Reports", "Onboarding Q4"],
    actions: ["Share", "Export PDF"],
    meta: "Northwind · 14 Oct 2026 · 30 min · 5 teams · 30 players",
    scoreLabel: "Average team score",
    scoreScale: "out of 100",
    verdict: "Solid start. One topic didn’t land.",
    findingsTitle: "Top findings",
    findings: [
      {
        what: "3 of 5 teams got the discount policy wrong",
        next: "Re-explain it. Run Task 4 again in 2 weeks.",
      },
      {
        what: "Gamma waits 48 s for input, across all teams",
        next: "Agree who passes what, and when.",
      },
      {
        what: "Teams that passed tasks on solved 31% faster",
        next: "Keep mixed teams for the next session.",
      },
    ],
    nextLabel: "Next",
    tasksTitle: "Teams that got it right",
    tasks: [
      { id: "T1", title: "Our values", value: 100 },
      { id: "T2", title: "Product basics", value: 80 },
      { id: "T3", title: "Who to ask", value: 80 },
      { id: "T4", title: "Discount policy", value: 40 },
      { id: "T5", title: "Tools", value: 80 },
      { id: "T6", title: "First week", value: 100 },
    ],
    teamsTitle: "Team scores",
    teams: [
      { name: "Falcon", score: 81 },
      { name: "Lynx", score: 76 },
      { name: "Orca", score: 72 },
      { name: "Heron", score: 68 },
      { name: "Bison", score: 63 },
    ],
    privacy: "Team-level insights only. No individual is scored.",
  },

  /** Product panels for the three how-it-works steps. */
  panels: {
    setup: {
      title: "New session",
      format: "Format",
      formatValue: "Escape · 30 min",
      slotsTitle: "Your content",
      slots: [
        { kind: "Clue", value: "Sales may approve up to 10% alone." },
        { kind: "Quiz", value: "Who signs off a new supplier?" },
        { kind: "Image", value: "Northwind HQ" },
      ],
      checked: "Checked",
      fixedTitle: "Set by the format",
      fixed: "Levels, roles, hints, timing",
      linkTitle: "Join link",
      link: "tells.team/go/NW-4821",
      share: ["Copy", "Slack", "Teams"],
    },
    live: {
      title: "Live",
      status: "5 teams · 30 players",
      timer: "18:42 left",
      missions: "tasks",
      hint: "hint",
      tell: "3 of 5 teams needed a hint on Task 4",
      progress: [
        { name: "Falcon", done: 5, hint: false },
        { name: "Lynx", done: 4, hint: false },
        { name: "Orca", done: 3, hint: true },
        { name: "Heron", done: 3, hint: true },
        { name: "Bison", done: 3, hint: true },
      ],
    },
    report: {
      title: "Report ready",
      readyIn: "8 seconds after the last task",
    },
  },

  proof: {
    label: "Built on the engine behind Exitmania",
    items: [
      { value: "50,000+", label: "players of our games" },
      { value: "800+", label: "companies" },
      { value: "14", label: "years of team games" },
    ],
  },

  /** Logos only with written approval. Remove an entry to hide it. */
  logos: {
    title: "Teams at 800+ companies have played our games.",
  },

  problem: {
    title: "Surveys tell you what people say. Not what teams do.",
    rows: [
      { name: "Surveys", text: "People answer the way they think they should." },
      { name: "Workshops", text: "A facilitator’s impression of twelve people. It doesn’t scale." },
      { name: "Team events", text: "A good afternoon, and nothing to act on by Monday." },
    ],
    close:
      "Tells watches teams work under light pressure and measures it: every wrong answer, every hint, every second someone waits.",
  },

  how: {
    title: "One link in. A report out.",
    lead: "No host, no facilitator, no IT ticket.",
    steps: [
      {
        n: "01",
        title: "Set up in a minute",
        text: "Pick a format and fill the slots with your own content. Send one link.",
      },
      {
        n: "02",
        title: "Teams play",
        text: "Each role sees different clues, so the team has to talk. Tells runs the session on its own.",
      },
      {
        n: "03",
        title: "Read the report",
        text: "Seconds after the last task: team score, three findings and the next step for each.",
      },
    ],
  },

  insights: {
    title: "What the report shows",
    lead: "Everything at team level. Example data from one 30-minute onboarding session.",
    note: "Example data",
    tabs: [
      {
        id: "understanding",
        label: "Understanding",
        question: "Which topic didn’t land?",
        answer:
          "Task 4 covered the discount policy. Three of five teams got it wrong, even after buying hints.",
      },
      {
        id: "bottlenecks",
        label: "Bottlenecks",
        question: "Where does the team get stuck?",
        answer: "Gamma waits 48 seconds for input, in every team. The handoff is slow, not the people.",
      },
      {
        id: "roles",
        label: "Role dynamics",
        question: "Who passes work to whom?",
        answer: "Beta rarely hands work on. Information stays in one place.",
      },
      {
        id: "overtime",
        label: "Over time",
        question: "Did it get better?",
        answer: "Team Orca dipped after the reorg, then climbed from 61 to 78 over six sessions.",
      },
      {
        id: "benchmarks",
        label: "Benchmarks",
        question: "Available after your first sessions",
        answer: "Benchmarks unlock after your first sessions.",
        locked: true,
      },
      {
        id: "leaderboards",
        label: "Leaderboards",
        question: "Who won?",
        answer: "A live ranking for every team. Filter by department or country once a group has five people.",
      },
    ],
  },

  statement: {
    kicker: "Every team has tells",
    text:
      "In poker, a tell is the small signal that gives away what’s really going on. Teams have them too: in how they split work, how long they wait, where they go wrong.",
    line: ["Tell me how you play.", "I’ll tell you how you work."],
  },

  privacy: {
    title: "Insight on teams. Never on people.",
    lead: "Your people play. Nobody gets graded.",
    points: [
      "Team-level results only. No individual scores, no personal profiles.",
      "Roles come from the order people join. The report never links a role to a person.",
      "Any breakdown with fewer than five people stays hidden.",
      "GDPR-compliant.",
    ],
    link: "Request the works council package",
  },

  pricing: {
    title: "Start with one session",
    lead: "If you stay, the full session cost is credited to your yearly plan.",
    session: {
      name: "One-off session",
      text: "One live event with your own team. No contract, no subscription.",
      price: "€14.90",
      unit: "per person",
      setup: "+ €490 setup",
      exitmania: "Played Exitmania? We credit your booking to the setup, up to €245, within 90 days.",
      scope: "10 to 1,000 people · at least 2 teams of 5",
      includes: ["All features of the format", "Team report", "Custom leaderboard", "Live view during play"],
      cta: "Book a session",
    },
    yearly: {
      title: "Yearly plans",
      lead: "12-month term, billed monthly.",
      perMonth: "/ month",
      from: "from",
      plans: ["Start", "Team", "Company", "Enterprise"],
      recommended: "Most teams",
      rows: [
        { label: "Price", values: ["€119", "€319", "€792", "€2,320"], kind: "price" },
        { label: "Teams at once", values: ["3", "12", "50", "Up to 5,000 people · More? Talk to us"] },
        { label: "Per team", values: ["€49", "€39", "€29", "from €19"] },
        { label: "People per team", values: ["min. 5", "up to 8", "up to 10", "up to 12"] },
        { label: "Company page", values: [true, true, true, true] },
        { label: "Live view and results", values: [true, true, true, true] },
        { label: "Scores by country and department", values: [false, true, true, true] },
        { label: "Priority email support", values: [false, true, true, true] },
        { label: "Volume credits", values: [false, false, true, true] },
        { label: "One page per country", values: [false, false, true, true] },
        { label: "Onboarding, security review and NDA", values: [false, false, false, true] },
        { label: "Works council package and a named contact", values: [false, false, false, true] },
      ],
      cta: ["Choose Start", "Choose Team", "Choose Company", "Talk to us"],
      notes: [
        "Pay the year upfront and get 2 months free.",
        "Monthly without a term costs 20% more and has no company page.",
        "Every team needs at least 5 people, so results never point at one person.",
      ],
    },
  },

  faq: {
    title: "Questions",
    items: [
      {
        q: "Is this a team event or an analytics tool?",
        a: "Both. Your people get a game they enjoy. You get a report on how they work together, and every session adds to the picture.",
      },
      {
        q: "What do companies use it for?",
        a: "Onboarding, checking whether a training landed, kickoffs and all-hands, new teams after a reorg, and leadership programs.",
      },
      {
        q: "Do we have to build a game?",
        a: "No. You pick a format, fill in your content, and Tells builds the game. Roles, difficulty and timing are set by the format.",
      },
      {
        q: "Do we need a host?",
        a: "No. You send one link. Teams form, get their roles and play on their own.",
      },
      {
        q: "Online or on site?",
        a: "Both. Remote, in the office, or teams in different cities in the same session. English, German, French, Spanish and Italian.",
      },
      {
        q: "Does it rate individual employees?",
        a: "No. Results are team-level only, and any group under five people is hidden.",
      },
      {
        q: "Will this land on IT’s desk?",
        a: "No. It runs in any browser. Share one link in Slack, Teams or email. No app, no install.",
      },
      {
        q: "Do we need our works council?",
        a: "If you have one, we send a template agreement and all data protection documents.",
      },
    ],
  },

  close: {
    title: "Your team already has tells. Find out what they are.",
    secondary: "See an example report first",
  },

  contact: {
    lead: "Book a session or ask us anything. We’ll get back to you shortly.",
    name: "Name",
    email: "Work email",
    company: "Company",
    interest: "Interested in",
    teamSize: "Team size",
    interests: ["One-off session", "Yearly plan", "Enterprise"],
    playedExitmania: "I played Exitmania",
    message: "Anything we should know?",
    consent: "I agree to be contacted by Tells about this request.",
    submit: "Send",
    sending: "Sending…",
    doneTitle: "Thanks, we have it.",
    doneText: "We’ll get back to you shortly.",
  },

  footer: {
    tag: "Play-based team intelligence",
    links: {
      session: "Book a session",
      report: "Example report",
      playFirst: "Play a game first",
      login: "Customer login",
      imprint: "Imprint",
    },
    legal: "© 2026 Kinetic Pillar Infrastructure OÜ · Tallinn, Estonia",
  },
} as const;
