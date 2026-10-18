import { parseStudioLanguage } from "@/lib/cms/languages";
import type { ContentMode } from "@/lib/cms/layer-model";

export type PlayUiLang = "de" | "en";

/**
 * Player chrome (buttons, errors, GPS, quiz, …).
 * Packs today: `de`, `en`. Booked FR/ES/IT use English chrome until you add
 * `PLAY_UI.fr` (same `PlayUiCopy` shape) — CMS task copy stays in that language.
 */
export function playUiLang(language: string | null | undefined): PlayUiLang {
  const id = parseStudioLanguage(language);
  if (id === "de") return "de";
  // Booked FR/ES/IT/… use English chrome until PLAY_UI.fr (same PlayUiCopy) exists.
  return "en";
}

export function playUi(language: string | null | undefined): PlayUiCopy {
  return PLAY_UI[playUiLang(language)];
}

type HelpStep = { title: string; body: string };

export type PlayUiCopy = {
  close: string;
  back: string;
  you: string;
  copied: string;
  wallet: string;
  pause: string;
  team: string;
  faq: string;
  support: string;
  intro: {
    rules: string;
    start: string;
    modalTitle: string;
    modalBody: string;
    maps: string;
    confirm: string;
    rulesEmpty: string;
  };
  setup: {
    intro: string;
    teamLabel: string;
    teamHint: string;
    teamPreview: string;
    teamPlaceholder: string;
    nameLabel: string;
    nameHint: string;
    namePreview: string;
    namePlaceholder: string;
    submit: string;
    pending: string;
    studioTest: string;
    teamCode: (code: string) => string;
  };
  startFlow: {
    eyebrow: string;
    testEyebrow: string;
    description: string;
    back: string;
    backToIntro: string;
    event: string;
  };
  lobbyPage: {
    eyebrow: string;
    manageEyebrow: string;
    description: string;
    teamPrefix: (name: string) => string;
  };
  lobby: {
    loading: string;
    loadError: string;
    backToName: string;
    ready: string;
    waiting: string;
    helloSolo: (name: string) => string;
    helloTeam: (name: string, count: number, cap: number) => string;
    rules: string;
    rulesHint: string;
    rulesHintCountdown: (countdown: string) => string;
    readNow: string;
    rulesEmpty: string;
    playingHint: string;
    backToPlay: string;
    autoStartFull: string;
    autoStart: string;
    autoStartAlpha: string;
    autoStartWait: string;
    yourTeam: string;
    inviteFriends: string;
    inviteTestDevices: string;
    seatsFree: (left: number, cap: number) => string;
    copyInvite: string;
    start: string;
    starting: string;
    waitForLead: string;
    manageRoles: string;
    manageRolesHint: string;
    roleLegend: (alpha: string, beta: string, gamma: string) => string;
    noTeammates: string;
    noTeammatesHint: string;
    giveLead: string;
    releaseSeat: string;
    youAreLead: string;
    handoverBusy: string;
    handoverBusyHint: string;
    qrAlt: string;
    qrHint: string;
    waitTimeout: string;
    shownHere: string;
    leadHints: string;
    handoffEyebrow: string;
    handoffTitle: string;
    handoffBody: (name: string) => string;
    handoffCta: string;
    handoffPending: string;
    manageTeam: string;
    eventHome: string;
    signedInAs: (name: string) => string;
  };
  joinPage: {
    notFoundTitle: string;
    notFoundBody: string;
    backToEvent: string;
    playingEyebrow: string;
    inviteEyebrow: string;
    inviteFrom: (captain: string, team: string) => string;
    joinTeam: (team: string) => string;
  };
  join: {
    checking: string;
    inviteFrom: (captain: string) => string;
    yourTeam: string;
    seats: (count: number, cap: number) => string;
    pickName: string;
    midGame: string;
    enterName: string;
    alreadyIn: string;
    thatsMe: string;
    alreadyHint: string;
    teamFull: string;
    newName: string;
    yourName: string;
    nameHint: string;
    namePreview: string;
    namePlaceholder: string;
    pending: string;
    joinNew: string;
    start: string;
  };
  overlay: {
    multiTitle: string;
    multiSubtitle: string;
    soloTitle: string;
    soloSubtitle: string;
    hint: string;
  };
  introVideo: {
    title: string;
    subtitle: string;
    continue: string;
    fullscreenHint: string;
  };
  gpsLead: {
    title: string;
    body: string;
    stepsIos: string;
    stepsAndroid: string;
    stepsDesktop: string;
    settings: string;
    reload: string;
    giveLead: string;
    soloHint: string;
  };
  gpsHelp: {
    intro: string;
    noDialogTitle: string;
    noDialogBody: string;
    iosTitle: string;
    iosSteps: string[];
    androidTitle: string;
    androidSteps: string[];
    desktopTitle: string;
    desktopSteps: string[];
    tryAgainHint: string;
    giveLeadHint: string;
    lastResortTitle: string;
    lastResortBody: string;
    menuHint: string;
  };
  resume: {
    copyIdle: string;
    copyDone: string;
    copyFail: string;
    compactTitle: string;
    compactHint: string;
    lobbyTitle: string;
    lobbyHint: string;
    stepTap: string;
    stepSave: string;
    stepDone: string;
  };
  menu: {
    title: string;
    moreAria: string;
    rulesHint: string;
    stuck: string;
    faqHint: string;
    supportHint: string;
    pauseHint: string;
    resume: string;
    resumeHint: string;
    teamHint: string;
    howItWorks: string;
    openFullRules: string;
    understood: string;
    helpPrompt: string;
    atPoint: string;
    atPointHint: string;
    stationCode: string;
    stationCodeHint: string;
    notInSync: string;
    notInSyncHint: string;
    puzzleStuck: string;
    puzzleStuckHint: string;
    screenFrozen: string;
    screenFrozenHint: string;
    otherPhone: string;
    otherPhoneHint: string;
    howToPlay: string;
    gpsTitle: string;
    gpsPrompt: string;
    gpsAtPoint: string;
    gpsAtPointHint: string;
      openTaskNow: string;
      openTask: string;
      atPointCta: string;
      openAnywayShort: string;
      leadOpens: string;
    checkLocation: string;
    openAnyway: string;
    stationTitle: string;
    noNote: string;
    noNoteHint: string;
    codeRejected: string;
    codeRejectedHint: string;
    devicesTitle: string;
    someoneLeft: string;
    someoneLeftHint: string;
    getTeamCode: string;
    reloadTitle: string;
    reloadReassure: string;
    reloadPage: string;
    faqEmpty: string;
    supportEmpty: string;
    supportTitle: string;
    pauseBody: string;
    whoPlays: string;
    sameName: string;
    giveLeadTitle: string;
    giveLeadHint: string;
    transferring: string;
    playingAlone: string;
    leadStarts: string;
    reclaimTitle: string;
    reclaimHint: string;
    releaseMine: string;
    waitMoment: string;
    pausedBanner: string;
    tapToResume: string;
    gpsSettings: string;
    indoorTip: string;
    onlineTip: string;
    reloadTip: string;
    skipHeadline: string;
    skipWallet: string;
    helpMenuOutdoor: string;
    helpMenuIndoor: string;
    helpMenuOnline: string;
    howOutdoor: string;
    howIndoor: string;
    howOnline: string;
    rulesOutdoor: HelpStep[];
    rulesIndoor: HelpStep[];
    rulesOnline: HelpStep[];
  };
  hub: {
    hunt: string;
    huntWalk: string;
    huntWait: string;
    yourTarget: string;
    taskOf: (current: number, total: number) => string;
    openOf: (open: number, total: number) => string;
    followFree: string;
    followLinear: string;
    walkLeadCounts: string;
    walkFollowCounts: string;
    arrived: string;
    openWaypoint: string;
    walkToPin: (meters: number) => string;
    gpsInaccurate: (meters: number) => string;
    studioTitle: string;
    studioOpen: string;
    simArrive: string;
    waitOver: string;
    waitReady: string;
    waitLeft: (minutes: number) => string;
    gpsTrouble: string;
    gpsTroubleHint: string;
    gpsHere: string;
    gpsBroken: string;
    gpsUnlock: string;
    gpsUnlockLead: string;
    gpsSkip: string;
    gpsSkipLead: string;
    geoDenied: string;
    geoUnsupported: string;
    geoUnavailable: string;
    geoTimeout: string;
    indoorDone: (done: number, total: number) => string;
    indoorFree: string;
    indoorNext: string;
    solved: string;
    wrong: string;
    lockedPrev: string;
    findNote: string;
    codeHint: string;
    checkCode: string;
    allStationsDone: string;
    nextUp: (name: string) => string;
    missionOf: (n: number, total: number) => string;
    onlineHint: (done: number) => string;
    startMission: string;
    mapAtPoint: string;
    mapTarget: string;
    mapWalked: (walked: number, start: number | null) => string;
    mapLeadCounts: string;
    mapFollowCounts: string;
    mapSearching: string;
    mapWaitLead: string;
    mapFar: string;
    mapNavigate: string;
    walkFree: string;
    walkDone: string;
    metersLeft: string;
    metersWalked: (m: number) => string;
    walkComplete: string;
    walkFill: string;
    simulateWalk: string;
    forceWalkHint: string;
  };
  phase: {
    keyTitle: string;
    keySubtitle: string;
    bonusElse: (name: string) => string;
    stationOpen: string;
    missionStarted: string;
    waypointReached: string;
  };
  quiz: {
    headingOnline: string;
    headingIndoor: string;
    headingOutdoor: string;
    introOnline: string;
    introTeam: string;
    unlockAll: string;
    unlock: string;
    key: string;
    checking: string;
    sendTeam: string;
    chosen: string;
    rightPoints: (points: number) => string;
    right: string;
    wrongKey: string;
    unlocking: string;
    answeredBy: (name: string) => string;
    didYouKnow: string;
  };
  solve: {
    skipped: string;
    solution: (text: string) => string;
    leadConfirms: string;
    confirming: string;
    atTargetAuto: string;
    atTarget: string;
    autoConfirm: string;
    walkToStart: string;
    confirmWaypoint: string;
    checkAnswer: string;
    sendAnswer: string;
    gpsHang: string;
    placeholder: string;
    placeholderAnswer: string;
    sending: string;
    completeTask: string;
    gpsLead: string;
    gpsOnSite: string;
    doneZero: string;
    continue: string;
    locating: string;
    distance: string;
    stillWalking: string;
    allowLocation: string;
    answerLabel: string;
    taskN: (n: number) => string;
  };
  bonus: {
    running: string;
    nextForAll: string;
    nextForYouPlural: string;
    nextForYou: string;
    readyAll: string;
    readyPlural: string;
    readySolo: string;
    title: string;
    teamSees: string;
    checkAnswer: string;
    skipZero: string;
    whoTakes: string;
    cantDo: string;
    pointsTeam: (n: number) => string;
    videoGallery: string;
    photoGallery: string;
    timedOut: string;
    notAnswered: (name: string) => string;
    zeroExtraLead: (lead: string) => string;
    rightAnswer: string;
    backToTeam: string;
    continueTo: (hub: string) => string;
    theyAreUp: (name: string) => string;
    theyAreUpPlural: (name: string) => string;
    onlySees: (name: string) => string;
    onlySee: (name: string) => string;
    thenHub: (hub: string) => string;
    attemptTimeout: string;
    placeholder: string;
    skippedBy: (name: string) => string;
    scoredBy: (name: string, n: number) => string;
    failedBy: (name: string) => string;
    solvingNow: (name: string) => string;
    noExtra: string;
    extraZero: string;
    wholeTeam: string;
    videoSent: string;
    photoSent: string;
    skipTeam: string;
  };
  hint: {
    unlock: string;
    cost: (n: number) => string;
    confirm: string;
    loading: string;
    cancel: string;
    unlocked: string;
    toastTitle: string;
    toastBy: (name: string) => string;
    teammate: string;
    byForTeam: (name: string) => string;
    understood: string;
    unlockPts: (n: number) => string;
  };
  reveal: {
    or: string;
    stuck: string;
    show: string;
    zeroPoints: string;
    giveUp: string;
    showQ: string;
    body: string;
    ok: string;
    back: string;
  };
  feedback: {
    notYet: string;
    yourInput: string;
    tryAgain: string;
    keepGoing: string;
    recognized: string;
  };
  helpNudge: {
    notSolution: string;
    noInput: string;
    buyHint: string;
    noHintSkip: string;
    openHelp: string;
    whatsWrong: string;
    keepSolving: string;
  };
  menuTour: {
    title: string;
    body: string;
    start: string;
    pointer: string;
  };
  transition: {
    keyFits: string;
    bonusReady: string;
    loadingLevel: string;
    loadingBonus: string;
    loadLevelAria: string;
    loadBonusAria: string;
    toTask: string;
    startBonus: string;
  };
  sync: {
    zeroPoints: string;
    taskDone: string;
    solved: string;
    points: (n: number) => string;
    taskN: (n: number) => string;
    skippedHeadline: string;
    skippedWallet: string;
  };
  tiles: {
    one: string;
    many: (n: number) => string;
    tapOpen: string;
    swipeOrTap: string;
    switchAria: string;
    lookAtAll: string;
    soloMedia: string;
    hintsAria: string;
    hintBadge: string;
    mediaHeading: string;
    image: string;
    video: string;
    audio: string;
    panorama: string;
    minigame: string;
    pdf: string;
    content: string;
  };
  scoring: {
    timesUp: string;
    pointsNow: (n: number, label: string) => string;
    point: string;
    points: string;
    noCountdown: string;
    stillPrefix: string;
  };
  capture: {
    camMissing: string;
    camDenied: string;
    videoUnsupported: string;
    noTake: string;
    noSession: string;
    tooBig: string;
    badFormat: string;
    uploadFail: string;
    sendFail: string;
    videoMax: (s: number) => string;
    takeVideo: string;
    photoFrame: string;
    takePhoto: string;
    nativeHint: string;
    openCam: string;
    skipZero: string;
    secLeft: (s: number) => string;
    closeCam: string;
    savePhone: string;
    saving: string;
    send: string;
    fromGallery: string;
    retake: string;
    stopRecording: (s: number) => string;
    unknownKind: string;
    noFile: string;
    sendVideo: string;
    sendPhoto: string;
    expectVideo: string;
    expectPhoto: string;
    noCapture: string;
    galleryClosed: string;
    galleryFail: string;
    invalidUpload: string;
    uploadLinkFail: string;
  };
  over: {
    won: string;
    timeUp: string;
    gameOver: string;
    yourPoints: string;
    revealedLine: (title: string) => string;
    summary: (solved: number, revealed: number) => string;
    rateEvent: string;
    rateHighscore: string;
    openEvent: string;
    openHighscore: string;
    later: string;
    copyLink: string;
    copied: string;
    ranking: string;
    highscore: string;
    closeRanking: string;
    walletEmpty: string;
    walletOne: string;
    walletMany: (n: number) => string;
    tasksCount: (n: number) => string;
    tasksOf: (done: number, total: number) => string;
    tasksDone: (done: number, total: number) => string;
    liveRankingEvent: string;
    highscoreQ: string;
    linkExpires: string;
    liveRankingThis: string;
    copyPrompt: string;
    expiredTitle: string;
    expiredBody: string;
  };
  gate: {
    loadingTitle: string;
    loadingSubtitle: string;
    loadingHint: string;
    contentSlow: string;
    startSlow: string;
    contentFail: string;
    actionFail: string;
    missingPublished: string;
    missingLevel: (n: number, ids: string) => string;
    videoMissing: string;
  };
  hud: {
    connected: string;
    connecting: string;
    taskOf: (current: number, total: number) => string;
    stations: string;
    missions: string;
    levels: string;
    points: string;
    time: string;
    reconnecting: string;
    reconnectPlay: string;
    liveRanking: string;
    doneCount: (n: number) => string;
  };
  walletUi: {
    intro: string;
    skippedSolution: string;
    buyQ: (n: number) => string;
    notEnough: (have: number, need: number) => string;
    canShow: (n: number) => string;
    showFor: (n: number) => string;
    buying: string;
    buyYes: string;
    afterLevel: (n: number) => string;
    afterLevelSkipped: (n: number) => string;
    boughtBy: (name: string) => string;
  };
  notes: {
    heading: string;
    noneSolo: string;
    none: string;
  };
  desk: {
    title: (m: number) => string;
    hint: (walked: number, need: number) => string;
    showNow: string;
  };
  gallery: {
    loading: string;
    empty: string;
    one: string;
    many: (n: number) => string;
    taskN: (n: number) => string;
    title: string;
    body: string;
    loadingBody: string;
    emptyBody: string;
    save: string;
    photo: string;
    video: string;
  };
  timeAlert: {
    oneMinute: string;
    lastMinutes: string;
  };
  action: {
    notPlaying: string;
    notPlayingNow: string;
    levelInactive: string;
    closeSyncFirst: string;
    solutionOpen: string;
    levelMissing: string;
    onlyLead: string;
    onlyGpsLead: string;
    noTileHint: string;
    hintAlready: string;
    noWalletAfterOver: string;
    levelNotFound: string;
    noLevelHint: string;
    hintAfterSkip: string;
    revealForbidden: string;
    teamNotLobby: string;
    teamMissing: string;
    phaseInactive: string;
    badCode: string;
    stationDone: string;
    levelLocked: string;
    levelDone: string;
    badOverride: string;
    enterStation: string;
    onlyGpsTrack: string;
    noQuiz: string;
    noUnlockQuiz: string;
    quizUnanswered: string;
    bonusUnanswered: string;
    noActiveBonus: string;
    bonusOtherPlayer: string;
    bonusOtherRole: string;
    pickAnswer: string;
    noBonusPhase: string;
    pickSomeoneElse: string;
    alreadyTeamBonus: string;
    alreadyAnswered: string;
    onlyHolderHandsOff: string;
    teammateMissing: string;
    eventMissing: string;
    sessionExpired: string;
    sessionInvalid: string;
    unknown: string;
    phaseUpdate: string;
  };
  media: {
    close: string;
    noUrl: string;
  };
  growth: {
    copiedText: string;
    sendFriends: string;
    copiedCode: string;
    useCode: string;
    familyHeadline: string;
    familyBody: string;
    familyCta: string;
    familyBadge: (percent: number, days: number) => string;
    familyNote: (until: string) => string;
    shareTitle: string;
    shareChallenge: (score: number) => string;
    shareChallengePlain: string;
    shareCodeLine: (percent: number, code: string, days: number) => string;
  };
  walletHint: {
    empty: string;
    mixed: (open: number, locked: number) => string;
    lockedOne: string;
    lockedMany: (n: number) => string;
    openOne: string;
    openMany: (n: number) => string;
  };
};

