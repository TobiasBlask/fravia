import { addDays, iso, parseISODate, startOfWeek } from "./dates";
import type { DayLog, EventKind, Profile } from "./types";
import { dayMark } from "./voice";

export type Goal = "sport" | "feier" | "geburtstag" | "treffen" | "arbeit" | "fokus" | "erholung";

export type Proposal = {
  date: string;
  alt?: string;
  goal: Goal;
  kind: EventKind | "todo";
  title: string;
  time?: string;
  end?: string;
  note?: string;
  fixed: boolean;
};

export type PlanReply = {
  text: string;
  proposals: Proposal[];
  ask: "goal" | "when" | null;
};

const HIGH = new Set<Goal>(["sport", "feier", "geburtstag", "treffen", "arbeit", "fokus"]);

const WEEKDAYS = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];

export function openingLine(profile: Profile, today: Date, logs: Record<string, DayLog>) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const sport = rank(profile, days, logs, "sport").filter((day) => day.score > 0);
  const pair = pairOf(sport);

  if (profile.persona === "pill") {
    const withEnergy = days.some((day) => logs[iso(day)]?.energy);
    return withEnergy
      ? `Ich nehme die Energie, die du eingetragen hast. Für Sport passen ${pair}.`
      : `Diese Woche plane ich vorsichtig. Für leichtere Einheiten passen ${pair}.`;
  }
  if (profile.persona === "pain") {
    if (sport.length === 0) {
      return "Der Schmerz ist diese Woche stark. Eine harte Einheit lege ich nicht.";
    }
    const blocked = days.some((day) => hardPain(logs[iso(day)]));
    return blocked
      ? `Wo der Schmerz stark ist, lege ich keine harte Einheit. Für kurze Einheiten passen ${pair}.`
      : `Diese Woche lieber kürzer. Für Sport passen ${pair}.`;
  }
  if (profile.persona === "menopause") {
    return `Das ist eine Schätzung, kein Zyklus. ${cap(pair)} wären möglich. Sicher ist das nicht.`;
  }
  const now = dayMark(profile, today, logs[iso(today)]).tint;
  const top = sport[0] ? dayMark(profile, sport[0].date).tint : now;
  if (now === "menstruation") {
    return "Du bist in der Menstruation. Ruhe und Wärme passen. Schwere Einheiten lasse ich weg.";
  }
  if (now === "luteal" && top !== "ovulation" && top !== "follicular") {
    return `Du bist in der Lutealphase. Für leichtere Einheiten passen ${pair}. Hartes Training nicht.`;
  }
  const phase = now === "ovulation"
    ? "Du bist in der Ovulation."
    : now === "luteal"
      ? "Du bist in der Lutealphase."
      : "Du bist in der Follikelphase.";
  return top === "ovulation"
    ? `${phase} Für Sport und eine Feier passen ${pair}.`
    : `${phase} Für Sport passen ${pair}.`;
}

