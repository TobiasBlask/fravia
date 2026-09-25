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
    line: "Du nimmst die Pille. Ich frage nach Energie, Stimmung und der Pause.",
  },
  {
    id: "pain",
    title: "Mit Schmerz",
    line: "Wenn es weh tut, plane ich kürzer. Ruhe-Tage sind erlaubt.",
  },
  {
    id: "menopause",
    title: "Wechseljahre",
    line: "Ich rechne hier keinen Zyklus. Sag mir, wie der Tag sich anfühlt.",
  },
];

export const PERSONA_LINE: Record<Persona, string> = {
  rhythm: "Ich plane mit deiner Phase.",
  pill: "Ich plane nach dem, was du einträgst.",
  pain: "Wenn es weh tut, plane ich kürzer.",
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
      "Du bist in der Menstruation.",
      "Ruhe und Wärme passen. Hartes Training nicht.",
    ],
    food: "Eisenreiches Gemüse, Linsen, Ingwer- oder Kamillentee.",
    move: "Spaziergang oder liegen. Kein hartes Training.",
  },
  follicular: {
    id: "rhythm-follicular",
    kicker: "Follikelphase",
    lines: ["Du bist in der Follikelphase.", "Sport und neue Aufgaben passen."],
    food: "Frische Salate, Avocado, Nüsse, Beeren.",
    move: "Cardio, Tanzen oder etwas Neues.",
  },
  ovulation: {
    id: "rhythm-ovulation",
    kicker: "Ovulation",
    lines: ["Du bist in der Ovulation.", "Sport, Fokus und eine Feier passen."],
    food: "Viel Wasser, Gemüse, Quinoa, Samen.",
    move: "Kraft oder ein Kurs, intensiver wenn du magst.",
  },
  luteal: {
    id: "rhythm-luteal",
    kicker: "Lutealphase",
    lines: ["Du bist in der Lutealphase.", "Plane kürzer. Hartes Training eher nicht."],
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
      "Du bist in der Pause.",
      "Wärme tut gut. Eine harte Einheit lasse ich weg.",
    ],
    food: "Warmes und Einfaches. Eisen, wenn die Blutung da ist.",
    move: "Spaziergang oder liegen. Kein hartes Training.",
  },
  anlauf: {
    id: "pill-anlauf",
    tint: "follicular",
    kicker: "Anlauf",
    lines: ["Die Pause ist vorbei.", "Plane nach dem, wie du dich fühlst."],
    food: "Iss normal.",
    move: "Leicht bewegen, bis es sich stabil anfühlt.",
  },
  mitte: {
    id: "pill-mitte",
    tint: "ovulation",
    kicker: "Mitte",
    lines: ["Mitte der Packung.", "Training passt, wenn du Lust hast."],
    food: "Regelmäßig, so wie es dir schmeckt.",
    move: "Training passt, wenn du Lust hast.",
  },
  vormbruch: {
    id: "pill-vormbruch",
    tint: "luteal",
    kicker: "Vor der Pause",
    lines: ["Kurz vor der Pause.", "Plane kürzer."],
    food: "Regelmäßige Mahlzeiten. Magnesium, wenn du magst.",
    move: "Kürzer bewegen. Sanft reicht.",
  },
};

const PAIN_PHASE: Record<Exclude<TintKey, "paper">, Voice> = {
  menstruation: {
    id: "pain-menstruation",
    kicker: "Menstruation",
    lines: ["Du bist in der Menstruation.", "Ruhe und Wärme. Kein hartes Training."],
    food: "Warmes, Eisen, Ingwer. Nichts, das den Bauch reizt.",
    move: "Spaziergang oder liegen. Kein hartes Training.",
  },
  follicular: {
    id: "pain-follicular",
    kicker: "Danach",
    lines: ["Der Schmerz lässt nach.", "Du musst heute nichts aufholen."],
    food: "Leicht und warm, was dir guttut.",
    move: "Bewegung, die leicht anfängt. Nicht mehr.",
  },
  ovulation: {
    id: "pain-ovulation",
    kicker: "Ein stärkerer Tag",
    lines: ["Heute geht etwas mehr.", "Schmerz kann trotzdem da sein."],
    food: "Iss, wonach dir ist.",
    move: "Eine Sache, die guttut. Kein hartes Programm.",
  },
  luteal: {
    id: "pain-luteal",
    kicker: "Kürzer",
    lines: ["Du bist in der Lutealphase.", "Plane weniger, kürzer und früher."],
    food: "Magnesium, warme Mahlzeiten, kleinere Portionen.",
    move: "Pilates oder ein Spaziergang. Ruhe-Tage sind erlaubt.",
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
    lines: ["Heute geht mehr.", "Nicht nachholen, was liegen blieb."],
    food: "Normal essen.",
    move: "Bewegung, die sich gut anfühlt.",
  },
  light: {
    id: "pain-light",
    tint: "ovulation",
    band: "Spürbar",
    kicker: "Spürbar",
    lines: ["Der Schmerz ist spürbar.", "Plane mit Puffer, kürzer als sonst."],
    food: "Warmes, Leichtes. Eine Pause dazwischen.",
    move: "Sanft. Nicht durchziehen.",
  },
  strong: {
    id: "pain-strong",
    tint: "luteal",
    band: "Stark",
    kicker: "Stark",
    lines: ["Der Schmerz ist stark.", "Heute wenig. Keine harte Einheit."],
    food: "Was leicht bleibt. Wärme.",
    move: "Liegen oder ganz wenig.",
  },
  out: {
    id: "pain-out",
    tint: "menstruation",
    band: "Schonung",
    kicker: "Schonung",
    lines: ["Heute ist Schonung.", "Keine Einheit. Bitte um Hilfe, wenn du sie brauchst."],
    food: "Was ankommt.",
    move: "Keine Einheit. Wärme und liegen.",
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
      lines: ["Heute ist Hitze da.", "Plane kürzer. Zieh dich in Schichten an."],
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
      lines: ["Du hast wenig geschlafen.", "Plane den Tag kürzer."],
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
      lines: ["Die Stimmung ist dünn.", "Heute keine großen Pläne."],
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
      lines: ["Die Stimmung ist dünn.", "Plane den Tag kurz."],
      food: "Eine richtige Mahlzeit, dann Schluss.",
      move: "Sanft und kurz.",
    };
  }
  if (log.sleep === "steady" || log.mood === "even") {
    return {
      id: "meno-steady",
      tint: "follicular",
      band: "Stabil",
      kicker: "Stabil",
      lines: ["Heute geht es dir ganz gut.", "Eine klare Einheit passt."],
      food: "Was du magst.",
      move: "Eine klare Einheit, solange es sich gut anfühlt.",
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
          "Ich rechne heute keinen Zyklus.",
          "Schlaf, Hitze, Stimmung – wie geht's dir?",
        ],
        food: "Iss, wonach dir ist. Bei Hitze leichter, mehr Wasser.",
        move: "Bewegung, die heute geht. Sicher ist das nicht.",
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
    return "Keine berechnete Phase. Ich nehme Schlaf, Hitze und Stimmung.";
  }
  if (profile.persona === "pain") {
    return "Die Phase ist ungefähr. Heute zählt, was du einträgst.";
  }
  if (!profile.lastPeriodStart) {
    return "Trag deinen letzten Periodenstart ein, dann sehe ich deine Phase.";
  }
  const names = bands.filter((band, index) => band && band !== bands[index - 1]);
  if (names.length === 0) return "";
  return names.join(" · ");
}
