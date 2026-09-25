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
    line: "Du hast einen Zyklus. Ich plane den Tag mit deiner Phase.",
  },
  {
    id: "pill",
    title: "Auf der Pille",
    line: "Du bist herzlich willkommen. Kein Eisprung – ich begleite Energie, Stimmung und die Pause.",
  },
  {
    id: "pain",
    title: "Mit Schmerz",
    line: "Wenn es weh tut, zählt was heute geht. Ruhe-Tage sind erlaubt.",
  },
  {
    id: "menopause",
    title: "Wechseljahre",
    line: "Ich rechne hier keinen Zyklus. Sag mir, wie der Tag sich anfühlt.",
  },
];

export const PERSONA_LINE: Record<Persona, string> = {
  rhythm: "für dich, im Einklang mit deinem Zyklus.",
  pill: "Ich tracke mit dir – auch ohne natürlichen Zyklus.",
  pain: "Sanft, in deinem Tempo.",
  menopause: "Schlaf, Hitze, Stimmung. Mehr ist nicht sicher.",
};

type Voice = {
  id: string;
  kicker: string;
  lines: [string, string];
  food: string;
  move: string;
};

const RHYTHM: Record<Exclude<TintKey, "paper">, Voice> = {
  menstruation: {
    id: "rhythm-menstruation",
    kicker: "Menstruation",
    lines: [
      "Ruhe und Regeneration.",
      "Dein Körper braucht jetzt Wärme, Eisen und Mitgefühl.",
    ],
    food: "Eisenreiches Gemüse, Linsen, Ingwer- oder Kamillentee.",
    move: "Sanftes Yoga, ein Spaziergang. Ruhe-Tage sind erlaubt.",
  },
  follicular: {
    id: "rhythm-follicular",
    kicker: "Follikelphase",
    lines: ["Deine Energie steigt.", "Guter Moment für Neues, Kreatives und Bewegung."],
    food: "Frische Salate, Avocado, Nüsse, Beeren.",
    move: "Cardio, Tanzen, etwas Neues ausprobieren.",
  },
  ovulation: {
    id: "rhythm-ovulation",
    kicker: "Ovulation",
    lines: [
      "Höchste Energie und Strahlkraft.",
      "Großes wagen, sichtbar sein.",
    ],
    food: "Viel Wasser, Gemüse, Quinoa, Samen.",
    move: "Kraft, ein Kurs, intensiver wenn du magst.",
  },
  luteal: {
    id: "rhythm-luteal",
    kicker: "Lutealphase",
    lines: [
      "Fokus und ein bisschen Aufräumen.",
      "Dein Körper braucht Magnesium und Mitgefühl mit sich.",
    ],
    food: "Süßkartoffel, Mandeln, Spinat, Omega-3.",
    move: "Pilates, ein langer Spaziergang, moderates Krafttraining.",
  },
};

const PILL: Record<"pause" | "anlauf" | "mitte" | "vormbruch", Voice & { tint: TintKey }> = {
  pause: {
    id: "pill-pause",
    tint: "menstruation",
    kicker: "Pause",
    lines: [
      "Das ist deine Pause.",
      "Die Blutung ist eine Abbruchblutung, kein Eisprung. Wärme tut dir gut.",
    ],
    food: "Warmes und Einfaches. Eisen, wenn die Blutung da ist.",
    move: "Sanft bleiben. Kein Programm, das einen Zyklus voraussetzt.",
  },
  anlauf: {
    id: "pill-anlauf",
    tint: "follicular",
    kicker: "Anlauf",
    lines: [
      "Die Pause ist vorbei.",
      "Die Energie kommt nicht auf Kommando – ich begleite dich trotzdem.",
    ],
    food: "Iss normal. Nichts Heldenhaftes.",
    move: "Leicht bewegen, bis es sich stabil anfühlt.",
  },
  mitte: {
    id: "pill-mitte",
    tint: "ovulation",
    kicker: "Mitte",
    lines: [
      "Stabilere Tage.",
      "Hier kannst du legen, was bleiben soll. Ohne Zyklusrede.",
    ],
    food: "Regelmäßig, so wie es dir schmeckt.",
    move: "Training passt, wenn du Lust hast. Das ist kein Energiehoch aus einem Eisprung.",
  },
  vormbruch: {
    id: "pill-vormbruch",
    tint: "luteal",
    kicker: "Vor der Pause",
    lines: [
      "Kurz vor der Pause wird es oft dünner.",
      "Track die Stimmung, ohne ein Drama daraus zu machen.",
    ],
    food: "Regelmäßige Mahlzeiten. Magnesium darf mit.",
    move: "Kürzer bewegen. Sanft ist genug.",
  },
};