export function planSentence(
  text: string,
  profile: Profile,
  today: Date,
  logs: Record<string, DayLog>,
): PlanReply {
  const goal = goalOf(text);
  const when = whenOf(text, today);
  if (!goal) {
    return {
      text: "Was willst du legen – Sport, eine Feier, Fokus oder Erholung?",
      proposals: [],
      ask: "goal",
    };
  }
  if (!when) {
    return {
      text: "Heute, diese Woche, nächste Woche – oder liegt der Tag fest?",
      proposals: [],
      ask: "when",
    };
  }

  const title = titleFor(goal, text);
  const place = placement(goal, profile);

  if (when.fixed) {
    const date = when.fixed;
    const advice = fixedAdvice(profile, date, logs[iso(date)], goal);
    return {
      text: advice,
      proposals: [
        {
          date: iso(date),
          goal,
          kind: place.kind,
          title,
          time: place.time,
          end: place.end,
          note: place.note,
          fixed: true,
        },
      ],
      ask: null,
    };
  }

  const ranked = rank(profile, when.days, logs, goal).filter((day) => day.score > 0);
  if (ranked.length === 0) {
    return {
      text: "In dem Fenster ist der Schmerz stark. Eine harte Einheit lege ich da nicht hin. Erholung ginge.",
      proposals: [],
      ask: "goal",
    };
  }

  const best = ranked[0];
  const second = profile.persona === "menopause" ? ranked[1] : undefined;
  const item = (day: Date): Proposal => ({
    date: iso(day),
    goal,
    kind: place.kind,
    title,
    time: place.time,
    end: place.end,
    note: place.note,
    fixed: false,
  });
  const proposals = [item(best.date), ...(second ? [item(second.date)] : [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const why = second
    ? `${cap(weekday(parseISODate(proposals[0].date)))} oder ${weekday(parseISODate(proposals[1].date))} – beides ist eine Schätzung. Welchen Tag soll ich nehmen?`
    : whyLine(profile, best.date, logs[iso(best.date)], goal);
  return { text: why, proposals, ask: null };
}

export const CHIPS = [
  "Sport diese Woche",
  "Feier in zwei Wochen",
  "Fokus nächste Woche",
  "Erholung morgen",
  "Am 12. muss ich arbeiten",
];

function goalOf(text: string): Goal | null {
  const raw = text.toLowerCase();
  if (/erholung|ausruhen|ruhetag/.test(raw)) return "erholung";
  if (/geburtstag/.test(raw)) return "geburtstag";
  if (/feier|feiern|party/.test(raw)) return "feier";
  if (/treffen|verabred/.test(raw)) return "treffen";
  if (/fokus|konzentri/.test(raw)) return "fokus";
  if (/arbeit/.test(raw)) return "arbeit";
  if (/sport|training|trainieren/.test(raw)) return "sport";
  return null;
}

function whenOf(text: string, today: Date): { days: Date[]; fixed: Date | null } | null {
  const raw = text.toLowerCase();
  const hasRange = /heute|morgen|diese woche|nächste woche|naechste woche|in zwei wochen/.test(raw);
  const concrete = concreteDate(raw, today);
  const named = namedWeekday(raw, today);
  const pinned = /muss|fest|genau/.test(raw);
  if ((concrete || named) && (pinned || !hasRange)) {
    return { days: [], fixed: concrete ?? named };
  }
  const days: Date[] = [];
  const push = (date: Date) => {
    const key = iso(date);
    if (!days.some((item) => iso(item) === key) && key >= iso(today)) days.push(date);
  };
  if (/\bheute\b/.test(raw)) push(today);
  if (/\bmorgen\b/.test(raw)) push(addDays(today, 1));
  if (/diese woche/.test(raw)) {
    const end = addDays(startOfWeek(today), 6);
    for (let cursor = today; iso(cursor) <= iso(end); cursor = addDays(cursor, 1)) push(cursor);
  }
  if (/nächste woche|naechste woche/.test(raw)) {
    const start = addDays(startOfWeek(today), 7);
    for (let index = 0; index < 7; index += 1) push(addDays(start, index));
  }
  if (/in zwei wochen/.test(raw)) {
    const start = addDays(today, 14);
    for (let index = 0; index < 7; index += 1) push(addDays(start, index));
  }
  if (concrete && hasRange) push(concrete);
  if (named && hasRange) push(named);
  if (days.length === 0) return null;
  return { days, fixed: null };
}

function concreteDate(raw: string, today: Date): Date | null {
  const isoHit = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoHit) return parseISODate(`${isoHit[1]}-${isoHit[2]}-${isoHit[3]}`);
  const full = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (full) {
    const year = full[3].length === 2 ? 2000 + Number(full[3]) : Number(full[3]);
    return new Date(year, Number(full[2]) - 1, Number(full[1]));
  }
  const monthIndex: Record<string, number> = {
    januar: 0, februar: 1, "märz": 2, maerz: 2, april: 3, mai: 4, juni: 5,
    juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
  };
  for (const [name, month] of Object.entries(monthIndex)) {
    const named = raw.match(new RegExp(`(\\d{1,2})\\.?\\s+${name}`));
    if (!named) continue;
    const day = Number(named[1]);
    const thisYear = new Date(today.getFullYear(), month, day);
    return iso(thisYear) < iso(today) ? new Date(today.getFullYear() + 1, month, day) : thisYear;
  }
  const dayOnly = raw.match(/(?:am|den)\s+(\d{1,2})\.(?!\d)/);
  if (!dayOnly) return null;
  const day = Number(dayOnly[1]);
  let cursor = new Date(today.getFullYear(), today.getMonth(), day);
  if (iso(cursor) < iso(today)) cursor = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return cursor;
}

function namedWeekday(raw: string, today: Date): Date | null {
  for (let index = 0; index < WEEKDAYS.length; index += 1) {
    if (!raw.includes(WEEKDAYS[index])) continue;
    const delta = (index - today.getDay() + 7) % 7 || 7;
    return addDays(today, delta === 7 && WEEKDAYS[index] === WEEKDAYS[today.getDay()] ? 0 : delta);
  }
  return null;
}

function rank(profile: Profile, days: Date[], logs: Record<string, DayLog>, goal: Goal) {
  return days
    .map((date) => ({ date, score: scoreDay(profile, date, logs[iso(date)], goal) }))
    .sort((a, b) => b.score - a.score || iso(a.date).localeCompare(iso(b.date)));
}

function scoreDay(profile: Profile, date: Date, log: DayLog | undefined, goal: Goal) {
  const hard = HIGH.has(goal);
  if (profile.persona === "pain" && hard && hardPain(log)) return -1;
  if (profile.persona === "pill") return pillScore(profile, date, log, hard);
  if (profile.persona === "menopause") return menoScore(log, hard);
  return rhythmScore(profile, date, goal) + (profile.persona === "pain" && log?.pain === "light" && hard ? -30 : 0);
}

function rhythmScore(profile: Profile, date: Date, goal: Goal) {
  const mark = dayMark(profile, date);
  const cycle = profile.cycleLength ?? 28;
  const period = profile.periodLength ?? 5;
  const luteal = profile.lutealLength ?? 14;
  const ovulation = Math.max(cycle - luteal, period + 1);
  const late = mark.tint === "follicular" && (mark.cycleDay ?? 0) >= ovulation - 3;
  const rest = goal === "erholung";
  if (mark.tint === "ovulation") return rest ? 20 : 100;
  if (late) return rest ? 30 : 88;
  if (mark.tint === "follicular") return rest ? 40 : 62;
  if (mark.tint === "luteal") return rest ? 78 : 36;
  if (mark.tint === "menstruation") return rest ? 100 : 8;
  return 40;
}

function pillScore(profile: Profile, date: Date, log: DayLog | undefined, hard: boolean) {
  if (log?.energy) return log.energy * (hard ? 20 : 12);
  const band = dayMark(profile, date).band;
  if (band === "Mitte") return hard ? 70 : 40;
  if (band === "Anlauf") return hard ? 48 : 55;
  if (band === "Vor der Pause") return hard ? 32 : 70;
  return hard ? 18 : 80;
}

function menoScore(log: DayLog | undefined, hard: boolean) {
  if (!log) return 50;
  if (log.heat === "hot" || log.mood === "raw" || log.sleep === "short") return hard ? 12 : 80;
  if (log.heat === "warm" || log.sleep === "broken" || log.mood === "thin") return hard ? 28 : 70;
  if (log.sleep === "steady" || log.mood === "even") return hard ? 74 : 40;
  if (log.energy) return log.energy * 15;
  return 50;
}

function hardPain(log?: DayLog) {
  return log?.pain === "strong" || log?.pain === "out";
}

function placement(goal: Goal, profile: Profile): { kind: EventKind | "todo"; time?: string; end?: string; note?: string } {
  const pain = profile.persona === "pain";
  if (goal === "sport") {
    return pain
      ? { kind: "sport", time: "08:30", end: "09:15", note: "Kurz und früh." }
      : { kind: "sport", time: "18:00", end: "19:00" };
  }
  if (goal === "geburtstag") return { kind: "geburtstag" };
  if (goal === "feier") return { kind: "termin", time: "19:00", end: "22:00" };
  if (goal === "treffen") return { kind: "termin", time: "18:00", end: "19:30" };
  if (goal === "erholung") {
    return pain
      ? { kind: "termin", time: "16:00", end: "16:30", note: "Kurz." }
      : { kind: "termin", time: "16:00", end: "17:00" };
  }
  return pain
    ? { kind: "todo", time: "09:00", end: "10:00" }
    : { kind: "todo", time: "09:30", end: "11:30" };
}

function titleFor(goal: Goal, text: string) {
  if (goal === "sport") return /training/i.test(text) ? "Training" : "Sport";
  if (goal === "feier") return "Feier";
  if (goal === "geburtstag") return "Geburtstag";
  if (goal === "treffen") return "Treffen";
  if (goal === "fokus") return "Fokus";
  if (goal === "erholung") return "Erholung";
  return "Arbeit";
}

function fixedAdvice(profile: Profile, date: Date, log: DayLog | undefined, goal: Goal) {
  const day = `${date.getDate()}.`;
  const fit = fits(profile, date, log, goal);
  const guess = profile.persona === "menopause" ? " Sicher ist das nicht." : "";
  return `Den ${day} verschiebe ich nicht. ${fit.fit} ${fit.skip}${guess} Soll ich ${titleFor(goal, goal)} trotzdem auf den ${day} legen?`;
}

function fits(profile: Profile, date: Date, log: DayLog | undefined, goal: Goal) {
  const day = `${date.getDate()}.`;
  if (profile.persona === "pain" && hardPain(log)) {
    return { fit: `Am ${day} ist der Schmerz stark.`, skip: "Erholung passt. Sport und alles Harte lasse ich weg." };
  }
  if (profile.persona === "pill") {
    const band = dayMark(profile, date).band;
    if (log?.energy && log.energy >= 4) return { fit: `Am ${day} hast du Energie eingetragen. Sport und Fokus passen.`, skip: "Zu viel an einem Tag lasse ich weg." };
    if (band === "Pause") return { fit: `Am ${day} ist die Pause.`, skip: "Eine harte Einheit lasse ich weg." };
    return { fit: `Am ${day} passt ein normales Pensum.`, skip: "Eine harte Einheit lasse ich weg." };
  }
  if (profile.persona === "menopause") {
    if (log?.heat === "hot" || log?.sleep === "short") return { fit: `Am ${day} lieber kurz und leicht.`, skip: "Eine lange Feier lasse ich weg." };
    return { fit: `Am ${day} kann eine klare Aufgabe passen.`, skip: "Sicher ist die Schätzung nicht." };
  }
  const tint = dayMark(profile, date).tint;
  if (tint === "menstruation") return { fit: `Am ${day} ist die Menstruation. Ruhe und Wärme passen.`, skip: "Sport, Feier und langen Fokus lasse ich weg." };
  if (tint === "luteal") {
    const practical = goal === "feier" || goal === "geburtstag" ? "Feier kürzer und früher." : "Plane kürzer und früher.";
    return { fit: `Am ${day} ist die Lutealphase. ${practical}`, skip: "Eine harte Einheit lasse ich weg." };
  }
  if (tint === "ovulation") return { fit: `Am ${day} ist die Ovulation. Sport, Fokus und eine Feier passen.`, skip: "" };
  if (tint === "follicular") return { fit: `Am ${day} ist die Follikelphase. Sport und Fokus passen.`, skip: "Zu viel an einem Tag lasse ich weg." };
  return { fit: "Trag den Periodenstart ein, dann sage ich die Phase.", skip: "" };
}

function whyLine(profile: Profile, date: Date, log: DayLog | undefined, goal: Goal) {
  const name = weekday(date);
  if (profile.persona === "menopause") {
    return `${cap(name)} wäre möglich. Es ist eine Schätzung. Soll ich ${titleFor(goal, goal)} dahin legen?`;
  }
  if (profile.persona === "pill") {
    const energy = log?.energy
      ? `Du hast dort Energie ${log.energy} eingetragen.`
      : "Du hast dort keine Energie eingetragen, also plane ich vorsichtig.";
    return `${cap(name)} passt. ${energy} Soll ich ${titleFor(goal, goal)} auf ${name} legen?`;
  }
  if (profile.persona === "pain") {
    return `${cap(name)}, kurz und früh. An Tagen mit starkem Schmerz lege ich nichts Hartes. Soll ich ${titleFor(goal, goal)} auf ${name} legen?`;
  }
  const tint = dayMark(profile, date).tint;
  const because = tint === "ovulation"
    ? "Du bist in der Ovulation."
    : tint === "follicular"
      ? "Du bist in der Follikelphase."
      : tint === "luteal"
        ? "Du bist in der Lutealphase. Nimm es kürzer."
        : tint === "menstruation"
          ? "Du bist in der Menstruation. Ruhe passt besser."
          : "Trag den Periodenstart ein, dann sage ich die Phase.";
  return `${cap(name)} passt. ${because} Soll ich ${titleFor(goal, goal)} auf ${name} legen?`;
}

function pairOf(ranked: Array<{ date: Date }>) {
  const names = ranked
    .slice(0, 2)
    .map((day) => day.date)
    .sort((a, b) => a.getTime() - b.getTime())
    .map((date) => weekday(date));
  if (names.length > 1) return `${names[0]} und ${names[1]}`;
  return names[0] ?? "morgen";
}

function weekday(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
