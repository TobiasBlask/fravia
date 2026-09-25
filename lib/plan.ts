import { addDays, iso, parseISODate, startOfWeek, weekDates } from "./dates";
import type { DayEvent, DayLog, EventKind, Profile } from "./types";
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
  if (/gespräch|gesprach|treffen|verabred/.test(raw)) return "treffen";
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
  if (goal === "treffen") return /gespräch|gesprach/i.test(text) ? "Gespräch" : "Treffen";
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

export const WEEK_QUESTION = "Was willst du diese Woche unterbringen?";

export const FINE_WEEK = "Diese Woche passt.";

export const WEEK_CHIPS = ["Sport", "Gespräch", "Feier", "Fokus"] as const;

export type WeekPlan = {
  proposals: Proposal[];
  days: string[];
};

export type WeekAnswer = {
  sentence: string;
  phase: string;
  proposals: Proposal[];
  plans: WeekPlan[];
};

export type Consequence = {
  eventId: string;
  sentence: string;
  phase: string;
  action: "move" | "keep";
  targets: Array<{ date: string }>;
};

type DayWindow = "bleed" | "early" | "high" | "low" | "unknown";
type BlockRole = "main" | "easy" | "rest" | "quiet" | "after" | "short";

export function weekPlacement(text: string, profile: Profile, today: Date, logs: Record<string, DayLog>): WeekAnswer {
  const trimmed = text.trim();
  const goal = goalOf(trimmed) ?? "treffen";
  const title = goalOf(trimmed) ? titleFor(goal, trimmed) : cap(trimmed);
  const ahead = Array.from({ length: 14 }, (_, index) => addDays(today, index));
  let pool = ahead.filter((date) => canHold(profile, date, logs[iso(date)], goal));
  pool = pool.sort((a, b) => compareMain(profile, a, b, logs, goal));
  if (goal === "feier" || goal === "treffen") {
    const room = pool.filter((date) => hasRoom(date, today));
    if (room.length > 0) {
      const keys = new Set(room.map((date) => iso(date)));
      pool = [...room, ...pool.filter((date) => !keys.has(iso(date)))];
    }
  }
  if (pool.length === 0) {
    return {
      sentence: unfitWeek(profile, today, logs),
      phase: phaseLabel(profile, today, logs[iso(today)]),
      proposals: [],
      plans: [],
    };
  }
  const mains = profile.persona === "menopause" ? guessPair(pool) : [pool[0]];
  const plans = mains.map((date) => buildPlan(profile, today, logs, goal, title, date));
  const first = plans[0].proposals[0];
  const phase = phaseLabel(profile, parseISODate(first.date), logs[first.date]);
  if (profile.persona === "menopause" && plans[1]) {
    const other = plans[1].proposals[0];
    return {
      sentence: `${clockLine(parseISODate(first.date), first.time)} oder ${clockLine(parseISODate(other.date), other.time)}. Beides ist eine Schätzung.`,
      phase,
      proposals: plans[0].proposals,
      plans,
    };
  }
  return {
    sentence: reasonLine(profile, parseISODate(first.date), logs[first.date], first.time ?? "", goal),
    phase,
    proposals: plans[0].proposals,
    plans,
  };
}

function guessPair(pool: Date[]) {
  if (pool.length < 2) return pool;
  const first = pool[0];
  const spaced = pool.find((date) => iso(date) >= iso(addDays(first, 2)));
  return spaced ? [first, spaced] : [pool[0], pool[1]];
}

function compareMain(profile: Profile, a: Date, b: Date, logs: Record<string, DayLog>, goal: Goal) {
  const aw = windowRank(dayWindow(profile, a, logs[iso(a)]));
  const bw = windowRank(dayWindow(profile, b, logs[iso(b)]));
  if (aw !== bw) return bw - aw;
  const as = scoreDay(profile, a, logs[iso(a)], goal);
  const bs = scoreDay(profile, b, logs[iso(b)], goal);
  if (as !== bs) return bs - as;
  return iso(a).localeCompare(iso(b));
}

function canHold(profile: Profile, date: Date, log: DayLog | undefined, goal: Goal) {
  if (profile.persona === "pain" && hardPain(log) && HIGH.has(goal)) return false;
  const slot = dayWindow(profile, date, log);
  if (profile.persona === "menopause") return slot === "high" || scoreDay(profile, date, log, goal) >= 40;
  return (slot === "high" || slot === "early") && scoreDay(profile, date, log, goal) >= 40;
}