export type GeoErrorKind = "unsupported" | "denied" | "unavailable" | "timeout";

export function geoErrorKindFromCode(code: number): GeoErrorKind {
  if (code === 1) return "denied";
  if (code === 2) return "unavailable";
  if (code === 3) return "timeout";
  return "denied";
}

export function playGeoError(
  language: string | null | undefined,
  kind: GeoErrorKind | null,
): string | null {
  if (!kind) return null;
  const h = playUi(language).hub;
  if (kind === "unsupported") return h.geoUnsupported;
  if (kind === "unavailable") return h.geoUnavailable;
  if (kind === "timeout") return h.geoTimeout;
  return h.geoDenied;
}

export function playTileTypeLabel(type: string, language?: string | null): string {
  const t = playUi(language).tiles;
  switch (type) {
    case "image":
      return t.image;
    case "video":
      return t.video;
    case "audio":
      return t.audio;
    case "panorama_360":
      return t.panorama;
    case "minigame":
      return t.minigame;
    case "pdf":
      return t.pdf;
    default:
      return t.content;
  }
}

export function playActionError(
  language: string | null | undefined,
  key: keyof PlayUiCopy["action"],
): string {
  return playUi(language).action[key];
}

const PLAY_UI: Record<PlayUiLang, PlayUiCopy> = {
  de: {
    close: "Schließen",
    back: "Zurück",
    you: "du",
    copied: "Kopiert!",
    wallet: "Wallet",
    pause: "Pause",
    team: "Team",
    faq: "FAQ",
    support: "Support",
    intro: {
      rules: "Spielregeln",
      start: "Starte das Spiel",
      modalTitle: "Seid ihr am Start?",
      modalBody: "Starte das Spiel erst, wenn du ca. 100 Meter in der Nähe des Startpunkts bist.",
      maps: "Route zum Startpunkt öffnen",
      confirm: "Wir sind in der Nähe",
      rulesEmpty: "Für dieses Spiel sind noch keine Spielregeln hinterlegt.",
    },
    setup: {
      intro: "Teamname fürs Ranking, dein Name fürs Team — dann ab in den Wartebereich.",
      teamLabel: "Teamname",
      teamHint: "So erscheint ihr im Ranking",
      teamPreview: "Ranking-Name",
      teamPlaceholder: "z. B. Berlin Explorers",
      nameLabel: "Dein Name",
      nameHint: "Dein Name im Team",
      namePreview: "Dein Anzeigename",
      namePlaceholder: "z. B. Dervis",
      submit: "Weiter zum Wartebereich",
      pending: "Gleich geht’s los…",
      studioTest: "Studio-Test",
      teamCode: (code) => `Team-Code ${code}`,
    },
    startFlow: {
      eyebrow: "Willkommen",
      testEyebrow: "Testspiel",
      description: "Legt euren Teamnamen und deinen Namen fest — dann geht’s in den Wartebereich.",
      back: "← Zurück",
      backToIntro: "← Zurück zum Start",
      event: "Event",
    },
    lobbyPage: {
      eyebrow: "Bereit machen",
      manageEyebrow: "Team",
      description: "Spielregeln lesen — dann starten.",
      teamPrefix: (name) => `Team ${name}`,
    },
    lobby: {
      loading: "Wartebereich wird geladen…",
      loadError: "Wartebereich konnte nicht geladen werden.",
      backToName: "Zurück zur Namenseingabe",
      ready: "Bereit machen",
      waiting: "Wartebereich",
      helloSolo: (name) => `Hallo ${name} — lies kurz die Infos, dann kannst du starten.`,
      helloTeam: (name, count, cap) => `Hallo ${name} · ${count}/${cap} im Team`,
      rules: "Spielregeln",
      rulesHint: "Bitte vor dem Start lesen",
      rulesHintCountdown: (countdown) => `Bitte jetzt lesen — Start in ${countdown}`,
      readNow: "Jetzt lesen",
      rulesEmpty:
        "Für dieses Spiel sind noch keine Spielregeln hinterlegt. Du findest sie später auch im Spielmenü.",
      playingHint: "Spiel läuft.",
      backToPlay: "Zurück zum Spiel",
      autoStartFull: "Team voll — Automatischer Start",
      autoStart: "Automatischer Start",
      autoStartAlpha: "Du kannst auch früher starten.",
      autoStartWait: "Die Team-Leitung kann auch früher starten.",
      yourTeam: "Euer Team",
      inviteFriends: "Freunde einladen",
      inviteTestDevices: "Weitere Testgeräte einladen",
      seatsFree: (left, cap) => `Noch ${left} von ${cap} Plätzen frei`,
      copyInvite: "Einladungslink kopieren",
      start: "Spiel starten",
      starting: "Startet…",
      waitForLead:
        "Warte auf den Start durch die Team-Leitung — nutze die Zeit für die Spielregeln.",
      manageRoles: "Rollen verwalten",
      manageRolesHint: "Wer führt, wer Hinweise sieht, wer Bonus macht",
      roleLegend: (alpha, beta, gamma) =>
        `${alpha} startet & GPS · ${beta} Hinweise · ${gamma} Bonusaufgaben`,
      noTeammates: "Noch keine Mitspieler",
      noTeammatesHint: "Sobald jemand beitritt, kannst du hier Rollen zuweisen.",
      giveLead: "Leitung geben",
      releaseSeat: "Platz freigeben",
      youAreLead: "Du bist die Team-Leitung.",
      handoverBusy: "Platz wird freigegeben…",
      handoverBusyHint: "Du kannst dich danach erneut anmelden.",
      qrAlt: "QR-Code zum Mitspielen",
      qrHint: "Freunde scannen den Code — und sind sofort dabei.",
      waitTimeout: "Wartebereich antwortet nicht.",
      shownHere: "Wird hier angezeigt",
      leadHints: "Team-Leiter · Hinweise",
      handoffEyebrow: "Nicht mehr im Spiel",
      handoffTitle: "Jemand anderes nutzt diesen Zugang",
      handoffBody: (name) =>
        `${name}, dein Platz läuft jetzt auf einem anderen Gerät. Wenn das versehentlich war, hol dir die Rolle hier zurück — das andere Gerät wird automatisch abgemeldet.`,
      handoffCta: "Spiel hier fortsetzen",
      handoffPending: "Wird übernommen…",
      manageTeam: "Team verwalten",
      eventHome: "Start",
      signedInAs: (name) => `Angemeldet als ${name}`,
    },
    joinPage: {
      notFoundTitle: "Team nicht gefunden",
      notFoundBody: "Der Code passt nicht — frag dein Team nach dem richtigen Link.",
      backToEvent: "Zurück zum Event",
      playingEyebrow: "Weiterspielen",
      inviteEyebrow: "Einladung",
      inviteFrom: (captain, team) => `${captain} lädt dich zu „${team}“ ein.`,
      joinTeam: (team) => `Tritt Team „${team}“ bei.`,
    },
    join: {
      checking: "Einen Moment…",
      inviteFrom: (captain) => `${captain} lädt dich zum Spiel ein`,
      yourTeam: "Dein Team",
      seats: (count, cap) => `${count} von ${cap} Plätzen`,
      pickName: "Wähl deinen Namen — oder trag einen neuen ein, wenn noch Platz ist.",
      midGame: "Das Spiel läuft. Trag deinen Namen ein.",
      enterName: "Trag deinen Namen ein. Danach landest du bei den anderen.",
      alreadyIn: "Schon im Team",
      thatsMe: "Das bin ich",
      alreadyHint: "Warst du schon drin, nimm deinen Namen. Das andere Gerät wird abgemeldet.",
      teamFull: "Das Team ist voll. Nur bestehende Namen können sich wieder verbinden.",
      newName: "Neuer Name",
      yourName: "Dein Name",
      nameHint: "So siehst du im Team aus",
      namePreview: "Dein Anzeigename",
      namePlaceholder: "z. B. Alex",
      pending: "Einen Moment…",
      joinNew: "Neu dazukommen",
      start: "Loslegen",
    },
    overlay: {
      multiTitle: "Alle Geräte laden…",
      multiSubtitle: "Die Mission startet gemeinsam — niemand legt allein los.",
      soloTitle: "Spiel startet…",
      soloSubtitle: "Die Karte wird vorbereitet — einen Moment.",
      hint: "Bitte nicht neu laden — gleich geht’s weiter.",
    },
    introVideo: {
      title: "INTRO VIDEO",
      subtitle: "Schau dir das Video an — danach geht’s auf die Karte.",
      continue: "Weiter zur Karte",
      fullscreenHint: "Vollbild über den YouTube-Player",
    },
    gpsLead: {
      title: "Standort für die Karte",
      body: "Als Team-Leitung öffnest du die Wegpunkte. Dafür braucht der Browser deinen Standort — sonst siehst du nicht, wo ihr steht.",
      stepsIos:
        "iPhone: Einstellungen → Safari (oder Chrome) → Standort → Erlauben. Dann hier neu laden.",
      stepsAndroid:
        "Android: Schloss in der Adressleiste antippen → Berechtigungen → Standort erlauben. Dann neu laden.",
      stepsDesktop:
        "Schloss in der Adressleiste → Standort → Zulassen. Dann die Seite neu laden.",
      settings: "Zu den Einstellungen",
      reload: "Seite neu laden",
      giveLead: "Leitung an jemand anderen abgeben",
      soloHint: "Du spielst allein — Standort hier einschalten, dann neu laden.",
    },
    gpsHelp: {
      intro:
        "GPS öffnet die Wegpunkte. Wenn der Standort fehlt, ist er fast immer im Browser oder auf dem Handy blockiert — nicht im Spiel.",
      noDialogTitle: "Kein Standort-Fenster?",
      noDialogBody:
        "Erscheint kein GPS-Dialog, hat das Smartphone den Standort für diesen Browser blockiert. In den Einstellungen erlauben — oder die GPS-Rolle an jemand anderen im Team geben.",
      iosTitle: "iPhone / iPad",
      iosSteps: [
        "Einstellungen öffnen",
        "Nach unten zu Safari — oder Chrome, wenn ihr damit spielt",
        "Standort → Erlauben (nicht Fragen oder Nie)",
        "Zurück zum Spiel und Seite neu laden",
      ],
      androidTitle: "Android",
      androidSteps: [
        "Schloss in der Adressleiste antippen",
        "Berechtigungen öffnen",
        "Standort erlauben",
        "Seite neu laden",
      ],
      desktopTitle: "Computer",
      desktopSteps: [
        "Schloss in der Adressleiste anklicken",
        "Standort → Zulassen",
        "Seite neu laden",
      ],
      tryAgainHint:
        "Tippen, damit der Browser den Standort nochmal anfragt. Erscheint kein Fenster: Standort ist blockiert — Einstellungen oder Rolle abgeben.",
      giveLeadHint:
        "Jemand mit funktionierendem GPS übernimmt die Leitung. Dann muss niemand ohne Standort spielen.",
      lastResortTitle: "Nur wenn es wirklich nicht geht",
      lastResortBody:
        "Ohne GPS nur freischalten, wenn niemand sonst die Rolle übernehmen kann — oder der Wegpunkt unzugänglich ist (Baustelle, Absperrung).",
      menuHint: "Standort erlauben — iPhone und Android",
    },
    resume: {
      copyIdle: "Aufs Handy kopieren",
      copyDone: "Kopiert — in Notizen einfügen",
      copyFail: "Kopieren fehlgeschlagen",
      compactTitle: "Team-Code für ein neues Handy",
      compactHint: "Danach in Notizen speichern oder an dich selbst schicken.",
      lobbyTitle: "Code aufs Handy legen",
      lobbyHint:
        "Speichere ihn irgendwo auf dem Smartphone — Notizen, Foto oder Nachricht an dich selbst.",
      stepTap: "1. Tippen",
      stepSave: "2. Speichern",
      stepDone: "3. Fertig",
    },
    menu: {
      title: "Spiel-Menü",
      moreAria: "Mehr Optionen",
      rulesHint: "Ablauf nachlesen",
      stuck: "Steckt ihr fest?",
      faqHint: "Antworten zu Spiel und Technik",
      supportHint: "Mit dem Team sprechen",
      pauseHint: "Zeit anhalten",
      resume: "Weiterspielen",
      resumeHint: "Countdown läuft wieder",
      teamHint: "Namen, Code, Leitung",
      howItWorks: "So funktioniert's",
      openFullRules: "Ausführliche Regeln öffnen",
      understood: "Verstanden",
      helpPrompt: "Tippe, was gerade nicht klappt.",
      atPoint: "Wir stehen am Punkt",
      atPointHint: "GPS öffnet die Aufgabe nicht",
      stationCode: "Station oder Code",
      stationCodeHint: "Zettel fehlt, oder der Code geht nicht",
      notInSync: "Nicht alle sehen dasselbe",
      notInSyncHint: "Seite neu laden oder Team-Code holen",
      puzzleStuck: "Das Rätsel hängt",
      puzzleStuckHint: "Zurück zur Aufgabe — Tipp oder Lösung holen",
      screenFrozen: "Bildschirm steht still",
      screenFrozenHint: "Seite neu laden — nichts geht verloren",
      otherPhone: "Anderes Handy",
      otherPhoneHint: "Team-Code holen und Namen tippen",
      howToPlay: "So geht das Spiel",
      gpsTitle: "Standort / GPS",
      gpsPrompt: "Was soll jetzt passieren?",
      gpsAtPoint: "Wir stehen am Punkt",
      gpsAtPointHint: "Die Aufgabe soll jetzt starten.",
      openTaskNow: "Aufgabe jetzt öffnen",
      openTask: "Aufgabe öffnen",
      atPointCta: "Wir sind am Punkt",
      openAnywayShort: "Aufgabe trotzdem öffnen",
      leadOpens: "Die Team-Leitung tippt auf der Karte „Wir sind am Punkt“.",
      checkLocation: "Standort am Handy prüfen",
      openAnyway: "Trotzdem öffnen",
      stationTitle: "Station / Code",
      noNote: "Wir finden den Zettel nicht",
      noNoteHint:
        "Der Code hängt im Raum — Schilder, Tische, Wände. Danach Station antippen und Code eingeben.",
      codeRejected: "Code wird nicht angenommen",
      codeRejectedHint:
        "Genau den Code von diesem Zettel. Groß/klein ist egal. Anderer Zettel = andere Station.",
      devicesTitle: "Geräte",
      someoneLeft: "Jemand ist raus oder wechselt Handy",
      someoneLeftHint: "Team-Code holen und denselben Namen tippen.",
      getTeamCode: "Team-Code holen",
      reloadTitle: "Bildschirm steht still",
      reloadReassure:
        "Keine Angst — das ist dasselbe wie einmal aktualisieren. Danach einfach weiterspielen.",
      reloadPage: "Seite neu laden",
      faqEmpty:
        "Für dieses Spiel ist noch kein FAQ-Link hinterlegt. Bei Problemen nutzt den Support-Chat oder meldet euch beim Spielleiter.",
      supportEmpty: "Support-Chat ist noch nicht konfiguriert.",
      supportTitle: "Support-Chat",
      pauseBody:
        "Das Spiel ist pausiert. Die Zeit steht — nichts läuft weiter. Schließt die App ruhig. Weiterspielen geht jederzeit, auch Tage später.",
      whoPlays: "Wer spielt",
      sameName: "Neues Handy? Denselben Namen tippen.",
      giveLeadTitle: "Leitung abgeben",
      giveLeadHint: "Du führst das Team. Tippe, wer als Nächstes führen soll.",
      transferring: "Übertrage…",
      playingAlone: "Du spielst allein — die Leitung bleibt bei dir.",
      leadStarts: "Die Team-Leitung startet die Aufgaben.",
      reclaimTitle: "Sitzung zurückholen",
      reclaimHint: "Wenn du rausgeflogen bist",
      releaseMine: "Meinen Platz freigeben",
      waitMoment: "Einen Moment…",
      pausedBanner: "Spiel pausiert",
      tapToResume: "Tippen zum Weiterspielen",
      gpsSettings:
        "Einstellungen → Standort für den Browser einschalten. Am Punkt bleiben — so macht das Spiel mehr Spaß.",
      indoorTip:
        "Indoor braucht kein GPS. Sucht den Zettel an der Station und gebt den Code ein — so öffnet ihr die Aufgabe.",
      onlineTip:
        "Alle Geräte sollten dasselbe sehen. Seite neu laden, einen Moment warten, oder auf /go denselben Team-Code und deinen Namen eingeben.",
      reloadTip:
        "Wenn sich nichts mehr bewegen oder scrollen lässt: Seite neu laden. Ihr seid wieder genau hier — Punkte, Team und Stand bleiben.",
      skipHeadline: "Nicht gelöst",
      skipWallet: "Den Hinweis holt ihr in der Wallet — gegen Punkte.",
      helpMenuOutdoor: "GPS, Tipp oder anderes Handy",
      helpMenuIndoor: "Code, Tipp oder anderes Handy",
      helpMenuOnline: "Tipp, Verbindung oder anderes Handy",
      howOutdoor: "Zum Punkt laufen, Aufgabe öffnen, gemeinsam lösen",
      howIndoor: "Stationen antippen, Code vom Zettel eingeben, dann Quiz und Aufgabe",
      howOnline: "Mission starten — alle Geräte lösen dasselbe, ohne Laufen",
      rulesOutdoor: [
        { title: "Zum Pin laufen", body: "Die Karte zeigt den nächsten Punkt. Lauft dorthin." },
        {
          title: "Team-Leitung öffnet",
          body: "Nur sie aktiviert die Aufgabe, wenn ihr nah genug seid.",
        },
        {
          title: "Zusammen rätseln",
          body: "Sobald die Aufgabe offen ist, darf jede Person tippen.",
        },
        {
          title: "Wenn ihr hängt",
          body: "Drei Punkte oben rechts: Tipp, Lösung oder Leitung wechseln (Menü → Team).",
        },
      ],
      rulesIndoor: [
        { title: "Zur Station", body: "Sucht den Zettel an der Station." },
        {
          title: "Code eingeben",
          body: "Die Team-Leitung gibt den Code ein — so öffnet sich die Aufgabe.",
        },
        {
          title: "Zusammen rätseln",
          body: "Sobald die Aufgabe offen ist, darf jede Person tippen.",
        },
        {
          title: "Wenn ihr hängt",
          body: "Drei Punkte oben rechts: Tipp, Lösung oder Leitung wechseln (Menü → Team).",
        },
      ],
      rulesOnline: [
        {
          title: "Mission starten",
          body: "Die Team-Leitung startet. Alle Geräte sehen dieselbe Aufgabe.",
        },
        {
          title: "Zusammen rätseln",
          body: "Jede Person darf tippen, sobald die Aufgabe offen ist.",
        },
        {
          title: "Hinweise merken",
          body: "Was ihr löst, braucht ihr oft später. Schaut bei Bedarf in die Wallet.",
        },
        {
          title: "Wenn ihr hängt",
          body: "Drei Punkte oben rechts: Tipp, Lösung oder Leitung wechseln.",
        },
      ],
    },
    hub: {
      hunt: "Stadtjagd",
      huntWalk: "Stadtjagd · Strecke",
      huntWait: "Stadtjagd · Wartezeit",
      yourTarget: "Euer Ziel",
      taskOf: (current, total) => `Aufgabe ${current} von ${total}`,
      openOf: (open, total) => `${open} von ${total} Aufgaben offen`,
      followFree: "Lauft zum nächsten offenen Punkt — Pfeil und Meter kommen vom Team Lead.",
      followLinear: "Folgt dem Pfeil. Die Meter zählen auf dem Handy vom Team Lead.",
      walkLeadCounts: "Dein Handy zählt die Meter fürs ganze Team. Die anderen Geräte folgen diesem Stand.",
      walkFollowCounts: "Das Handy vom Team Lead zählt die Strecke. Euer Ring zeigt denselben Stand.",
      arrived: "Ihr seid da! Der Wegpunkt hat sich aktiviert.",
      openWaypoint: "Wegpunkt öffnen",
      walkToPin: (meters) =>
        `Lauft zum Wegpunkt. Bei ca. ${meters} m piept es und ihr könnt öffnen.`,
      gpsInaccurate: (meters) =>
        `GPS ungenau — Radius automatisch um ${meters} m erweitert.`,
      studioTitle: "Studio-Test — du musst nicht in der Stadt sein",
      studioOpen: "Aufgabe hier auslösen",
      simArrive: "Ankunft simulieren (Dev)",
      waitOver: "Zeit abgelaufen — öffnet die Aufgabe.",
      waitReady: "Bereit",
      waitLeft: (minutes) => `Noch ca. ${minutes} Min. nach der vorherigen Aufgabe warten.`,
      gpsTrouble: "GPS-Problem?",
      gpsTroubleHint: "Wir stehen davor, oder der Standort kommt nicht — kurze Auswahl.",
      gpsHere: "Wir stehen direkt davor — GPS greift nicht",
      gpsBroken: "GPS funktioniert nicht richtig",
      gpsUnlock: "Aufgabe freischalten",
      gpsUnlockLead: "Alpha / GPS-Leiter schaltet den Punkt fürs Team frei.",
      gpsSkip: "Ohne GPS freischalten",
      gpsSkipLead: "Ohne GPS: Alpha tippt „Aufgabe freischalten“.",
      geoDenied: "Standort ist blockiert. In den Browser-Einstellungen erlauben, dann neu laden.",
      geoUnsupported: "GPS wird von diesem Gerät nicht unterstützt.",
      geoUnavailable: "Standort gerade nicht verfügbar. Draußen bleiben und nochmal versuchen.",
      geoTimeout: "GPS braucht zu lange. Draußen bleiben, genaue Position nutzen, neu laden.",
      indoorDone: (done, total) => `${done} von ${total} Stationen gelöst`,
      indoorFree: "Sucht den Zettel im Raum, tippt die Station an und gebt den Code ein.",
      indoorNext: "Der nächste Punkt ist frei. Sucht den Zettel, tippt die Station an, Code eingeben.",
      solved: "Gelöst",
      wrong: "Falsch",
      lockedPrev: "Noch gesperrt — erst die Station davor",
      findNote: "Zettel suchen, dann Code",
      codeHint: "Code vom Zettel dieser Station — 4 Zeichen, Zahlen und Buchstaben.",
      checkCode: "Code prüfen",
      allStationsDone: "Alle Stationen gelöst — auf zur Auswertung!",
      nextUp: (name) => `Als Nächstes: ${name}`,
      missionOf: (n, total) => `Mission ${n} von ${total}`,
      onlineHint: (done) => `${done} gelöst · Tippt auf Start, um Quiz und Level zu öffnen.`,
      startMission: "Mission starten",
      mapAtPoint: "Ihr seid am Punkt.",
      mapTarget: "Ziel",
      mapWalked: (walked, start) =>
        start != null ? `${walked} m gelaufen · Start ${start} m` : `${walked} m gelaufen`,
      mapLeadCounts: "Dein Handy zählt die Meter fürs Team.",
      mapFollowCounts: "Das Handy vom Team Lead zählt die Meter.",
      mapSearching: "GPS wird gesucht…",
      mapWaitLead: "Warten auf die Position vom Team Lead.",
      mapFar: "Noch weit. Wegpunkt ab unter 12 km.",
      mapNavigate: "Route",
      walkFree: "Lauft frei — kein fester Punkt nötig",
      walkDone: "Fertig",
      metersLeft: "Meter übrig",
      metersWalked: (m) => `${m} m gelaufen`,
      walkComplete: "Strecke geschafft — öffnet jetzt die Aufgabe.",
      walkFill: "Der Ring füllt sich, während ihr lauft. Am Ziel vibriert das Gerät und es piept.",
      simulateWalk: "+25 m am Tisch",
      forceWalkHint:
        "Nur wenn GPS hängt oder die Strecke klar gelaufen ist — Alpha entscheidet fürs Team.",
    },
    phase: {
      keyTitle: "Der Schlüssel öffnet das Level",
      keySubtitle: "Gleich kommt die eigentliche Aufgabe — kurz warten.",
      bonusElse: (name) => `Bonus läuft bei ${name} — ihr könnt weiter.`,
      stationOpen: "Station geöffnet",
      missionStarted: "Mission gestartet · alle gleichzeitig",
      waypointReached: "Wegpunkt erreicht",
    },
    quiz: {
      headingOnline: "Einstiegsfrage",
      headingIndoor: "Frage vor Ort",
      headingOutdoor: "Umgebungsquiz",
      introOnline: "Eine Antwort genügt — sie öffnet das Rätsel für alle.",
      introTeam: "Eine Antwort vom Team öffnet das Rätsel für alle.",
      unlockAll: "Level für alle aufschließen",
      unlock: "Level aufschließen",
      key: "Schlüssel",
      checking: "Wird geprüft…",
      sendTeam: "Antwort fürs Team senden",
      chosen: "Gewählt",
      rightPoints: (points) => `Richtig! +${points} Punkte — der Schlüssel passt.`,
      right: "Richtig! Der Schlüssel passt.",
      wrongKey: "Leider falsch — der Schlüssel passt trotzdem, aber ohne Bonuspunkte.",
      unlocking: "Schließt auf…",
      answeredBy: (name) => `Antwort von ${name}`,
      didYouKnow: "Wusstet ihr?",
    },
    solve: {
      skipped: "Übersprungen",
      solution: (text) => `Lösung: ${text}`,
      leadConfirms:
        "Der Team-Leiter bestätigt diesen Wegpunkt vor Ort. Ihr könnt parallel Hinweise nutzen und Rätsel lösen.",
      confirming: "Wegpunkt wird bestätigt…",
      atTargetAuto: "Am Ziel — wird automatisch aktiviert",
      atTarget: "Am Ziel",
      autoConfirm: "Kein Tippen nötig — der Wegpunkt wird automatisch bestätigt.",
      walkToStart: "Zum Zielpunkt laufen — die Aufgabe startet automatisch in der Nähe.",
      confirmWaypoint: "Wegpunkt bestätigen",
      checkAnswer: "Antwort prüfen",
      sendAnswer: "Antwort senden",
      gpsHang: "Wenn GPS hängt — Alpha öffnet fürs Team.",
      placeholder: "Lösung eingeben",
      placeholderAnswer: "Antwort eintragen…",
      sending: "Sende…",
      completeTask: "Aufgabe abschließen",
      gpsLead: "GPS · Team-Leiter",
      gpsOnSite: "Team-Leiter vor Ort",
      doneZero: "Aufgabe abgeschlossen · 0 Punkte",
      continue: "Weiter",
      locating: "Standort wird ermittelt…",
      distance: "Entfernung:",
      stillWalking: "Noch unterwegs",
      allowLocation: "Standortfreigabe im Browser erlauben.",
      answerLabel: "Antwort",
      taskN: (n) => `Aufgabe ${n}`,
    },
    bonus: {
      running: "Bonusaufgabe läuft",
      nextForAll: "Nächste Aufgabe für alle",
      nextForYouPlural: "Folgende Aufgabe ist für euch",
      nextForYou: "Folgende Aufgabe ist für dich",
      readyAll: "Macht euch bereit — die Bonusaufgabe erscheint gleich auf jedem Gerät.",
      readyPlural: "Nur auf euren Handys. Danach seid ihr wieder beim Team.",
      readySolo: "Nur auf deinem Handy. Danach bist du wieder bei deinem Team.",
      title: "Bonusaufgabe",
      teamSees: "Diese Bonusaufgabe sehen alle im Team. Eine Antwort gilt für alle.",
      checkAnswer: "Antwort prüfen",
      skipZero: "Überspringen · 0 Punkte",
      whoTakes: "Wer übernimmt?",
      cantDo: "Geht bei mir nicht — wer übernimmt?",
      pointsTeam: (n) => `+${n} Punkte für das Team.`,
      videoGallery: "Das Video liegt in der Team-Galerie. Ihr könnt es später herunterladen.",
      photoGallery: "Das Bild liegt in der Team-Galerie. Ihr könnt es später herunterladen.",
      timedOut: "Zeit abgelaufen — die Bonusaufgabe gilt als nicht gelöst",
      notAnswered: (name) => `${name} konnte die Aufgabe nicht beantworten`,
      zeroExtraLead: (lead) => `0 Extra-Punkte — ${lead} geht weiter, wenn ihr soweit seid.`,
      rightAnswer: "Richtige Antwort",
      backToTeam: "Zurück zum Team",
      continueTo: (hub) => `Weiter zur ${hub}`,
      theyAreUp: (name) => `${name} ist dran`,
      theyAreUpPlural: (name) => `${name} sind dran`,
      onlySees: (name) => `Nur ${name} sieht die Aufgabe.`,
      onlySee: (name) => `Nur ${name} sehen die Aufgabe.`,
      thenHub: (hub) => `Danach geht es für alle weiter zur ${hub}.`,
      attemptTimeout: "Zeit abgelaufen",
      placeholder: "Antwort eintragen…",
      skippedBy: (name) => `${name} hat die Bonusaufgabe übersprungen`,
      scoredBy: (name, n) => `${name} hat ${n} Punkte gerade geholt`,
      failedBy: (name) => `${name} konnte die Aufgabe nicht beantworten`,
      solvingNow: (name) => `${name} löst gerade eine Bonusaufgabe`,
      noExtra: "Keine Extra-Punkte.",
      extraZero: "0 Extra-Punkte.",
      wholeTeam: "Ganzes Team",
      videoSent: "Video gesendet",
      photoSent: "Foto gesendet",
      skipTeam: "Weiter ohne Bonus (Team)",
    },
    hint: {
      unlock: "Tipp freischalten",
      cost: (n) =>
        `Kostet ${n} Punkte vom Team-Score — auch ins Minus. Pro Kachel gibt es einen Tipp.`,
      confirm: "Freischalten & anzeigen",
      loading: "Wird geladen…",
      cancel: "Abbrechen",
      unlocked: "Tipp freigeschaltet",
      toastTitle: "Tipp fürs Team",
      toastBy: (name) => `${name} hat einen Tipp freigeschaltet`,
      teammate: "Teammitglied",
      byForTeam: (name) => `Von ${name} fürs Team`,
      understood: "Verstanden",
      unlockPts: (n) => `Tipp freischalten (−${n} P)`,
    },
    reveal: {
      or: "oder",
      stuck: "Stecken fest",
      show: "Lösung anzeigen",
      zeroPoints: "Aufgabe zählt mit 0 Punkten",
      giveUp: "Aufgeben",
      showQ: "Lösung anzeigen?",
      body: "Die Aufgabe gilt danach als erledigt, bringt aber 0 Punkte. Das lässt sich nicht rückgängig machen.",
      ok: "OK — Lösung anzeigen",
      back: "Zurück zum Rätsel",
    },
    feedback: {
      notYet: "Noch nicht richtig",
      yourInput: "Eure Eingabe:",
      tryAgain: "Versucht es erneut.",
      keepGoing: "Probiert es weiter — ihr schafft das.",
      recognized: "Antwort erkannt — stark!",
    },
    helpNudge: {
      notSolution: "Noch nicht die Lösung",
      noInput: "Lange keine Eingabe",
      buyHint:
        "Ihr könnt einen Tipp auf einer Kachel freischalten — das kostet Punkte, bringt euch aber weiter.",
      noHintSkip:
        "Kein Tipp hinterlegt. Die Team-Leitung kann die Aufgabe unten freischalten (Lösung anzeigen, 0 Punkte).",
      openHelp: "Tippt, was gerade nicht klappt — oder schaut ins FAQ.",
      whatsWrong: "Was ist los?",
      keepSolving: "Weiter rätseln",
    },
    menuTour: {
      title: "Oben rechts: euer Menü",
      body: "Wallet, Regeln und Hilfe liegen hinter den drei Punkten. Einmal merken — dann geht’s auf die Karte.",
      start: "Zur Karte",
      pointer: "Hier tippen",
    },
    transition: {
      keyFits: "Schlüssel passt",
      bonusReady: "Bonus steht bereit",
      loadingLevel: "Hauptaufgabe wird geladen…",
      loadingBonus: "Bonusaufgabe wird geladen…",
      loadLevelAria: "Lädt die Hauptaufgabe",
      loadBonusAria: "Lädt die Bonusaufgabe",
      toTask: "Zur Aufgabe",
      startBonus: "Bereit — Bonus starten",
    },
    sync: {
      zeroPoints: "0 Punkte",
      taskDone: "Aufgabe geschafft",
      solved: "Gelöst!",
      points: (n) => `${n >= 0 ? "+" : ""}${n} Punkte`,
      taskN: (n) => `Aufgabe ${n}`,
      skippedHeadline: "Nicht gelöst",
      skippedWallet: "Den Hinweis holt ihr in der Wallet — gegen Punkte.",
    },
    tiles: {
      one: "Rätselkachel",
      many: (n) => `${n} Rätselkacheln`,
      tapOpen: "Antippen zum Öffnen",
      swipeOrTap: "Alle Kacheln ansehen — dann lösen",
      switchAria: "Andere Kachel öffnen",
      lookAtAll: "Wechsle oben zwischen den Kacheln",
      soloMedia: "Solo-Modus: Du siehst alle Medien auf deinem Gerät.",
      hintsAria: "Hinweise und Medien",
      hintBadge: "Tipp",
      mediaHeading: "Hinweise & Medien",
      image: "Bild",
      video: "Video",
      audio: "Audio",
      panorama: "360°",
      minigame: "Mini-Spiel",
      pdf: "PDF",
      content: "Inhalt",
    },
    scoring: {
      timesUp: "Zeit abgelaufen — 0 Punkte erreichbar",
      pointsNow: (n, label) => `${n} ${label} erreichbar, wenn du jetzt abschließt`,
      point: "Punkt",
      points: "Punkte",
      noCountdown: "Kein Countdown",
      stillPrefix: "Noch ",
    },
    capture: {
      camMissing: "Kamera nicht verfügbar. Datei aus der Galerie wählen.",
      camDenied: "Kamera-Zugriff abgelehnt oder nicht möglich. Ihr könnt eine Datei wählen.",
      videoUnsupported: "Video-Aufnahme in diesem Browser nicht möglich. Datei wählen.",
      noTake: "Keine Aufnahme. Bitte nochmal aufnehmen.",
      noSession: "Session fehlt. Bitte Seite neu laden und nochmal senden.",
      tooBig: "Datei zu groß (max. 25 MB). Kürzer aufnehmen.",
      badFormat: "Dieses Dateiformat wird nicht unterstützt.",
      uploadFail: "Upload fehlgeschlagen. Bitte nochmal senden.",
      sendFail: "Senden fehlgeschlagen. Bitte nochmal versuchen.",
      videoMax: (s) => `Video darf höchstens ${s} Sekunden lang sein.`,
      takeVideo: "Video aufnehmen",
      photoFrame: "Foto mit Rahmen",
      takePhoto: "Foto machen",
      nativeHint:
        "Öffnet die Handy-Kamera — Selfie umdrehen geht dort. Danach prüft ihr das Foto hier und sendet.",
      openCam: "Kamera öffnen",
      skipZero: "Überspringen · 0 Punkte",
      secLeft: (s) => `${s} s übrig`,
      closeCam: "Kamera schließen",
      savePhone: "Aufs Handy speichern",
      saving: "Speichern…",
      send: "Senden",
      fromGallery: "Aus der Galerie",
      retake: "Neu versuchen",
      stopRecording: (s) => `Aufnahme stoppen · ${s} s`,
      unknownKind: "Unbekannter Aufnahme-Typ.",
      noFile: "Keine Datei ausgewählt.",
      sendVideo: "Bitte ein Video senden.",
      sendPhoto: "Bitte ein Foto senden.",
      expectVideo: "Diese Aufgabe erwartet ein Video.",
      expectPhoto: "Diese Aufgabe erwartet ein Foto.",
      noCapture: "Diese Aufgabe nimmt keine Aufnahme entgegen.",
      galleryClosed: "Galerie ist jetzt nicht verfügbar.",
      galleryFail: "Galerie nicht geladen.",
      invalidUpload: "Upload ungültig.",
      uploadLinkFail: "Upload-Link fehlgeschlagen.",
    },
    over: {
      won: "Mission abgeschlossen!",
      timeUp: "Zeit ist abgelaufen.",
      gameOver: "Game Over",
      yourPoints: "Eure Punkte",
      revealedLine: (title) => `${title} · direkt gelöst · 0 Punkte`,
      summary: (solved, revealed) =>
        `${solved} gelöst · ${revealed} direkt gelöst · nur euer Team`,
      rateEvent: "Kurz bewerten — danach seht ihr das Ranking eures Events.",
      rateHighscore: "Kurz bewerten — danach seht ihr das All-Time-Highscore-Ranking.",
      openEvent: "Event-Ranking öffnen",
      openHighscore: "Highscore öffnen",
      later: "Für später",
      copyLink: "Link kopieren",
      copied: "Link kopiert",
      ranking: "Event-Ranking",
      highscore: "Highscore",
      closeRanking: "Ranking schließen",
      walletEmpty: "Noch leer",
      walletOne: "1 Hinweis",
      walletMany: (n) => `${n} Hinweise`,
      tasksCount: (n) => `${n} Aufgaben`,
      tasksOf: (done, total) => `${done} von ${total} Aufgaben`,
      tasksDone: (done, total) => `${done} von ${total} Aufgaben geschafft`,
      liveRankingEvent: "🏆 Live-Ranking eures Events",
      highscoreQ: "🏆 Wie habt ihr im Highscore abgeschnitten?",
      linkExpires: "Der Link wird nach 7 Tagen automatisch deaktiviert.",
      liveRankingThis: "Live-Ranking dieses Events",
      copyPrompt: "Link kopieren",
      expiredTitle: "Link abgelaufen",
      expiredBody: "Recap-Links sind nach 7 Tagen automatisch deaktiviert.",
    },
    gate: {
      loadingTitle: "Mission wird aufgebaut…",
      loadingSubtitle: "Inhalt und Team-Stand werden geladen. Bitte einen Moment Geduld.",
      loadingHint: "Bitte nicht neu laden — gleich geht’s weiter.",
      contentSlow: "Inhalt dauert zu lange. Bitte Start erneut tippen.",
      startSlow: "Start dauert zu lange. Bitte Start noch einmal tippen.",
      contentFail: "Inhalt konnte nicht geladen werden.",
      actionFail: "Aktion fehlgeschlagen.",
      missingPublished:
        "Level-Inhalt konnte nicht geladen werden — das Spiel hat keine veröffentlichten Aufgaben.",
      missingLevel: (n, ids) =>
        `Level ${n} fehlt im Content (verfügbar: ${ids}). Bitte Spiel neu veröffentlichen und neues Live-Event starten.`,
      videoMissing: "Video nicht verfügbar",
    },
    hud: {
      connected: "Verbunden",
      connecting: "Verbinde…",
      taskOf: (current, total) => `Aufgabe ${current} von ${total}`,
      stations: "Stationen",
      missions: "Missionen",
      levels: "Level",
      points: "Punkte",
      time: "Zeit",
      reconnecting: "Verbindung wird wiederhergestellt…",
      reconnectPlay: "Team-Sync kurz unterbrochen — du kannst weiterspielen.",
      liveRanking: "Live-Ranking",
      doneCount: (n) => `${n} erledigt`,
    },
    walletUi: {
      intro:
        "Hier landen die Hinweise, die in den Leveln gespeichert werden. Sobald nach einer Aufgabe eine Info fürs Team kommt, liegt sie in diesem Ordner — für alle im Team.",
      skippedSolution: "Lösung zum Level, das ihr direkt gelöst habt.",
      buyQ: (n) => `Hinweis für ${n} Punkte freischalten? Alle im Team sehen ihn danach.`,
      notEnough: (have, need) => `Nicht genug Punkte (habt ${have}, braucht ${need}).`,
      canShow: (n) => `Diesen Hinweis könnt ihr für ${n} Punkte anzeigen lassen.`,
      showFor: (n) => `Für ${n} Punkte anzeigen`,
      buying: "Wird gekauft…",
      buyYes: "Ja, kaufen",
      afterLevel: (n) => `Nach Level ${n}`,
      afterLevelSkipped: (n) => `Nach Level ${n} · nicht gesammelt`,
      boughtBy: (name) => `Gekauft von ${name}`,
    },
    notes: {
      heading: "Hinweise & Dokumente",
      noneSolo: "Solo-Modus: Für diese Aufgabe liegen keine extra Dokumente vor.",
      none: "Für diese Aufgabe liegen keine extra Dokumente vor.",
    },
    desk: {
      title: (m) => `Studio-Test · Bonus nach ${m} m`,
      hint: (walked, need) =>
        `${walked} / ${need} m — am Tisch simulieren oder draußen laufen. Beides zählt.`,
      showNow: "Bonus jetzt zeigen",
    },
    gallery: {
      loading: "Wird geladen…",
      empty: "Noch keine Aufnahme",
      one: "1 Aufnahme",
      many: (n) => `${n} Aufnahmen`,
      taskN: (n) => ` · Aufgabe ${n}`,
      title: "Eure Galerie",
      body: "Fotos und Videos dieses Teams — speichert sie aufs Handy, solange ihr wollt.",
      loadingBody: "Galerie wird geladen…",
      emptyBody: "Noch keine Aufnahme. Sobald ihr sendet, liegt sie hier.",
      save: "Speichern",
      photo: "Foto",
      video: "Video",
    },
    timeAlert: {
      oneMinute: "Noch 1 Minute",
      lastMinutes: "Die Zeit läuft ab — letzte Aufgaben, dann Game Over.",
    },
    action: {
      notPlaying: "Das Spiel läuft noch nicht.",
      notPlayingNow: "Das Spiel läuft gerade nicht.",
      levelInactive: "Dieses Level ist gerade nicht aktiv.",
      closeSyncFirst: "Bitte zuerst die Synchronisations-Meldung schließen.",
      solutionOpen: "Die Lösung liegt schon offen. Die Team-Leitung geht weiter.",
      levelMissing: "Level-Inhalt nicht gefunden.",
      onlyLead: "Nur die Team-Leitung kann weitergehen.",
      onlyGpsLead: "Nur Alpha / GPS-Leiter kann den Standort manuell freigeben.",
      noTileHint: "Für diese Kachel gibt es keinen Tipp.",
      hintAlready: "Dieser Tipp wurde bereits freigeschaltet.",
      noWalletAfterOver: "Nach Game Over könnt ihr keine Hinweise mehr kaufen.",
      levelNotFound: "Level nicht gefunden.",
      noLevelHint: "Für dieses Level gibt es keinen Hinweis.",
      hintAfterSkip: "Diesen Hinweis könnt ihr erst nach Skip kaufen.",
      revealForbidden: "Lösung anzeigen ist hier nicht erlaubt.",
      teamNotLobby: "Team ist nicht in der Lobby.",
      teamMissing: "Team nicht gefunden.",
      phaseInactive: "Phasen-Flow ist für dieses Event nicht aktiv.",
      badCode: "Diesen Code gibt es hier nicht.",
      stationDone: "Diese Station ist schon gelöst.",
      levelLocked: "Dieses Level ist noch gesperrt.",
      levelDone: "Dieses Level ist schon gelöst.",
      badOverride: "Dieser Override passt nicht zum aktuellen Unlock.",
      enterStation: "Stationscode eingeben — der Code hängt an der Station im Raum.",
      onlyGpsTrack: "Nur Alpha / GPS-Leiter trackt die Strecke.",
      noQuiz: "Gerade ist kein Quiz aktiv.",
      noUnlockQuiz: "Kein Freischalt-Quiz für dieses Level.",
      quizUnanswered: "Quiz noch nicht beantwortet.",
      bonusUnanswered: "Bonus noch nicht beantwortet.",
      noActiveBonus: "Kein aktiver Bonus.",
      bonusOtherPlayer: "Diese Bonusaufgabe ist für jemand anderen.",
      bonusOtherRole: "Diese Bonusaufgabe ist für eine andere Rolle.",
      pickAnswer: "Bitte eine Antwort auswählen.",
      noBonusPhase: "Keine Bonusphase aktiv.",
      pickSomeoneElse: "Bitte jemand anderen auswählen.",
      alreadyTeamBonus: "Diese Aufgabe sehen schon alle.",
      alreadyAnswered: "Die Aufgabe ist schon beantwortet.",
      onlyHolderHandsOff: "Nur wer die Aufgabe hat, kann sie weitergeben.",
      teammateMissing: "Mitspieler nicht gefunden.",
      eventMissing: "Event nicht gefunden.",
      sessionExpired: "Deine Session ist abgelaufen. Tritt mit deinem Spielernamen erneut bei.",
      sessionInvalid: "Session ungültig.",
      unknown: "Unbekannter Fehler",
      phaseUpdate: "Phasen-Update fehlgeschlagen.",
    },
    media: {
      close: "Schließen",
      noUrl: "Noch keine Medien-URL hinterlegt.",
    },
    growth: {
      copiedText: "Text kopiert",
      sendFriends: "An Freunde senden",
      copiedCode: "Code kopiert",
      useCode: "Selbst nutzen · Code kopieren",
      familyHeadline: "Mit Familie & Freunden spielen",
      familyBody:
        "20 % auf euer nächstes Exitmania-Spiel. Selbst einlösen — oder mit einem Tipp an Freunde senden.",
      familyCta: "Per Messenger senden",
      familyBadge: (percent, days) => `${percent} % · ${days} Tage · Team bis 4`,
      familyNote: (until) => `Einlösbar bis ${until}. Gilt für alle.`,
      shareTitle: "Schlag mich, wenn du kannst",
      shareChallenge: (score) => `${score} Punkte. Schlag mich, wenn du kannst 🔥`,
      shareChallengePlain: "Schlag mich, wenn du kannst 🔥",
      shareCodeLine: (percent, code, days) =>
        `🎟️ ${percent} %-Code: ${code} — ${days} Tage, Team bis 4 Personen`,
    },
    walletHint: {
      empty: "Gesammelte Hinweise aus den Leveln",
      mixed: (open, locked) => `${open} gesammelt · ${locked} kaufbar`,
      lockedOne: "1 Hinweis kaufbar",
      lockedMany: (n) => `${n} Hinweise kaufbar`,
      openOne: "1 Hinweis gesammelt",
      openMany: (n) => `${n} Hinweise gesammelt`,
    },
  },
  en: {
    close: "Close",
    back: "Back",
    you: "you",
    copied: "Copied!",
    wallet: "Wallet",
    pause: "Pause",
    team: "Team",
    faq: "FAQ",
    support: "Support",
    intro: {
      rules: "How to play",
      start: "Start the game",
      modalTitle: "Are you at the start?",
      modalBody: "Only start the game when you are about 100 metres from the starting point.",
      maps: "Open walking directions",
      confirm: "We are nearby",
      rulesEmpty: "This game has no rules page yet.",
    },
    setup: {
      intro: "Team name for the ranking, your name for the team — then you enter the waiting area.",
      teamLabel: "Team name",
      teamHint: "How you appear on the ranking",
      teamPreview: "Ranking name",
      teamPlaceholder: "e.g. Berlin Explorers",
      nameLabel: "Your name",
      nameHint: "Your name in the team",
      namePreview: "Your display name",
      namePlaceholder: "e.g. Alex",
      submit: "Continue to waiting area",
      pending: "Just a moment…",
      studioTest: "Studio test",
      teamCode: (code) => `Team code ${code}`,
    },
    startFlow: {
      eyebrow: "Welcome",
      testEyebrow: "Test game",
      description: "Set a team name and your name — then you enter the waiting area.",
      back: "← Back",
      backToIntro: "← Back to intro",
      event: "Event",
    },
    lobbyPage: {
      eyebrow: "Get ready",
      manageEyebrow: "Team",
      description: "Read the rules — then start.",
      teamPrefix: (name) => `Team ${name}`,
    },
    lobby: {
      loading: "Loading waiting area…",
      loadError: "Could not load the waiting area.",
      backToName: "Back to name entry",
      ready: "Get ready",
      waiting: "Waiting area",
      helloSolo: (name) => `Hi ${name} — read the notes, then you can start.`,
      helloTeam: (name, count, cap) => `Hi ${name} · ${count}/${cap} in the team`,
      rules: "How to play",
      rulesHint: "Please read before you start",
      rulesHintCountdown: (countdown) => `Please read now — start in ${countdown}`,
      readNow: "Read now",
      rulesEmpty: "This game has no rules page yet. You can also find them later in the play menu.",
      playingHint: "Game in progress.",
      backToPlay: "Back to the game",
      autoStartFull: "Team full — auto start",
      autoStart: "Auto start",
      autoStartAlpha: "You can also start earlier.",
      autoStartWait: "The team lead can also start earlier.",
      yourTeam: "Your team",
      inviteFriends: "Invite friends",
      inviteTestDevices: "Invite more test devices",
      seatsFree: (left, cap) => `${left} of ${cap} seats left`,
      copyInvite: "Copy invite link",
      start: "Start game",
      starting: "Starting…",
      waitForLead: "Wait for the team lead to start — use the time to read the rules.",
      manageRoles: "Manage roles",
      manageRolesHint: "Who leads, who sees hints, who plays bonus",
      roleLegend: (alpha, beta, gamma) =>
        `${alpha} starts & GPS · ${beta} hints · ${gamma} bonus tasks`,
      noTeammates: "No teammates yet",
      noTeammatesHint: "Once someone joins, you can assign roles here.",
      giveLead: "Give lead",
      releaseSeat: "Free up seat",
      youAreLead: "You are the team lead.",
      handoverBusy: "Freeing up your seat…",
      handoverBusyHint: "You can sign in again afterwards.",
      qrAlt: "QR code to join",
      qrHint: "Friends scan the code — and they’re in.",
      waitTimeout: "Waiting room isn’t responding.",
      shownHere: "Shown here",
      leadHints: "Team lead · hints",
      handoffEyebrow: "No longer in the game",
      handoffTitle: "Someone else is using this access",
      handoffBody: (name) =>
        `${name}, your seat is now running on another device. If that was accidental, reclaim the role here — the other device will be signed out.`,
      handoffCta: "Continue play here",
      handoffPending: "Taking over…",
      manageTeam: "Manage team",
      eventHome: "Home",
      signedInAs: (name) => `Signed in as ${name}`,
    },
    joinPage: {
      notFoundTitle: "Team not found",
      notFoundBody: "That code doesn’t match — ask your team for the right link.",
      backToEvent: "Back to the event",
      playingEyebrow: "Resume play",
      inviteEyebrow: "Invite",
      inviteFrom: (captain, team) => `${captain} invites you to “${team}”.`,
      joinTeam: (team) => `Join team “${team}”.`,
    },
    join: {
      checking: "Just a moment…",
      inviteFrom: (captain) => `${captain} invites you to play`,
      yourTeam: "Your team",
      seats: (count, cap) => `${count} of ${cap} seats`,
      pickName: "Pick your name — or enter a new one if there’s a seat left.",
      midGame: "The game is running. Enter your name.",
      enterName: "Enter your name. Then you’ll join the others.",
      alreadyIn: "Already in the team",
      thatsMe: "That’s me",
      alreadyHint: "If you were already in, pick your name. The other device will be signed out.",
      teamFull: "The team is full. Only existing names can reconnect.",
      newName: "New name",
      yourName: "Your name",
      nameHint: "How you appear in the team",
      namePreview: "Your display name",
      namePlaceholder: "e.g. Alex",
      pending: "Just a moment…",
      joinNew: "Join as new",
      start: "Let’s go",
    },
    overlay: {
      multiTitle: "All devices loading…",
      multiSubtitle: "The mission starts together — nobody goes alone.",
      soloTitle: "Game starting…",
      soloSubtitle: "Preparing the map — just a moment.",
      hint: "Please don’t reload — you’re almost there.",
    },
    introVideo: {
      title: "INTRO VIDEO",
      subtitle: "Watch the video — then you go to the map.",
      continue: "Continue to the map",
      fullscreenHint: "Use the YouTube player for fullscreen",
    },
    gpsLead: {
      title: "Location for the map",
      body: "As team lead you open the waypoints. The browser needs your location — otherwise you won’t see where you are.",
      stepsIos:
        "iPhone: Settings → Safari (or Chrome) → Location → Allow. Then reload here.",
      stepsAndroid:
        "Android: tap the lock in the address bar → Permissions → allow Location. Then reload.",
      stepsDesktop:
        "Lock icon in the address bar → Location → Allow. Then reload the page.",
      settings: "Go to settings",
      reload: "Reload page",
      giveLead: "Hand the lead to someone else",
      soloHint: "You’re playing alone — turn location on here, then reload.",
    },
    gpsHelp: {
      intro:
        "GPS opens the waypoints. If location is missing, it is almost always blocked in the browser or on the phone — not in the game.",
      noDialogTitle: "No location prompt?",
      noDialogBody:
        "If no GPS dialog appears, the phone has blocked location for this browser. Allow it in Settings — or give the GPS role to someone else on the team.",
      iosTitle: "iPhone / iPad",
      iosSteps: [
        "Open Settings",
        "Scroll to Safari — or Chrome, if that’s the browser you play in",
        "Location → Allow (not Ask or Never)",
        "Come back to the game and reload the page",
      ],
      androidTitle: "Android",
      androidSteps: [
        "Tap the lock in the address bar",
        "Open Permissions",
        "Allow Location",
        "Reload the page",
      ],
      desktopTitle: "Computer",
      desktopSteps: [
        "Click the lock in the address bar",
        "Location → Allow",
        "Reload the page",
      ],
      tryAgainHint:
        "Tap so the browser asks for location again. If no dialog appears, location is blocked — change Settings or hand over the role.",
      giveLeadHint:
        "Someone with working GPS takes the lead. Then nobody has to play without location.",
      lastResortTitle: "Only if it really cannot work",
      lastResortBody:
        "Unlock without GPS only if nobody else can take the role — or the waypoint is unreachable (construction, a closed path).",
      menuHint: "Allow location — iPhone and Android",
    },
    resume: {
      copyIdle: "Copy to phone",
      copyDone: "Copied — paste into Notes",
      copyFail: "Copy failed",
      compactTitle: "Team code for a new phone",
      compactHint: "Then save it in Notes or send it to yourself.",
      lobbyTitle: "Save the code on your phone",
      lobbyHint: "Keep it somewhere on the phone — Notes, a photo, or a message to yourself.",
      stepTap: "1. Tap",
      stepSave: "2. Save",
      stepDone: "3. Done",
    },
    menu: {
      title: "Game menu",
      moreAria: "More options",
      rulesHint: "Read the flow again",
      stuck: "Stuck?",
      faqHint: "Answers on play and tech",
      supportHint: "Talk to the team",
      pauseHint: "Hold the clock",
      resume: "Resume",
      resumeHint: "Countdown running again",
      teamHint: "Names, code, lead",
      howItWorks: "How it works",
      openFullRules: "Open full rules",
      understood: "Got it",
      helpPrompt: "Tap what’s not working.",
      atPoint: "We’re at the point",
      atPointHint: "GPS isn’t opening the task",
      stationCode: "Station or code",
      stationCodeHint: "Note missing, or the code doesn’t work",
      notInSync: "Not everyone sees the same",
      notInSyncHint: "Reload the page or get the team code",
      puzzleStuck: "The puzzle is stuck",
      puzzleStuckHint: "Back to the task — get a hint or the solution",
      screenFrozen: "Screen frozen",
      screenFrozenHint: "Reload the page — nothing is lost",
      otherPhone: "Another phone",
      otherPhoneHint: "Get the team code and type your name",
      howToPlay: "How the game works",
      gpsTitle: "Location / GPS",
      gpsPrompt: "What should happen now?",
      gpsAtPoint: "We’re at the point",
      gpsAtPointHint: "The task should start now.",
      openTaskNow: "Open task now",
      openTask: "Open task",
      atPointCta: "We're at the point",
      openAnywayShort: "Open task anyway",
      leadOpens: "The team lead taps “We're at the point” on the map.",
      checkLocation: "Check location on the phone",
      openAnyway: "Open anyway",
      stationTitle: "Station / code",
      noNote: "We can’t find the note",
      noNoteHint:
        "The code is in the room — signs, tables, walls. Then tap the station and enter the code.",
      codeRejected: "Code not accepted",
      codeRejectedHint:
        "Use the code from this note. Caps don’t matter. A different note is a different station.",
      devicesTitle: "Devices",
      someoneLeft: "Someone dropped out or switched phones",
      someoneLeftHint: "Get the team code and type the same name.",
      getTeamCode: "Get team code",
      reloadTitle: "Screen frozen",
      reloadReassure: "No worry — same as a refresh. Then just keep playing.",
      reloadPage: "Reload page",
      faqEmpty:
        "This game has no FAQ link yet. Use the support chat or ask the game host if something’s wrong.",
      supportEmpty: "Support chat isn’t set up yet.",
      supportTitle: "Support chat",
      pauseBody:
        "The game is paused. The clock is stopped — nothing keeps running. You can close the app. Resume anytime, even days later.",
      whoPlays: "Who’s playing",
      sameName: "New phone? Type the same name.",
      giveLeadTitle: "Hand over the lead",
      giveLeadHint: "You lead the team. Tap who should lead next.",
      transferring: "Transferring…",
      playingAlone: "You’re playing alone — the lead stays with you.",
      leadStarts: "The team lead starts the tasks.",
      reclaimTitle: "Reclaim session",
      reclaimHint: "If you got kicked out",
      releaseMine: "Free up my seat",
      waitMoment: "Just a moment…",
      pausedBanner: "Game paused",
      tapToResume: "Tap to resume",
      gpsSettings:
        "Settings → turn on location for the browser. Stay at the point — that’s how the game is fun.",
      indoorTip:
        "Indoor doesn’t need GPS. Find the note at the station and enter the code — that opens the task.",
      onlineTip:
        "All devices should see the same thing. Reload, wait a moment, or go to /go with the same team code and your name.",
      reloadTip:
        "If nothing moves or scrolls: reload the page. You’re right back here — score, team and progress stay.",
      skipHeadline: "Not solved",
      skipWallet: "Get the hint from the wallet — for points.",
      helpMenuOutdoor: "GPS, hint or another phone",
      helpMenuIndoor: "Code, hint or another phone",
      helpMenuOnline: "Hint, connection or another phone",
      howOutdoor: "Walk to the point, open the task, solve it together",
      howIndoor: "Tap stations, enter the code from the note, then quiz and task",
      howOnline: "Start the mission — every device solves the same thing, no walking",
      rulesOutdoor: [
        { title: "Walk to the pin", body: "The map shows the next point. Walk there." },
        {
          title: "Team lead opens",
          body: "Only they activate the task when you’re close enough.",
        },
        {
          title: "Solve together",
          body: "Once the task is open, anyone can tap.",
        },
        {
          title: "If you’re stuck",
          body: "Three dots top right: hint, solution, or change lead (menu → Team).",
        },
      ],
      rulesIndoor: [
        { title: "To the station", body: "Find the note at the station." },
        {
          title: "Enter the code",
          body: "The team lead enters the code — that opens the task.",
        },
        {
          title: "Solve together",
          body: "Once the task is open, anyone can tap.",
        },
        {
          title: "If you’re stuck",
          body: "Three dots top right: hint, solution, or change lead (menu → Team).",
        },
      ],
      rulesOnline: [
        {
          title: "Start the mission",
          body: "The team lead starts. Every device sees the same task.",
        },
        {
          title: "Solve together",
          body: "Anyone can tap once the task is open.",
        },
        {
          title: "Remember clues",
          body: "What you solve you often need later. Check the wallet if needed.",
        },
        {
          title: "If you’re stuck",
          body: "Three dots top right: hint, solution, or change lead.",
        },
      ],
    },
    hub: {
      hunt: "City hunt",
      huntWalk: "City hunt · Distance",
      huntWait: "City hunt · Waiting",
      yourTarget: "Your target",
      taskOf: (current, total) => `Task ${current} of ${total}`,
      openOf: (open, total) => `${open} of ${total} tasks open`,
      followFree: "Walk to the next open point — arrow and metres come from the team lead.",
      followLinear: "Follow the arrow. Metres count on the team lead’s phone.",
      walkLeadCounts: "Your phone counts the metres for the whole team. The other devices follow this.",
      walkFollowCounts: "The team lead’s phone counts the distance. Your ring shows the same.",
      arrived: "You’re there! The waypoint is active.",
      openWaypoint: "Open waypoint",
      walkToPin: (meters) =>
        `Walk to the waypoint. At about ${meters} m it beeps and you can open it.`,
      gpsInaccurate: (meters) => `GPS is inaccurate — radius automatically expanded by ${meters} m.`,
      studioTitle: "Studio test — you don’t have to be in the city",
      studioOpen: "Trigger task here",
      simArrive: "Simulate arrival (dev)",
      waitOver: "Time’s up — open the task.",
      waitReady: "Ready",
      waitLeft: (minutes) => `Wait about ${minutes} min after the previous task.`,
      gpsTrouble: "GPS problem?",
      gpsTroubleHint: "You’re at the point, or location isn’t coming through — pick one.",
      gpsHere: "We’re right here — GPS isn’t picking it up",
      gpsBroken: "GPS isn’t working properly",
      gpsUnlock: "Unlock task",
      gpsUnlockLead: "Alpha / GPS lead unlocks the point for the team.",
      gpsSkip: "Unlock without GPS",
      gpsSkipLead: "Without GPS: Alpha taps “Unlock task”.",
      geoDenied: "Location is blocked. Allow it in the browser settings, then reload.",
      geoUnsupported: "GPS is not supported on this device.",
      geoUnavailable: "Location isn’t available right now. Stay outdoors and try again.",
      geoTimeout: "GPS is taking too long. Stay outdoors, use precise location, then reload.",
      indoorDone: (done, total) => `${done} of ${total} stations solved`,
      indoorFree: "Find the note in the room, tap the station, and enter the code.",
      indoorNext: "The next point is open. Find the note, tap the station, enter the code.",
      solved: "Solved",
      wrong: "Wrong",
      lockedPrev: "Still locked — finish the station before this one",
      findNote: "Find the note, then the code",
      codeHint: "Code from this station’s note — 4 characters, numbers and letters.",
      checkCode: "Check code",
      allStationsDone: "All stations solved — on to the recap!",
      nextUp: (name) => `Next: ${name}`,
      missionOf: (n, total) => `Mission ${n} of ${total}`,
      onlineHint: (done) => `${done} solved · Tap start to open the quiz and level.`,
      startMission: "Start mission",
      mapAtPoint: "You’re at the point.",
      mapTarget: "Target",
      mapWalked: (walked, start) =>
        start != null ? `${walked} m walked · start ${start} m` : `${walked} m walked`,
      mapLeadCounts: "Your phone counts the metres for the team.",
      mapFollowCounts: "The team lead’s phone counts the metres.",
      mapSearching: "Looking for GPS…",
      mapWaitLead: "Waiting for the team lead’s position.",
      mapFar: "Still far. Waypoint within 12 km.",
      mapNavigate: "Directions",
      walkFree: "Walk freely — no fixed point needed",
      walkDone: "Done",
      metersLeft: "metres left",
      metersWalked: (m) => `${m} m walked`,
      walkComplete: "Distance done — open the task now.",
      walkFill: "The ring fills as you walk. At the finish the phone vibrates and beeps.",
      simulateWalk: "+25 m at the desk",
      forceWalkHint: "Only if GPS is stuck or you clearly walked the distance — Alpha decides for the team.",
    },
    phase: {
      keyTitle: "The key opens the level",
      keySubtitle: "The actual task is next — just a moment.",
      bonusElse: (name) => `Bonus is running on ${name}’s phone — you can keep going.`,
      stationOpen: "Station open",
      missionStarted: "Mission started · everyone at once",
      waypointReached: "Waypoint reached",
    },
    quiz: {
      headingOnline: "Opening question",
      headingIndoor: "Question on site",
      headingOutdoor: "Location quiz",
      introOnline: "One answer is enough — it opens the puzzle for everyone.",
      introTeam: "One answer from the team opens the puzzle for everyone.",
      unlockAll: "Unlock the level for everyone",
      unlock: "Unlock the level",
      key: "Key",
      checking: "Checking…",
      sendTeam: "Send answer for the team",
      chosen: "Chosen",
      rightPoints: (points) => `Correct! +${points} points — the key fits.`,
      right: "Correct! The key fits.",
      wrongKey: "Wrong — the key still fits, but with no bonus points.",
      unlocking: "Unlocking…",
      answeredBy: (name) => `Answer from ${name}`,
      didYouKnow: "Did you know?",
    },
    solve: {
      skipped: "Skipped",
      solution: (text) => `Solution: ${text}`,
      leadConfirms:
        "The team lead confirms this waypoint on site. You can use hints and solve in parallel.",
      confirming: "Confirming waypoint…",
      atTargetAuto: "At the target — activating automatically",
      atTarget: "At the target",
      autoConfirm: "No tap needed — the waypoint confirms automatically.",
      walkToStart: "Walk to the target — the task starts automatically when you’re close.",
      confirmWaypoint: "Confirm waypoint",
      checkAnswer: "Check answer",
      sendAnswer: "Send answer",
      gpsHang: "If GPS is stuck — Alpha opens it for the team.",
      placeholder: "Enter solution",
      placeholderAnswer: "Type your answer…",
      sending: "Sending…",
      completeTask: "Complete task",
      gpsLead: "GPS · team lead",
      gpsOnSite: "Team lead on site",
      doneZero: "Task complete · 0 points",
      continue: "Continue",
      locating: "Finding your location…",
      distance: "Distance:",
      stillWalking: "Still on the way",
      allowLocation: "Allow location access in the browser.",
      answerLabel: "Answer",
      taskN: (n) => `Task ${n}`,
    },
    bonus: {
      running: "Bonus task running",
      nextForAll: "Next task for everyone",
      nextForYouPlural: "The next task is for you",
      nextForYou: "The next task is for you",
      readyAll: "Get ready — the bonus task will appear on every device.",
      readyPlural: "Only on your phones. Then you’re back with the team.",
      readySolo: "Only on your phone. Then you’re back with your team.",
      title: "Bonus task",
      teamSees: "Everyone on the team sees this bonus. One answer counts for all.",
      checkAnswer: "Check answer",
      skipZero: "Skip · 0 points",
      whoTakes: "Who takes over?",
      cantDo: "Can’t do this — who takes over?",
      pointsTeam: (n) => `+${n} points for the team.`,
      videoGallery: "The video is in the team gallery. You can download it later.",
      photoGallery: "The photo is in the team gallery. You can download it later.",
      timedOut: "Time’s up — the bonus counts as unsolved",
      notAnswered: (name) => `${name} couldn’t answer the task`,
      zeroExtraLead: (lead) => `0 extra points — ${lead} continues when you’re ready.`,
      rightAnswer: "Correct answer",
      backToTeam: "Back to the team",
      continueTo: (hub) => `Continue to ${hub}`,
      theyAreUp: (name) => `${name} is up`,
      theyAreUpPlural: (name) => `${name} are up`,
      onlySees: (name) => `Only ${name} sees the task.`,
      onlySee: (name) => `Only ${name} see the task.`,
      thenHub: (hub) => `Then everyone continues to ${hub}.`,
      attemptTimeout: "Time’s up",
      placeholder: "Type your answer…",
      skippedBy: (name) => `${name} skipped the bonus task`,
      scoredBy: (name, n) => `${name} just scored ${n} points`,
      failedBy: (name) => `${name} couldn’t answer the task`,
      solvingNow: (name) => `${name} is solving a bonus task`,
      noExtra: "No extra points.",
      extraZero: "0 extra points.",
      wholeTeam: "Whole team",
      videoSent: "Video sent",
      photoSent: "Photo sent",
      skipTeam: "Continue without bonus (team)",
    },
    hint: {
      unlock: "Unlock hint",
      cost: (n) =>
        `Costs ${n} points from the team score — even below zero. One hint per tile.`,
      confirm: "Unlock & show",
      loading: "Loading…",
      cancel: "Cancel",
      unlocked: "Hint unlocked",
      toastTitle: "Hint for the team",
      toastBy: (name) => `${name} unlocked a hint`,
      teammate: "Teammate",
      byForTeam: (name) => `From ${name} for the team`,
      understood: "Got it",
      unlockPts: (n) => `Unlock hint (−${n} pts)`,
    },
    reveal: {
      or: "or",
      stuck: "Stuck",
      show: "Show solution",
      zeroPoints: "Task counts as 0 points",
      giveUp: "Give up",
      showQ: "Show the solution?",
      body: "The task then counts as done, but scores 0 points. That can’t be undone.",
      ok: "OK — show solution",
      back: "Back to the puzzle",
    },
    feedback: {
      notYet: "Not quite",
      yourInput: "Your answer:",
      tryAgain: "Try again.",
      keepGoing: "Keep going — you’ve got this.",
      recognized: "Answer recognised — nice!",
    },
    helpNudge: {
      notSolution: "Not the solution yet",
      noInput: "No input for a while",
      buyHint:
        "You can unlock a hint on a tile — it costs points, but it keeps you moving.",
      noHintSkip:
        "No hint here. The team lead can unlock the task below (show solution, 0 points).",
      openHelp: "Tap what’s stuck — or check the FAQ.",
      whatsWrong: "What’s wrong?",
      keepSolving: "Keep solving",
    },
    menuTour: {
      title: "Top right: your menu",
      body: "Wallet, rules and help live behind the three dots. Remember that — then the map is yours.",
      start: "To the map",
      pointer: "Tap here",
    },
    transition: {
      keyFits: "Key fits",
      bonusReady: "Bonus is ready",
      loadingLevel: "Loading the main task…",
      loadingBonus: "Loading the bonus task…",
      loadLevelAria: "Loading the main task",
      loadBonusAria: "Loading the bonus task",
      toTask: "To the task",
      startBonus: "Ready — start bonus",
    },
    sync: {
      zeroPoints: "0 points",
      taskDone: "Task done",
      solved: "Solved!",
      points: (n) => `${n >= 0 ? "+" : ""}${n} points`,
      taskN: (n) => `Task ${n}`,
      skippedHeadline: "Not solved",
      skippedWallet: "Get the hint from the wallet — for points.",
    },
    tiles: {
      one: "Puzzle tile",
      many: (n) => `${n} puzzle tiles`,
      tapOpen: "Tap to open",
      swipeOrTap: "Look at every tile — then solve",
      switchAria: "Open another tile",
      lookAtAll: "Switch tiles up here",
      soloMedia: "Solo mode: you see all media on your device.",
      hintsAria: "Hints and media",
      hintBadge: "Hint",
      mediaHeading: "Hints & media",
      image: "Image",
      video: "Video",
      audio: "Audio",
      panorama: "360°",
      minigame: "Mini-game",
      pdf: "PDF",
      content: "Content",
    },
    scoring: {
      timesUp: "Time’s up — 0 points available",
      pointsNow: (n, label) => `${n} ${label} available if you finish now`,
      point: "point",
      points: "points",
      noCountdown: "No countdown",
      stillPrefix: "Left ",
    },
    capture: {
      camMissing: "Camera not available. Pick a file from the gallery.",
      camDenied: "Camera access denied or unavailable. You can pick a file.",
      videoUnsupported: "Video recording isn’t possible in this browser. Pick a file.",
      noTake: "No recording. Please shoot again.",
      noSession: "Session missing. Reload the page and send again.",
      tooBig: "File too large (max. 25 MB). Shoot a shorter clip.",
      badFormat: "This file format isn’t supported.",
      uploadFail: "Upload failed. Please send again.",
      sendFail: "Send failed. Please try again.",
      videoMax: (s) => `Video may be at most ${s} seconds.`,
      takeVideo: "Record video",
      photoFrame: "Photo with frame",
      takePhoto: "Take photo",
      nativeHint:
        "Opens the phone camera — flip to selfie there. Then check the photo here and send.",
      openCam: "Open camera",
      skipZero: "Skip · 0 points",
      secLeft: (s) => `${s} s left`,
      closeCam: "Close camera",
      savePhone: "Save to phone",
      saving: "Saving…",
      send: "Send",
      fromGallery: "From the gallery",
      retake: "Try again",
      stopRecording: (s) => `Stop recording · ${s} s`,
      unknownKind: "Unknown capture type.",
      noFile: "No file selected.",
      sendVideo: "Please send a video.",
      sendPhoto: "Please send a photo.",
      expectVideo: "This task expects a video.",
      expectPhoto: "This task expects a photo.",
      noCapture: "This task doesn’t take a capture.",
      galleryClosed: "The gallery isn’t available right now.",
      galleryFail: "Couldn’t load the gallery.",
      invalidUpload: "Invalid upload.",
      uploadLinkFail: "Couldn’t create the upload link.",
    },
    over: {
      won: "Mission complete!",
      timeUp: "Time is up.",
      gameOver: "Game over",
      yourPoints: "Your points",
      revealedLine: (title) => `${title} · shown directly · 0 points`,
      summary: (solved, revealed) =>
        `${solved} solved · ${revealed} shown directly · only your team`,
      rateEvent: "A quick rating — then you see your event ranking.",
      rateHighscore: "A quick rating — then you see the all-time highscore.",
      openEvent: "Open event ranking",
      openHighscore: "Open highscore",
      later: "For later",
      copyLink: "Copy link",
      copied: "Link copied",
      ranking: "Event ranking",
      highscore: "Highscore",
      closeRanking: "Close ranking",
      walletEmpty: "Still empty",
      walletOne: "1 clue",
      walletMany: (n) => `${n} clues`,
      tasksCount: (n) => `${n} tasks`,
      tasksOf: (done, total) => `${done} of ${total} tasks`,
      tasksDone: (done, total) => `${done} of ${total} tasks done`,
      liveRankingEvent: "🏆 Live ranking for your event",
      highscoreQ: "🏆 How did you do on the highscore?",
      linkExpires: "The link turns off automatically after 7 days.",
      liveRankingThis: "Live ranking for this event",
      copyPrompt: "Copy link",
      expiredTitle: "Link expired",
      expiredBody: "Recap links turn off automatically after 7 days.",
    },
    gate: {
      loadingTitle: "Building the mission…",
      loadingSubtitle: "Loading content and team state. Just a moment.",
      loadingHint: "Please don’t reload — you’re almost there.",
      contentSlow: "Content is taking too long. Tap Start again.",
      startSlow: "Start is taking too long. Tap Start again.",
      contentFail: "Could not load the content.",
      actionFail: "Action failed.",
      missingPublished:
        "Could not load level content — this game has no published tasks.",
      missingLevel: (n, ids) =>
        `Level ${n} is missing from the content (available: ${ids}). Publish the game again and start a new live event.`,
      videoMissing: "Video not available",
    },
    hud: {
      connected: "Connected",
      connecting: "Connecting…",
      taskOf: (current, total) => `Task ${current} of ${total}`,
      stations: "Stations",
      missions: "Missions",
      levels: "Levels",
      points: "Points",
      time: "Time",
      reconnecting: "Reconnecting…",
      reconnectPlay: "Team sync paused briefly — you can keep playing.",
      liveRanking: "Live ranking",
      doneCount: (n) => `${n} done`,
    },
    walletUi: {
      intro:
        "Clues saved in the levels land here. When a task gives the team info, it goes in this folder — visible to everyone.",
      skippedSolution: "Solution for the level you showed directly.",
      buyQ: (n) => `Unlock this clue for ${n} points? Everyone on the team sees it afterwards.`,
      notEnough: (have, need) => `Not enough points (you have ${have}, need ${need}).`,
      canShow: (n) => `You can show this clue for ${n} points.`,
      showFor: (n) => `Show for ${n} points`,
      buying: "Buying…",
      buyYes: "Yes, buy",
      afterLevel: (n) => `After level ${n}`,
      afterLevelSkipped: (n) => `After level ${n} · not collected`,
      boughtBy: (name) => `Bought by ${name}`,
    },
    notes: {
      heading: "Hints & documents",
      noneSolo: "Solo mode: this task has no extra documents.",
      none: "This task has no extra documents.",
    },
    desk: {
      title: (m) => `Studio test · bonus after ${m} m`,
      hint: (walked, need) =>
        `${walked} / ${need} m — simulate at the desk or walk outside. Both count.`,
      showNow: "Show bonus now",
    },
    gallery: {
      loading: "Loading…",
      empty: "No capture yet",
      one: "1 capture",
      many: (n) => `${n} captures`,
      taskN: (n) => ` · Task ${n}`,
      title: "Your gallery",
      body: "Photos and videos from this team — save them to your phone whenever you like.",
      loadingBody: "Loading gallery…",
      emptyBody: "No capture yet. Once you send one, it shows up here.",
      save: "Save",
      photo: "Photo",
      video: "Video",
    },
    timeAlert: {
      oneMinute: "1 minute left",
      lastMinutes: "Time is running out — last tasks, then game over.",
    },
    action: {
      notPlaying: "The game hasn’t started yet.",
      notPlayingNow: "The game isn’t running right now.",
      levelInactive: "This level isn’t active right now.",
      closeSyncFirst: "Close the team sync message first.",
      solutionOpen: "The solution is already open. The team lead continues.",
      levelMissing: "Level content not found.",
      onlyLead: "Only the team lead can continue.",
      onlyGpsLead: "Only Alpha / the GPS lead can release the location.",
      noTileHint: "There is no hint on this tile.",
      hintAlready: "This hint is already unlocked.",
      noWalletAfterOver: "You can’t buy clues after game over.",
      levelNotFound: "Level not found.",
      noLevelHint: "There is no clue for this level.",
      hintAfterSkip: "You can buy this clue only after skipping.",
      revealForbidden: "Showing the solution isn’t allowed here.",
      teamNotLobby: "The team isn’t in the lobby.",
      teamMissing: "Team not found.",
      phaseInactive: "Phase flow isn’t active for this event.",
      badCode: "That code doesn’t exist here.",
      stationDone: "This station is already solved.",
      levelLocked: "This level is still locked.",
      levelDone: "This level is already solved.",
      badOverride: "That override doesn’t match the current unlock.",
      enterStation: "Enter the station code — it’s on the station in the room.",
      onlyGpsTrack: "Only Alpha / the GPS lead tracks the distance.",
      noQuiz: "No quiz is active right now.",
      noUnlockQuiz: "No unlock quiz for this level.",
      quizUnanswered: "Quiz not answered yet.",
      bonusUnanswered: "Bonus not answered yet.",
      noActiveBonus: "No active bonus.",
      bonusOtherPlayer: "This bonus is for someone else.",
      bonusOtherRole: "This bonus is for another role.",
      pickAnswer: "Please pick an answer.",
      noBonusPhase: "No bonus phase is active.",
      pickSomeoneElse: "Please pick someone else.",
      alreadyTeamBonus: "Everyone already sees this task.",
      alreadyAnswered: "The task is already answered.",
      onlyHolderHandsOff: "Only the person with the task can hand it off.",
      teammateMissing: "Teammate not found.",
      eventMissing: "Event not found.",
      sessionExpired: "Your session expired. Join again with your player name.",
      sessionInvalid: "Invalid session.",
      unknown: "Unknown error",
      phaseUpdate: "Couldn’t update the phase.",
    },
    media: {
      close: "Close",
      noUrl: "No media URL set yet.",
    },
    growth: {
      copiedText: "Text copied",
      sendFriends: "Send to friends",
      copiedCode: "Code copied",
      useCode: "Use it yourself · copy code",
      familyHeadline: "Play with family & friends",
      familyBody:
        "20% off your next Exitmania game. Redeem it yourself — or send a tip to friends.",
      familyCta: "Send via messenger",
      familyBadge: (percent, days) => `${percent}% · ${days} days · team of up to 4`,
      familyNote: (until) => `Redeem by ${until}. Valid for everyone.`,
      shareTitle: "Beat my score if you can",
      shareChallenge: (score) => `${score} points. Beat me if you can 🔥`,
      shareChallengePlain: "Beat me if you can 🔥",
      shareCodeLine: (percent, code, days) =>
        `🎟️ ${percent}% code: ${code} — ${days} days, team of up to 4`,
    },
    walletHint: {
      empty: "Clues collected from the levels",
      mixed: (open, locked) => `${open} collected · ${locked} to buy`,
      lockedOne: "1 clue to buy",
      lockedMany: (n) => `${n} clues to buy`,
      openOne: "1 clue collected",
      openMany: (n) => `${n} clues collected`,
    },
  },
};

export function playRulesStepsFor(
  mode: ContentMode = "outdoor",
  language?: string | null,
): HelpStep[] {
  const t = playUi(language).menu;
  if (mode === "indoor") return t.rulesIndoor;
  if (mode === "online") return t.rulesOnline;
  return t.rulesOutdoor;
}

export function playHelpMenuHintFor(mode: ContentMode, language?: string | null): string {
  const t = playUi(language).menu;
  if (mode === "indoor") return t.helpMenuIndoor;
  if (mode === "online") return t.helpMenuOnline;
  return t.helpMenuOutdoor;
}

export function playHowToPlayHintFor(mode: ContentMode, language?: string | null): string {
  const t = playUi(language).menu;
  if (mode === "indoor") return t.howIndoor;
  if (mode === "online") return t.howOnline;
  return t.howOutdoor;
}

export function startOverlayCopyFor(
  playerCount: number,
  language?: string | null,
): { title: string; subtitle: string; hint: string } {
  const t = playUi(language).overlay;
  if (playerCount > 1) {
    return { title: t.multiTitle, subtitle: t.multiSubtitle, hint: t.hint };
  }
  return { title: t.soloTitle, subtitle: t.soloSubtitle, hint: t.hint };
}
