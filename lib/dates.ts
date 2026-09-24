export function iso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function daysBetween(later: Date, earlier: Date) {
  const a = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const b = Date.UTC(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
  );
  return Math.round((a - b) / 86_400_000);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function monthDates(cursor: Date) {
  const count = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  return Array.from(
    { length: count },
    (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1),
  );
}

export function monthWeeks(cursor: Date) {
  const days = monthDates(cursor);
  const pad = (days[0].getDay() + 6) % 7;
  const cells: Array<Date | null> = [...Array(pad).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<Date | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatMonthName(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { month: "long" }).format(date);
}

export function formatLong(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" })
    .format(date)
    .replace(".", "");
}

export function formatDay(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { day: "numeric" }).format(date);
}
