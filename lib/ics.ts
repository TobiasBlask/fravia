import { addDays, iso, parseISODate } from "./dates";
import type { DayEvent, EventKind } from "./types";

export function eventsToIcs(
  events: Array<{ id: string; title: string; date: string; time?: string; end?: string; note?: string; location?: string }>,
) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fravia//DE", "CALSCALE:GREGORIAN"];
  for (const event of events) {
    const stamp = event.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:${event.id}@fravia`);
    if (event.time) {
      lines.push(`DTSTART:${stamp}T${event.time.replace(":", "")}00`);
      const end = event.end && event.end > event.time ? event.end : bump(event.time);
      lines.push(`DTEND:${stamp}T${end.replace(":", "")}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${stamp}`);
      lines.push(`DTEND;VALUE=DATE:${iso(addDays(parseISODate(event.date), 1)).replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
    if (event.note) lines.push(`DESCRIPTION:${escapeIcs(event.note)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function parseIcs(
  text: string,
): Array<Pick<DayEvent, "title" | "date" | "time" | "end" | "note" | "location" | "kind">> {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const events = [];
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? "";
    const summary = field(body, "SUMMARY");
    const start = field(body, "DTSTART");
    if (!summary || !start) continue;
    const startBits = clockAndDate(start);
    if (!startBits) continue;
    const endRaw = field(body, "DTEND");
    const endBits = endRaw ? clockAndDate(endRaw) : null;
    const note = field(body, "DESCRIPTION");
    const location = field(body, "LOCATION");
    events.push({
      title: summary.slice(0, 140),
      date: startBits.date,
      kind: "termin" as EventKind,
      ...(startBits.time ? { time: startBits.time } : {}),
      ...(startBits.time && endBits?.time && endBits.time > startBits.time ? { end: endBits.time } : {}),
      ...(note ? { note: note.slice(0, 280) } : {}),
      ...(location ? { location: location.slice(0, 140) } : {}),
    });
  }
  return events;
}

function clockAndDate(raw: string) {
  const compact = raw.replace(/[^0-9T]/g, "");
  if (compact.length < 8) return null;
  const date = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = compact.length >= 13 ? `${compact.slice(9, 11)}:${compact.slice(11, 13)}` : undefined;
  return { date, time };
}

function field(body: string, name: string) {
  const match = body.match(new RegExp(`${name}[^:\\r\\n]*:(.+)`, "i"));
  return match?.[1]?.trim().replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\\\/g, "\\");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

function bump(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const total = ((hour ?? 0) * 60 + (minute ?? 0) + 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function parseCycleImport(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    const data = JSON.parse(trimmed) as {
      lastPeriodStart?: string;
      cycleLength?: number;
      periodLength?: number;
      lutealLength?: number;
    };
    return data;
  }
  const dates = trimmed.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  let cycleLength: number | undefined;
  if (sorted.length > 1) {
    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const a = Date.parse(sorted[i - 1]);
      const b = Date.parse(sorted[i]);
      gaps.push(Math.round((b - a) / 86_400_000));
    }
    const mid = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    if (mid >= 21 && mid <= 45) cycleLength = mid;
  }
  return { lastPeriodStart: sorted[sorted.length - 1], cycleLength };
}