function hasRoom(date: Date, today: Date) {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const week = new Set(weekDates(date).map((day) => iso(day)));
  return iso(prev) >= iso(today) && week.has(iso(prev)) && week.has(iso(next));
}

function dayWindow(profile: Profile, date: Date, log?: DayLog): DayWindow {
  if (profile.persona === "menopause") {
    if (!log) return "unknown";
    if (log.heat === "hot" || log.mood === "raw" || log.sleep === "short") return "low";
    if (log.heat === "warm" || log.sleep === "broken" || log.mood === "thin") return "low";
    if (log.sleep === "steady" || log.mood === "even" || (log.energy ?? 0) >= 4) return "high";
    return "unknown";
  }
  if (profile.persona === "pill") {
    if ((log?.energy ?? 0) >= 4) return "high";
    const band = dayMark(profile, date).band;
    if (band === "Pause") return "bleed";
    if (band === "Anlauf") return "early";
    if (band === "Mitte") return "high";
    if (band === "Vor der Pause") return "low";
    return "unknown";
  }
  const mark = dayMark(profile, date);
  if (!profile.lastPeriodStart || mark.tint === "paper") return "unknown";
  const ovulation = Math.max((profile.cycleLength ?? 28) - (profile.lutealLength ?? 14), (profile.periodLength ?? 5) + 1);
  const late = mark.tint === "follicular" && (mark.cycleDay ?? 0) >= ovulation - 3;
  if (mark.tint === "menstruation") return "bleed";
  if (mark.tint === "ovulation" || late) return "high";
  if (mark.tint === "follicular") return "early";
  if (mark.tint === "luteal") return "low";
  return "unknown";
}

function windowRank(slot: DayWindow) {
  if (slot === "high") return 3;
  if (slot === "early") return 2;
  if (slot === "low") return 1;
  return 0;
}

function buildPlan(
  profile: Profile,
  today: Date,
  logs: Record<string, DayLog>,
  goal: Goal,
  title: string,
  main: Date,
): WeekPlan {
  const used = [iso(main)];
  const open = () => weekDates(main).filter((date) => iso(date) >= iso(today) && !used.includes(iso(date)));
  const take = (date: Date | undefined) => {
    if (!date) return;
    used.push(iso(date));
  };
  const proposals = [makeBlock(main, goal, title, profile, logs[iso(main)], "main", goal === "sport" ? "sport" : "termin")];
  if (goal === "sport") {
    const rest = open().find((date) => dayWindow(profile, date, logs[iso(date)]) === "bleed")
      ?? [...open()].sort((a, b) => iso(b).localeCompare(iso(a)))[0];
    take(rest);
    const easy = open().find((date) => !hardDay(profile, logs[iso(date)]) && (dayWindow(profile, date, logs[iso(date)]) === "early" || dayWindow(profile, date, logs[iso(date)]) === "low"))
      ?? open().find((date) => !hardDay(profile, logs[iso(date)]));
    take(easy);
    if (easy) proposals.push(makeBlock(easy, goal, "Leicht", profile, logs[iso(easy)], "easy", "sport"));
    if (rest) proposals.push(makeBlock(rest, "erholung", "Ruhe", profile, logs[iso(rest)], "rest", "termin"));
  } else if (goal === "feier") {
    const quiet = open().find((date) => iso(date) === iso(addDays(main, -1)))
      ?? open().find((date) => {
        const slot = dayWindow(profile, date, logs[iso(date)]);
        return slot === "bleed" || slot === "low";
      });
    take(quiet);
    const after = open().find((date) => iso(date) === iso(addDays(main, 1)));
    take(after);
    if (quiet) proposals.push(makeBlock(quiet, "erholung", "Ruhig", profile, logs[iso(quiet)], "quiet", "termin"));
    if (after) proposals.push(makeBlock(after, "erholung", "Leicht", profile, logs[iso(after)], "after", "termin"));
  } else if (goal === "treffen") {
    const quiet = open().find((date) => iso(date) === iso(addDays(main, -1)))
      ?? open().find((date) => !hardDay(profile, logs[iso(date)]));
    take(quiet);
    const after = open().find((date) => iso(date) === iso(addDays(main, 1)) && !hardDay(profile, logs[iso(date)]))
      ?? open().find((date) => !hardDay(profile, logs[iso(date)]));
    take(after);
    if (quiet) proposals.push(makeBlock(quiet, "erholung", "Ruhig", profile, logs[iso(quiet)], "quiet", "termin"));
    if (after) proposals.push(makeBlock(after, "erholung", "Leicht", profile, logs[iso(after)], "after", "termin"));
  } else {
    const second = open().find((date) => {
      const slot = dayWindow(profile, date, logs[iso(date)]);
      return (slot === "high" || slot === "early") && !hardDay(profile, logs[iso(date)]);
    });
    take(second);
    const rest = open().find((date) => dayWindow(profile, date, logs[iso(date)]) === "bleed")
      ?? open().find((date) => dayWindow(profile, date, logs[iso(date)]) === "low")
      ?? [...open()].sort((a, b) => iso(b).localeCompare(iso(a)))[0];
    take(rest);
    if (second) proposals.push(makeBlock(second, goal, "Kurz", profile, logs[iso(second)], "short", "termin"));
    if (rest) proposals.push(makeBlock(rest, "erholung", "Ruhe", profile, logs[iso(rest)], "rest", "termin"));
  }
  return { proposals, days: weekDates(main).map((date) => iso(date)) };
}

