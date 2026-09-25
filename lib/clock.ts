import { parseISODate } from "./dates";
import type { DayEvent } from "./types";

export function minutesOf(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function clockOf(minutes: number) {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function endOf(start: string, end?: string) {
  if (end && minutesOf(end) > minutesOf(start)) return end;
  return clockOf(minutesOf(start) + 60);
}

export function snapQuarter(minutes: number) {
  return Math.round(minutes / 15) * 15;
}

export type Placed = {
  event: DayEvent;
  column: number;
  columns: number;
};

export function placeTimed(events: DayEvent[]): Placed[] {
  const timed = events
    .filter((event) => event.time)
    .map((event) => ({
      event,
      start: minutesOf(event.time ?? "00:00"),
      end: minutesOf(endOf(event.time ?? "00:00", event.end)),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: Placed[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  function flush() {
    const columnEnds: number[] = [];
    const rows = cluster.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column < 0) {
        column = columnEnds.length;
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }
      return { event: item.event, column, columns: 0 };
    });
    const columns = Math.max(1, columnEnds.length);
    for (const row of rows) placed.push({ ...row, columns });
    cluster = [];
    clusterEnd = -1;
  }

  for (const item of timed) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length > 0) flush();
  return placed;
}

export function gridBounds(events: DayEvent[]) {
  let start = 7 * 60;
  let end = 21 * 60;
  for (const event of events) {
    if (!event.time) continue;
    const open = minutesOf(event.time);
    const close = minutesOf(endOf(event.time, event.end));
    start = Math.min(start, Math.floor(open / 60) * 60);
    end = Math.max(end, Math.ceil(close / 60) * 60);
  }
  start = Math.max(0, start);
  end = Math.min(24 * 60, Math.max(end, start + 60));
  return { start, end };
}

export function dueReminders(events: DayEvent[], now: Date) {
  const nowMs = now.getTime();
  return events.filter((event) => {
    if (!event.time || !event.remind || event.shared) return false;
    const start = at(event.date, event.time);
    const end = at(event.date, endOf(event.time, event.end));
    const remindAt = start - event.remind * 60_000;
    return nowMs >= remindAt && nowMs < end;
  });
}

export function reminderLine(event: DayEvent, now: Date) {
  if (!event.time) return event.title;
  const start = at(event.date, event.time);
  const diff = Math.round((start - now.getTime()) / 60_000);
  if (diff > 0) return `${event.title} um ${event.time}. In ${diff} Minuten.`;
  return `${event.title} hat begonnen.`;
}

function at(date: string, time: string) {
  const value = parseISODate(date);
  const [hour, minute] = time.split(":").map(Number);
  value.setHours(hour ?? 0, minute ?? 0, 0, 0);
  return value.getTime();
}
