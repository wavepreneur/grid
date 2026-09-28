import { parseStudioLanguage } from "@/lib/cms/languages";
import type { ContentMode } from "@/lib/cms/layer-model";

export type PlayUiLang = "de" | "en";

/** Player chrome follows the booked game language. Non-launch locales fall back to English. */
export function playUiLang(language: string | null | undefined): PlayUiLang {
  return parseStudioLanguage(language) === "de" ? "de" : "en";
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
  walletHint: {
    empty: string;
    mixed: (open: number, locked: number) => string;
    lockedOne: string;
    lockedMany: (n: number) => string;
    openOne: string;
    openMany: (n: number) => string;
  };
};

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
