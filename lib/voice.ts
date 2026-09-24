import { daysBetween, parseISODate } from "./dates";
import type { DayLog, Persona, Profile, TintKey } from "./types";

export const TINT_HEX: Record<Exclude<TintKey, "paper">, string> = {
  menstruation: "#9b3d4a",
  follicular: "#3f6f5b",
  ovulation: "#c4843c",
  luteal: "#5c5270",
};

export const PERSONAS: Array<{ id: Persona; title: string; line: string }> = [
  {
    id: "rhythm",
    title: "Im Rhythmus",
    line: "Du hast einen Zyklus und willst den Tag danach schneiden.",
  },
  {
    id: "pill",
    title: "Auf der Pille",
    line: "Du nimmst Hormone. Es geht um Energie, Stimmung und die Pause.",
  },
  {
    id: "pain",
    title: "Mit Schmerz",
    line: "Der Tag richtet sich nach der Kapazität, nicht nach einem Soll.",
  },
  {
    id: "menopause",
    title: "Wechseljahre",
    line: "Unregelmäßig. Schlaf, Hitze, Stimmung. Keine falsche Sicherheit.",
  },
];

export const PERSONA_LINE: Record<Persona, string> = {
  rhythm: "Der Tag folgt dem Zyklus.",
  pill: "Energie, Stimmung, die Pause.",
  pain: "Kapazität vor Kalender.",
  menopause: "Ohne falsche Sicherheit.",
};

type Voice = {
  kicker: string;
  lines: [string, string];
  forLine: string;
  notLine: string;
};

const RHYTHM: Record<Exclude<TintKey, "paper">, Voice> = {
  menstruation: {
    kicker: "Menstruation",
    lines: [
      "Heute reicht weniger.",
      "Ruhe ist die Arbeit, nicht die Pause davor.",
    ],
    forLine: "Wärme, kurze Wege, ein früher Schluss.",
    notLine: "Beweise, dass du trotzdem funktionierst.",
  },
  follicular: {
    kicker: "Follikel",
    lines: [
      "Heute kannst du tief arbeiten.",
      "Eine schwere Aufgabe, nicht fünf leichte.",
    ],
    forLine: "Konzentration und ein Ergebnis, das fertig wird.",
    notLine: "Termine, die nur den Kalender füllen.",
  },
  ovulation: {
    kicker: "Eisprung",
    lines: ["Heute bist du im Raum.", "Sag zu, was du meinst."],
    forLine: "Sichtbarkeit, Training, ein entschiedenes Ja.",
    notLine: "Dich klein halten, weil es bequemer ist.",
  },
  luteal: {
    kicker: "Luteal",
    lines: [
      "Heute wird der Tag kürzer geschnitten.",
      "Weniger auf dem Tisch, dafür fertig.",
    ],
    forLine: "Ein weicheres Pensum, Ordnung, frühes Licht aus.",
    notLine: "Neue Zusagen und Abende, die sich ziehen.",
  },
};

const PILL: Record<"pause" | "anlauf" | "mitte" | "vormbruch", Voice & { tint: TintKey }> =
  {
    pause: {
      tint: "menstruation",
      kicker: "Pause",
      lines: [
        "Das ist die Pause.",
        "Blutung, Müdigkeit, ein kleineres Pensum.",
      ],
      forLine: "Weniger Termine und ein frühes Ende.",
      notLine: "Das Tempo der anderen Wochen.",
    },
    anlauf: {
      tint: "follicular",
      kicker: "Anlauf",
      lines: [
        "Die Pause ist vorbei.",
        "Die Energie kommt nicht auf Kommando.",
      ],
      forLine: "Ein normales Pensum, nichts Heldenhaftes.",
      notLine: "Die Woche vollpacken, nur weil die Blutung aufhört.",
    },
    mitte: {
      tint: "ovulation",
      kicker: "Mitte",
      lines: ["Stabilere Tage.", "Hier kannst du legen, was bleiben soll."],
      forLine: "Arbeit, die Konzentration hält.",
      notLine: "Die nächste Pause schon mit Terminen zu füllen.",
    },
    vormbruch: {
      tint: "luteal",
      kicker: "Vor der Pause",
      lines: [
        "Kurz vor der Pause wird es oft dünner.",
        "Rechne mit Stimmung, nicht mit Drama.",
      ],
      forLine: "Kleinere Zusagen und weniger Reibung.",
      notLine: "Schwere Gespräche und neue Dauerpflichten.",
    },
  };