const PAIN_PHASE: Record<Exclude<TintKey, "paper">, Voice> = {
  menstruation: {
    id: "pain-menstruation",
    kicker: "Menstruation",
    lines: [
      "Dein Körper arbeitet gerade.",
      "Ruhe und Wärme tun dir heute besonders gut.",
    ],
    food: "Warmes, Eisen, Ingwer. Nichts, das den Bauch reizt.",
    move: "Sanftes Yoga oder liegen. Kein hohes Tempo.",
  },
  follicular: {
    id: "pain-follicular",
    kicker: "Danach",
    lines: [
      "Wenn der Schmerz nachlässt, ist das Luft.",
      "Du musst die aufgeschobene Liste nicht heute schaffen.",
    ],
    food: "Leicht und warm, was dir guttut.",
    move: "Bewegung, die sich leicht anlässt. Nicht mehr.",
  },
  ovulation: {
    id: "pain-ovulation",
    kicker: "Ein stärkerer Tag",
    lines: [
      "Ein stärkerer Tag ist kein Versprechen.",
      "Schmerz darf trotzdem da sein.",
    ],
    food: "Iss, wonach dir ist. Nichts, das du dir verdienen musst.",
    move: "Eine Sache, die guttut. Kein intensives Programm aus Gewohnheit.",
  },
  luteal: {
    id: "pain-luteal",
    kicker: "Kleineres Maß",
    lines: [
      "Die Kapazität wird knapper.",
      "Schneide den Tag, bevor der Schmerz es tut.",
    ],
    food: "Magnesium, warme Mahlzeiten, kleinere Portionen.",
    move: "Pilates oder ein Spaziergang. Ruhe-Tage bleiben erlaubt.",
  },
};

const PAIN_LOG: Record<
  NonNullable<DayLog["pain"]>,
  Voice & { tint: TintKey; band: string }