function hardDay(profile: Profile, log?: DayLog) {
  return profile.persona === "pain" && hardPain(log);
}

function makeBlock(
  date: Date,
  goal: Goal,
  title: string,
  profile: Profile,
  log: DayLog | undefined,
  role: BlockRole,
  kind: Proposal["kind"],
): Proposal {
  const place = clockFor(goal, profile, date, log, role);
  return {
    date: iso(date),
    goal,
    kind: kind === "todo" ? "termin" : kind,
    title,
    time: place.time,
    end: place.end,
    note: place.note,
    fixed: false,
  };
}

function clockFor(goal: Goal, profile: Profile, date: Date, log: DayLog | undefined, role: BlockRole) {
  const pain = profile.persona === "pain";
  const low = dayWindow(profile, date, log) === "low";
  if (role === "rest") return { time: "15:00", end: "16:00", note: "Ruhe." };
  if (role === "quiet") return { time: "16:00", end: "17:00", note: "Ruhig davor." };
  if (role === "after") return { time: "09:00", end: "10:00", note: "Nichts Schweres." };
  if (role === "easy") {
    return pain ? { time: "10:00", end: "10:30", note: "Kurz." } : { time: "10:00", end: "10:45" };
  }
  if (role === "short") return { time: "09:00", end: "10:00" };
  if (goal === "fokus" || goal === "arbeit") {
    if (pain) return { time: "09:00", end: "10:00", note: "Kurz und früh." };
    if (low) return { time: "09:00", end: "10:00", note: "Kürzer." };
    return dayWindow(profile, date, log) === "early"
      ? { time: "09:00", end: "10:30" }
      : { time: "09:00", end: "11:30" };
  }
  if (goal === "feier") {
    if (pain || low) return { time: "19:00", end: "21:00", note: "Kürzer." };
    return { time: "19:00", end: "22:00" };
  }
  if (goal === "treffen") {
    if (pain) return { time: "17:00", end: "18:00" };
    if (low) return { time: "17:30", end: "18:30" };
    return { time: "18:00", end: "19:30" };
  }
  if (pain) return { time: "08:30", end: "09:15", note: "Kurz und früh." };
  if (low) return { time: "17:00", end: "17:45", note: "Kürzer." };
  return { time: "18:00", end: "19:00" };
}

function reasonLine(profile: Profile, date: Date, log: DayLog | undefined, time: string, goal: Goal) {
  const when = time ? `${cap(weekday(date))}, ${time}` : cap(weekday(date));
  if (profile.persona === "menopause") return `${when}. Es ist eine Schätzung.`;
  if (profile.persona === "pill") {
    if ((log?.energy ?? 0) >= 4) return `${when}. Du hast dort Energie ${log?.energy} eingetragen.`;
    const band = dayMark(profile, date).band;
    if (band === "Mitte") return `${when}. Du bist in der Mitte.`;
    if (band === "Anlauf") return `${when}. Du bist im Anlauf.`;
    if (band === "Vor der Pause") return `${when}. Du bist vor der Pause.`;
    if (band === "Pause") return `${when}. Du bist in der Pause.`;
    return `${when}.`;
  }
  if (profile.persona === "pain") {
    if (goal === "feier" || goal === "treffen") return `${when}. Nicht an einem Tag mit starkem Schmerz.`;
    return `${when}. Kurz und früh.`;
  }
  const mark = dayMark(profile, date);
  const ovulation = Math.max((profile.cycleLength ?? 28) - (profile.lutealLength ?? 14), (profile.periodLength ?? 5) + 1);
  const late = mark.tint === "follicular" && (mark.cycleDay ?? 0) >= ovulation - 3;
  if (mark.tint === "ovulation") return `${when}. Du bist um den Eisprung.`;
  if (late) return `${when}. Du bist in der späten Follikelphase.`;
  if (mark.tint === "follicular") return `${when}. Die Menstruation ist vorbei.`;
  if (mark.tint === "luteal") return `${when}. Du bist in der Lutealphase. Kürzer.`;
  if (mark.tint === "menstruation") return `${when}. Du bist in der Menstruation.`;
  return `${when}. Trag den Periodenstart ein, dann sage ich die Phase.`;
}