const PAIN_PHASE: Record<Exclude<TintKey, "paper">, Voice> = {
  menstruation: {
    kicker: "Schonung",
    lines: [
      "Heute ist Schonung der Maßstab.",
      "Nicht, wie der Tag ohne Schmerz aussehen würde.",
    ],
    forLine: "Wärme, kurze Wege, Hilfe annehmen.",
    notLine: "Funktionieren um der Funktion willen.",
  },
  follicular: {
    kicker: "Luft",
    lines: [
      "Wenn der Schmerz nachlässt, ist das Luft.",
      "Kein Auftrag, sie zu nutzen.",
    ],
    forLine: "Das, was sich leicht anlässt.",
    notLine: "Die aufgeschobene Liste an einem besseren Tag.",
  },
  ovulation: {
    kicker: "Ein stärkerer Tag",
    lines: [
      "Ein stärkerer Tag ist kein Versprechen.",
      "Schmerz darf trotzdem da sein.",
    ],
    forLine: "Eine Sache, die guttut.",
    notLine: "Training, Sichtbarkeit oder ein Ja aus Gewohnheit.",
  },
  luteal: {
    kicker: "Kleineres Maß",
    lines: [
      "Die Kapazität wird knapper.",
      "Schneide den Tag, bevor der Schmerz es tut.",
    ],
    forLine: "Puffer, frühes Ende, weniger Reibung.",
    notLine: "Neue Zusagen und Abende, die sich ziehen.",
  },
};

const PAIN_LOG: Record<NonNullable<DayLog["pain"]>, Voice & { tint: TintKey; band: string }> =
  {
    none: {
      tint: "follicular",
      band: "Luft",
      kicker: "Luft",
      lines: ["Heute ist Kapazität da.", "Mehr wird daraus nicht gemacht."],
      forLine: "Das Nötige, in dem Tempo, das geht.",
      notLine: "Die liegengebliebene Liste als Belohnung.",
    },
    light: {
      tint: "ovulation",
      band: "Spürbar",
      kicker: "Spürbar",
      lines: ["Heute mit Rand.", "Der Schmerz ist da und begrenzt den Tag."],
      forLine: "Ein kleineres Pensum und eine echte Pause.",
      notLine: "Durchziehen, solange es noch irgendwie geht.",
    },
    strong: {
      tint: "luteal",
      band: "Stark",
      kicker: "Stark",
      lines: ["Heute ist ein kleiner Tag.", "Das ist die Ansage, nicht ein Ausrutscher."],
      forLine: "Das Unvermeidliche, Wärme, frühes Ende.",
      notLine: "Ein Soll, das von einem anderen Tag stammt.",
    },
    out: {
      tint: "menstruation",
      band: "Geht nicht",
      kicker: "Geht nicht",
      lines: ["Heute ist Schonung.", "Nicht verhandeln, nicht aufholen."],
      forLine: "Liegen, Wärme, jemanden bitten.",
      notLine: "Beweise, dass du trotzdem erreichbar bist.",
    },
  };

const PAIN_BAND: Record<Exclude<TintKey, "paper">, string> = {
  menstruation: "Blutung",
  follicular: "Danach",
  ovulation: "Mitte",
  luteal: "Davor",
};

export type Stance = Voice & {
  tint: TintKey;
  detail: string | null;
  detailTone: "strong" | "quiet";
};

export type DayMark = {
  tint: TintKey;
  band: string;
  cycleDay: number | null;
  layout: "bands" | "weeks";
};

