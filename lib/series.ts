function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1 + months, d ?? 1));
  return date.toISOString().slice(0, 10);
}

function nextOpenDay(iso: string, saturday: boolean) {
  let cursor = addDays(iso, 1);
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(`${cursor}T12:00:00Z`).getUTCDay();
    if (day !== 0 && (saturday || day !== 6)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function seriesDates(start: string, freq: string, until?: string) {
  const dates = [start];
  if (!freq || freq === "none") return dates;
  let cursor = start;
  for (let i = 0; i < 23; i += 1) {
    if (freq === "daily") cursor = addDays(cursor, 1);
    else if (freq === "weekdays") cursor = nextOpenDay(cursor, false);
    else if (freq === "weekdays-sat") cursor = nextOpenDay(cursor, true);
    else if (freq === "weekly") cursor = addDays(cursor, 7);
    else if (freq === "monthly") cursor = addMonths(cursor, 1);
    else if (freq === "quarterly") cursor = addMonths(cursor, 3);
    else if (freq === "halfyearly") cursor = addMonths(cursor, 6);
    else if (freq === "yearly") cursor = addMonths(cursor, 12);
    else break;
    if (until && cursor > until) break;
    dates.push(cursor);
  }
  return dates;
}
