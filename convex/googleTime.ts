export const GOOGLE_REDIRECT_URI = "https://clever-adventure-production-a452.up.railway.app/api/google/callback";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export type GoogleWhen = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleItem = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleWhen;
  end?: GoogleWhen;
};

export type ListedEvent = {
  id: string;
  title: string;
  kind: "termin";
  date: string;
  time?: string;
  end?: string;
  location?: string;
  note?: string;
  freq: "none";
  seriesId: string;
};

export function addDays(isoDate: string, count: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(later: string, earlier: string) {
  const end = Date.parse(`${later}T00:00:00Z`);
  const start = Date.parse(`${earlier}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function clockOf(when: GoogleWhen | undefined, fallbackZone = "Europe/Berlin") {
  if (!when) return null;
  if (when.date) return { date: when.date };
  if (!when.dateTime) return null;
  const zone = when.timeZone || fallbackZone;
  const value = new Date(when.dateTime);
  if (Number.isNaN(value.getTime())) return null;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
  return { date, time };
}

export function toListedEvent(item: GoogleItem): ListedEvent | null {
  if (!item.id || item.status === "cancelled") return null;
  const start = clockOf(item.start);
  if (!start?.date) return null;
  const end = clockOf(item.end, item.start?.timeZone || "Europe/Berlin");
  const timed = Boolean(start.time);
  const sameDay = Boolean(timed && end?.time && end.date === start.date);
  const title = item.summary?.trim() || "Ohne Titel";
  return {
    id: `gcal:${item.id}`,
    title: title.slice(0, 140),
    kind: "termin",
    date: start.date,
    ...(timed && start.time ? { time: start.time } : {}),
    ...(sameDay && end?.time ? { end: end.time } : {}),
    ...(item.location ? { location: item.location.slice(0, 140) } : {}),
    ...(item.description ? { note: item.description.slice(0, 280) } : {}),
    freq: "none",
    seriesId: item.id,
  };
}

export function movedSpan(start: GoogleWhen, end: GoogleWhen | undefined, newDate: string) {
  if (start.date && !start.dateTime) {
    const length = end?.date ? Math.max(daysBetween(end.date, start.date), 1) : 1;
    return {
      start: { date: newDate },
      end: { date: addDays(newDate, length) },
    };
  }
  const zone = start.timeZone || "Europe/Berlin";
  const startClock = clockOf(start, zone);
  const endClock = clockOf(end, zone);
  const startTime = startClock?.time ?? "00:00";
  const endTime = endClock?.time ?? startTime;
  let endDate = newDate;
  if (startClock?.date && endClock?.date && endClock.date !== startClock.date) {
    endDate = addDays(newDate, daysBetween(endClock.date, startClock.date));
  }
  return {
    start: { dateTime: `${newDate}T${startTime}:00`, timeZone: zone },
    end: { dateTime: `${endDate}T${endTime}:00`, timeZone: zone },
  };
}

export function createBody(input: { title: string; date: string; time?: string; end?: string; note?: string }) {
  const summary = input.title.trim().slice(0, 140);
  const description = input.note?.trim().slice(0, 280);
  if (!input.time) {
    return {
      summary,
      ...(description ? { description } : {}),
      start: { date: input.date },
      end: { date: addDays(input.date, 1) },
    };
  }
  const end = input.end && input.end > input.time ? input.end : plusMinutes(input.time, 60);
  return {
    summary,
    ...(description ? { description } : {}),
    start: { dateTime: `${input.date}T${input.time}:00`, timeZone: "Europe/Berlin" },
    end: { dateTime: `${input.date}T${end}:00`, timeZone: "Europe/Berlin" },
  };
}

function plusMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = Math.min((hour ?? 0) * 60 + (minute ?? 0) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function inWindow(date: string, today: string) {
  return date >= today && date < addDays(today, 14);
}

export function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isClock(value: string | undefined) {
  return value === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