function clockLine(day: Date, time?: string) {
  const name = cap(weekday(day));
  return time ? `${name}, ${time}` : name;
}

export function consequence(
  profile: Profile,
  today: Date,
  events: DayEvent[],
  logs: Record<string, DayLog>,
  skipped: string[] = [],
): Consequence | null {
  const limit = iso(addDays(today, 14));
  const soon = events.filter((event) => !event.shared && event.date >= iso(today) && event.date < limit && !skipped.includes(event.id));
  const looked = soon
    .map((event) => judge(profile, today, event, logs))
    .filter((item): item is Consequence & { weight: number } => item !== null)
    .sort((a, b) => b.weight - a.weight || a.eventId.localeCompare(b.eventId));
  const worst = looked.find((item) => item.weight > 0);
  if (worst) {
    const { weight: _weight, ...rest } = worst;
    return rest;
  }
  return null;
}

function judge(
  profile: Profile,
  today: Date,
  event: DayEvent,
  logs: Record<string, DayLog>,
): (Consequence & { weight: number }) | null {
  const read = readEvent(event);
  if (!read) return null;
  const when = parseISODate(event.date);
  const log = logs[event.date];
  const current = scoreDay(profile, when, log, read.goal);
  const horizon: Date[] = [];
  for (let index = 0; index < 14; index += 1) horizon.push(addDays(today, index));
  const better = rank(profile, horizon.filter((day) => iso(day) !== event.date), logs, read.goal).filter((day) => day.score > 0);
  const best = better[0];
  const poor = current < 40 || (profile.persona === "pain" && hardPain(log) && HIGH.has(read.goal));
  if (!poor) return null;
  const gain = best ? best.score - current : 0;
  const phase = phaseLabel(profile, when, log);
  const where = inPhrase(profile, when, log);
  const name = cap(weekday(when));
  const blocked = Boolean(best && profile.persona === "pain" && hardPain(logs[iso(best.date)]) && HIGH.has(read.goal));
  if (!read.fixed && best && gain >= 20 && !blocked) {
    const second = profile.persona === "menopause" ? better[1] : undefined;
    const targets = [{ date: iso(best.date) }, ...(second ? [{ date: iso(second.date) }] : [])];
    const sentence = profile.persona === "menopause"
      ? second
        ? `${read.title} am ${name}. ${cap(weekday(best.date))} oder ${weekday(second.date)} – beides ist eine Schätzung.`
        : `${read.title} am ${name}. ${cap(weekday(best.date))} wäre möglich. Es ist eine Schätzung.`
      : profile.persona === "pain" && hardPain(log)
        ? `${read.title} am ${name} liegt an einem Tag mit starkem Schmerz. ${cap(weekday(best.date))} passt besser.`
        : `${read.title} am ${name} liegt ${where}. ${cap(weekday(best.date))} passt besser.`;
    return { eventId: event.id, sentence, phase, action: "move", targets, weight: Math.max(gain, 100 - current) };
  }
  const how = howTo(profile, when, log, read.goal, read.title);
  if (profile.persona === "menopause") {
    return {
      eventId: event.id,
      sentence: `${read.named} am ${name}. ${how} Es ist eine Schätzung.`,
      phase,
      action: "keep",
      targets: [],
      weight: 80 - current,
    };
  }
  if (!where) return null;
  const sentence = profile.persona === "pain" && hardPain(log) && HIGH.has(read.goal)
    ? `${read.title} am ${name} liegt an einem Tag mit starkem Schmerz. Eine harte Einheit lasse ich weg.`
    : `${read.named} am ${name} liegt ${where}. ${how}`;
  return { eventId: event.id, sentence, phase, action: "keep", targets: [], weight: 80 - current };
}