> = {
  none: {
    id: "pain-none",
    tint: "follicular",
    band: "Luft",
    kicker: "Luft",
    lines: ["Heute ist Kapazität da.", "Mehr mache ich daraus nicht."],
    food: "Normal essen. Nichts zum Aufholen.",
    move: "Bewegung, die sich gut anfühlt. Kein Nachholen.",
  },
  light: {
    id: "pain-light",
    tint: "ovulation",
    band: "Spürbar",
    kicker: "Spürbar",
    lines: ["Heute mit Rand.", "Der Schmerz ist da und begrenzt den Tag."],
    food: "Warmes, Leichtes. Eine echte Pause dazwischen.",
    move: "Sanft. Durchziehen ist keine Tugend.",
  },
  strong: {
    id: "pain-strong",
    tint: "luteal",
    band: "Stark",
    kicker: "Stark",
    lines: ["Heute ist ein kleiner Tag.", "Das ist die Ansage, kein Ausrutscher."],
    food: "Was leicht bleibt. Wärme.",
    move: "Liegen oder ganz wenig. Kein hohes Tempo.",
  },
  out: {
    id: "pain-out",
    tint: "menstruation",
    band: "Schonung",
    kicker: "Schonung",
    lines: ["Heute ist Schonung.", "Du musst nichts beweisen."],
    food: "Was ankommt. Jemanden bitten ist erlaubt.",
    move: "Keine Einheit. Wärme, liegen, Hilfe.",
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

function menopauseVoice(log?: DayLog): (Voice & { tint: TintKey; band: string }) | null {
  if (!log) return null;
  if (log.heat === "hot" || log.heat === "warm") {
    return {
      id: "meno-heat",
      tint: "ovulation",
      band: "Hitze",
      kicker: "Hitze",
      lines: ["Hitze ist heute der Rahmen.", "Plane kürzer. Schichten. Raus können."],
      food: "Leichter essen, mehr Wasser.",
      move: "Nichts in engen, warmen Räumen. Ein kurzer Gang an die Luft.",
    };
  }
  if (log.sleep === "broken" || log.sleep === "short") {
    return {
      id: "meno-sleep",
      tint: "luteal",
      band: "Schlaf",
      kicker: "Schlaf",
      lines: [
        "Der Schlaf war dünn. Der Tag wird es auch.",
        "Nichts davon ist eine Charakterfrage.",
      ],
      food: "Regelmäßig, nichts Schweres am Morgen.",
      move: "Später anfangen. Eine kleine Runde, wenn überhaupt.",
    };
  }
  if (log.mood === "raw") {
    return {
      id: "meno-raw",
      tint: "menstruation",
      band: "Roh",
      kicker: "Stimmung",
      lines: ["Die Stimmung ist roh. Nimm sie als Wetter.", "Keine großen Schnitte heute."],
      food: "Was tröstet, ohne dass du dich erklären musst.",
      move: "Wenig. Ein Spaziergang nur, wenn er guttut.",
    };
  }
  if (log.mood === "thin") {
    return {
      id: "meno-thin",
      tint: "luteal",
      band: "Dünn",
      kicker: "Stimmung",
      lines: ["Dünn, nicht dramatisch.", "Halt den Tag kurz und konkret."],
      food: "Eine richtige Mahlzeit, dann Schluss.",
      move: "Sanft und kurz.",
    };
  }
  if (log.sleep === "steady" || log.mood === "even") {
    return {
      id: "meno-steady",
      tint: "follicular",
      band: "Tragbar",
      kicker: "Tragbar",
      lines: [
        "Heute fühlt sich brauchbar an.",
        "Nutze das, ohne einen neuen Rhythmus zu verkünden.",
      ],
      food: "Was du magst. Kein Beweis, dass alles vorbei ist.",
      move: "Eine klare Einheit, solange es hält.",
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
    return { tint: logged.tint, band: logged.band, cycleDay: day, layout: "bands" };
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
      ? `Letzte Periode am ${profile.lastPeriodStart.split("-").reverse().join(".")}. Daraus mache ich keine Phase.`
      : "Ich rechne hier keinen Zyklus. Sag mir einfach, wie der Tag sich anfühlt.";
    if (!felt) {
      return {
        id: "meno-none",
        tint: "luteal",
        kicker: "Wechseljahre",
        detail: dated,
        detailTone: "quiet",
        lines: [
          "Ich leite heute nichts aus einem Zyklus ab.",
          "Schlaf, Hitze, Stimmung – wie geht's dir?",
        ],
        food: "Iss, wonach dir ist. Bei Hitze leichter, mehr Wasser.",
        move: "Bewegung, die heute geht. Kein Plan, der sicher tut.",
      };
    }
    return { ...felt, detail: dated, detailTone: "quiet" };
  }

  const mark = dayMark(profile, today, profile.persona === "pain" ? log : undefined);

  if (profile.persona === "pill") {
    const pack = profile.packLength ?? 28;
    const bleed = profile.periodLength ?? 5;
    const key = mark.cycleDay ? pillKey(mark.cycleDay, bleed, pack) : "pause";
    return {
      ...PILL[key],
      detail: mark.cycleDay ? `Tag ${mark.cycleDay} im Pack` : null,
      detailTone: "strong",
    };
  }

  const quiet = profile.persona === "pain" || profile.irregular;

  if (profile.persona === "pain") {
    if (log?.pain) {
      return {
        ...PAIN_LOG[log.pain],
        detail: mark.cycleDay ? `Ungefähr Tag ${mark.cycleDay}` : null,
        detailTone: "quiet",
      };
    }
    const phase = (mark.tint === "paper" ? "luteal" : mark.tint) as Exclude<TintKey, "paper">;
    return {
      ...PAIN_PHASE[phase],
      tint: phase,
      detail: mark.cycleDay ? `Ungefähr Tag ${mark.cycleDay}` : null,
      detailTone: "quiet",
    };
  }

  const phase = (mark.tint === "paper" ? "follicular" : mark.tint) as Exclude<TintKey, "paper">;
  return {
    ...RHYTHM[phase],
    tint: phase,
    detail: mark.cycleDay
      ? quiet
        ? `Ungefähr Tag ${mark.cycleDay}`
        : `Tag ${mark.cycleDay} in deinem Zyklus`
      : null,
    detailTone: quiet ? "quiet" : "strong",
  };
}

export function tintHex(tint: TintKey) {
  return tint === "paper" ? "#f6f1ea" : TINT_HEX[tint];
}

export function monthCaption(profile: Profile, bands: string[]) {
  if (profile.persona === "menopause") {
    return "Keine berechnete Phase. Die Farbe kommt von dem, was du heute einträgst.";
  }
  if (profile.persona === "pain") {
    return "Die Farbe ist ungefähr. Oben zählt, was dir heute guttut.";
  }
  if (!profile.lastPeriodStart) {
    return "Trag deinen letzten Periodenstart ein, dann sehe ich deine Phase.";
  }
  const names = bands.filter((band, index) => band && band !== bands[index - 1]);
  if (names.length === 0) return "";
  return names.join(" · ");
}
