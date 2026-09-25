import type { DayEvent, EventKind } from "./types";

export function eventsToIcs(events: Array<{ id: string; title: string; date: string; time?: string }>) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fravia//DE", "CALSCALE:GREGORIAN"];
  for (const event of events) {
    const stamp = event.date.replace(/-/g, "");
    const start = event.time
      ? `${stamp}T${event.time.replace(":", "")}00`
      : stamp;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@fravia`,
      `DTSTART:${start}`,
      `SUMMARY:${event.title.replace(/\n/g, " ")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function parseIcs(text: string): Array<Pick<DayEvent, "title" | "date" | "time" | "note" | "kind">> {
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const events = [];
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? "";
    const summary = field(body, "SUMMARY");
    const start = field(body, "DTSTART");
    if (!summary || !start) continue;
    const compact = start.replace(/[^0-9T]/g, "");
    const date = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const time =
      compact.length >= 13 ? `${compact.slice(9, 11)}:${compact.slice(11, 13)}` : undefined;
    const note = field(body, "DESCRIPTION");
    events.push({
      title: summary.slice(0, 140),
      date,
      kind: "termin" as EventKind,
      ...(time ? { time } : {}),
      ...(note ? { note: note.slice(0, 280) } : {}),
    });
  }
  return events;
}

function field(body: string, name: string) {
  const match = body.match(new RegExp(`${name}[^:]*:(.+)`, "i"));
  return match?.[1]?.trim().replace(/\\n/g, " ").replace(/\\,/g, ",");
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