function readEvent(event: DayEvent): { goal: Goal; fixed: boolean; title: string; named: string } | null {
  const raw = event.title.toLowerCase();
  if (event.kind === "geburtstag" || /geburtstag/.test(raw)) return { goal: "geburtstag", fixed: true, title: "Geburtstag", named: "Der Geburtstag" };
  if (event.kind === "sport" || /sport|training/.test(raw)) {
    const title = /training/i.test(event.title) ? "Training" : "Sport";
    return { goal: "sport", fixed: false, title, named: title };
  }
  if (/feier|party/.test(raw)) return { goal: "feier", fixed: true, title: "Feier", named: "Die Feier" };
  if (/gespräch|gesprach/.test(raw)) return { goal: "treffen", fixed: false, title: "Gespräch", named: "Das Gespräch" };
  if (/treffen|verabred/.test(raw)) return { goal: "treffen", fixed: false, title: "Treffen", named: "Das Treffen" };
  if (/fokus/.test(raw)) return { goal: "fokus", fixed: false, title: "Fokus", named: "Fokus" };
  if (/arbeit/.test(raw)) return { goal: "arbeit", fixed: false, title: "Arbeit", named: "Die Arbeit" };
  if (event.kind === "termin") return { goal: "treffen", fixed: true, title: event.title, named: event.title };
  return null;
}

function unfitWeek(profile: Profile, today: Date, logs: Record<string, DayLog>) {
  const end = addDays(startOfWeek(today), 6);
  const days: Date[] = [];
  for (let cursor = today; iso(cursor) <= iso(end); cursor = addDays(cursor, 1)) days.push(new Date(cursor));
  if (profile.persona === "pain" && days.some((day) => hardPain(logs[iso(day)]))) {
    return "Der Schmerz ist diese Woche stark. Eine harte Einheit lege ich nicht.";
  }
  if (profile.persona === "pain") return "Diese Woche lieber kurz. Eine harte Einheit lege ich nicht.";
  if (profile.persona === "menopause") return "Diese Woche ist unsicher. Eine harte Einheit lege ich nicht. Es ist eine Schätzung.";
  if (profile.persona === "pill") {
    const band = dayMark(profile, today, logs[iso(today)]).band;
    if (band === "Pause") return "Diese Woche ist die Pause. Eine harte Einheit lege ich nicht.";
    if (band === "Vor der Pause") return "Diese Woche ist vor der Pause. Mach es kürzer.";
    if (band === "Anlauf") return "Diese Woche ist der Anlauf. Eine harte Einheit lege ich nicht.";
    return "Eine harte Einheit lege ich diese Woche nicht.";
  }
  const where = inPhrase(profile, today);
  if (where === "in der Menstruation") return "Diese Woche ist die Menstruation. Eine harte Einheit lege ich nicht.";
  if (where === "in der Lutealphase") return "Diese Woche ist die Lutealphase. Mach es kürzer und früher.";
  return "Eine harte Einheit lege ich diese Woche nicht.";
}

function phaseLabel(profile: Profile, date: Date, log?: DayLog) {
  if (profile.persona === "menopause") return "Schätzung";
  return dayMark(profile, date, profile.persona === "pain" ? log : undefined).band;
}

function inPhrase(profile: Profile, date: Date, log?: DayLog) {
  if (profile.persona === "menopause") return "";
  if (profile.persona === "pain" && hardPain(log)) return "an einem Tag mit starkem Schmerz";
  if (profile.persona === "pill") {
    const band = dayMark(profile, date, log).band;
    if (band === "Anlauf") return "im Anlauf";
    if (band === "Vor der Pause") return "vor der Pause";
    if (band === "Mitte") return "in der Mitte";
    if (band === "Pause") return "in der Pause";
    return "";
  }
  const tint = dayMark(profile, date).tint;
  if (tint === "menstruation") return "in der Menstruation";
  if (tint === "follicular") return "in der Follikelphase";
  if (tint === "ovulation") return "in der Ovulation";
  if (tint === "luteal") return "in der Lutealphase";
  return "";
}

function howTo(profile: Profile, date: Date, log: DayLog | undefined, goal: Goal, title: string) {
  if (profile.persona === "pain" && hardPain(log)) return "Eine harte Einheit lasse ich weg.";
  if (profile.persona === "pill") {
    const band = dayMark(profile, date, log).band;
    if (band === "Pause" || band === "Vor der Pause") return "Mach es kürzer.";
    return "Lass es so, wenn es sich leicht anfühlt.";
  }
  const tint = dayMark(profile, date).tint;
  if (tint === "luteal" && (goal === "feier" || goal === "geburtstag" || title === "Feier")) return "Mach sie kürzer und früher.";
  if (tint === "luteal") return "Mach es kürzer und früher.";
  if (tint === "menstruation" && title === "Feier") return "Mach sie kürzer.";
  if (tint === "menstruation") return "Mach es kürzer.";
  return "Mach es kürzer.";
}