function cycleDay(date: Date, startIso: string, length: number) {
  const diff = daysBetween(date, parseISODate(startIso));
  return ((diff % length) + length) % length + 1;
}

function rhythmPhase(day: number, period: number, ovulation: number): Exclude<TintKey, "paper"> {
  if (day <= period) return "menstruation";
  if (day < ovulation) return "follicular";
  if (day === ovulation) return "ovulation";
  return "luteal";
}

function pillKey(day: number, bleed: number, pack: number) {
  if (day <= bleed) return "pause" as const;
  const third = Math.ceil(Math.max(pack - bleed, 1) / 3);
  const pos = day - bleed;
  if (pos <= third) return "anlauf" as const;
  if (pos <= third * 2) return "mitte" as const;
  return "vormbruch" as const;
}

function menopauseVoice(log?: DayLog): Voice & { tint: TintKey; band: string } | null {
  if (!log) return null;
  if (log.heat === "hot" || log.heat === "warm") {
    return {
      tint: "ovulation",
      band: "Hitze",
      kicker: "Hitze",
      lines: ["Hitze ist heute der Rahmen.", "Plane kürzer. Schichten. Raus können."],
      forLine: "Luft, Wasser, weniger enge Räume.",
      notLine: "Volle Räume und Termine ohne Pause.",
    };
  }
  if (log.sleep === "broken" || log.sleep === "short") {
    return {
      tint: "luteal",
      band: "Schlaf",
      kicker: "Schlaf",
      lines: [
        "Der Schlaf war dünn. Der Tag wird es auch.",
        "Nichts davon ist eine Charakterfrage.",
      ],
      forLine: "Später anfangen, früher aufhören.",
      notLine: "Frühe Entscheidungen und ein volles Soll.",
    };
  }
  if (log.mood === "raw") {
    return {
      tint: "menstruation",
      band: "Roh",
      kicker: "Stimmung",
      lines: ["Die Stimmung ist roh. Nimm sie als Wetter.", "Keine großen Schnitte heute."],
      forLine: "Wenige Menschen, kleine Aufgaben.",
      notLine: "Klärende Gespräche und Lebensentscheidungen.",
    };
  }
  if (log.mood === "thin") {
    return {
      tint: "luteal",
      band: "Dünn",
      kicker: "Stimmung",
      lines: ["Dünn, nicht dramatisch.", "Halte den Tag kurz und konkret."],
      forLine: "Eine Sache, dann Schluss.",
      notLine: "Soziale Höflichkeit auf Reserve.",
    };
  }
  if (log.sleep === "steady" || log.mood === "even") {
    return {
      tint: "follicular",
      band: "Tragbar",
      kicker: "Tragbar",
      lines: [
        "Heute fühlt sich brauchbar an.",
        "Nutze das, ohne einen neuen Rhythmus zu verkünden.",
      ],
      forLine: "Eine klare Aufgabe, solange es hält.",
      notLine: "Den Tag als Beweis, dass alles vorbei ist.",
    };
  }
  return null;
}

export function dayMark(profile: Profile, date: Date, log?: DayLog): DayMark {
  if (profile.persona === "menopause") {
    const felt = menopauseVoice(log);
    return {
      tint: felt?.tint ?? "paper",
      band: felt?.band ?? "",
      cycleDay: null,
      layout: "weeks",
    };
  }

  if (profile.persona === "pill") {
    if (!profile.lastPeriodStart) {
      return { tint: "paper", band: "Pause", cycleDay: null, layout: "bands" };
    }
    const pack = profile.packLength ?? 28;
    const bleed = profile.periodLength ?? 5;
    const day = cycleDay(date, profile.lastPeriodStart, pack);
    const key = pillKey(day, bleed, pack);
    return {
      tint: PILL[key].tint,
      band: PILL[key].kicker,
      cycleDay: day,
      layout: "bands",
    };
  }

  if (!profile.lastPeriodStart) {
    return { tint: "paper", band: "", cycleDay: null, layout: "bands" };
  }

  const cycleLength = profile.cycleLength ?? 28;
  const periodLength = profile.periodLength ?? 5;
  const lutealLength = profile.lutealLength ?? 14;
  const ovulation = Math.max(cycleLength - lutealLength, periodLength + 1);
  const day = cycleDay(date, profile.lastPeriodStart, cycleLength);
  const phase = rhythmPhase(day, periodLength, ovulation);

  if (profile.persona === "pain" && log?.pain) {
    const logged = PAIN_LOG[log.pain];
    return {
      tint: logged.tint,
      band: logged.band,
      cycleDay: day,
      layout: "bands",
    };
  }

  return {
    tint: phase,
    band: profile.persona === "pain" ? PAIN_BAND[phase] : RHYTHM[phase].kicker,
    cycleDay: day,
    layout: "bands",
  };
}

export function stanceFor(profile: Profile, today: Date, log?: DayLog): Stance {
  if (profile.persona === "menopause") {
    const felt = menopauseVoice(log);
    const dated = profile.lastPeriodStart
      ? `Letzte Blutung ${profile.lastPeriodStart.split("-").reverse().join(".")}. Daraus wird keine Phase.`
      : "Der Kalender rechnet hier keinen Zyklus.";
    if (!felt) {
      return {
        tint: "luteal",
        kicker: "Wechseljahre",
        detail: dated,
        detailTone: "quiet",
        lines: [
          "Heute wird nichts aus einem Zyklus abgeleitet.",
          "Schlaf, Hitze, Stimmung. Mehr ist nicht sicher.",
        ],
        forLine: "Den Tag nach dem Körper jetzt.",
        notLine: "Eine Vorhersage, die sicher tut.",
      };
    }
    return { ...felt, detail: dated, detailTone: "quiet" };
  }

  const mark = dayMark(
    profile.persona === "pain" ? { ...profile, persona: "pain" } : profile,
    today,
    profile.persona === "pain" ? log : undefined,
  );

  if (profile.persona === "pill") {
    const pack = profile.packLength ?? 28;
    const bleed = profile.periodLength ?? 5;
    const key = mark.cycleDay
      ? pillKey(mark.cycleDay, bleed, pack)
      : "pause";
    return {
      ...PILL[key],
      detail: mark.cycleDay ? `Tag ${mark.cycleDay} im Pack` : null,
      detailTone: "strong",
    };
  }

  if (profile.persona === "pain") {
    if (log?.pain) {
      const logged = PAIN_LOG[log.pain];
      return {
        ...logged,
        detail: mark.cycleDay ? `Ungefähr Tag ${mark.cycleDay}` : null,
        detailTone: "quiet",
      };
    }
    const phase = (mark.tint === "paper" ? "luteal" : mark.tint) as Exclude<
      TintKey,
      "paper"
    >;
    return {
      ...PAIN_PHASE[phase],
      tint: phase,
      detail: mark.cycleDay ? `Ungefähr Tag ${mark.cycleDay}` : null,
      detailTone: "quiet",
    };
  }

  const phase = (mark.tint === "paper" ? "follicular" : mark.tint) as Exclude<
    TintKey,
    "paper"
  >;
  return {
    ...RHYTHM[phase],
    tint: phase,
    detail: mark.cycleDay ? `Tag ${mark.cycleDay}` : null,
    detailTone: "strong",
  };
}

export function tintHex(tint: TintKey) {
  return tint === "paper" ? "#f6f1ea" : TINT_HEX[tint];
}

export function monthCaption(profile: Profile, bands: string[]) {
  if (profile.persona === "menopause") {
    return "Keine berechnete Phase. Die Farbe kommt vom Tag, den du ablegst.";
  }
  if (profile.persona === "pain") {
    return "Die Farbe ist ungefähr. Oben zählt, was heute geht.";
  }
  const names = bands.filter((band, index) => band && band !== bands[index - 1]);
  if (names.length === 0) return "";
  return names.join(" · ");
}
