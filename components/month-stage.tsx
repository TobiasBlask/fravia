"use client";

import {
  addMonths,
  formatDay,
  formatLong,
  formatMonth,
  formatMonthName,
  formatWeekday,
  iso,
  monthDates,
  monthWeeks,
} from "@/lib/dates";
import type { DayLog, Profile } from "@/lib/types";
import { dayMark, monthCaption, tintHex } from "@/lib/voice";

export function MonthStage({
  profile,
  cursor,
  today,
  logs,
  selected,
  onCursor,
  onSelect,
}: {
  profile: Profile;
  cursor: Date;
  today: Date;
  logs: Record<string, DayLog>;
  selected: string | null;
  onCursor: (next: Date) => void;
  onSelect: (date: string) => void;
}) {
  const todayIso = iso(today);
  const days = monthDates(cursor).map((date) => {
    const key = iso(date);
    const mark = dayMark(profile, date, logs[key]);
    return { date, key, mark, hasLog: Boolean(logs[key]) };
  });
  const layout = days[0]?.mark.layout ?? "bands";
  const caption = monthCaption(
    profile,
    days.map((day) => day.mark.band),
  );
  const runs: Array<{ band: string; tint: string; days: typeof days }> = [];
  for (const day of days) {
    const last = runs[runs.length - 1];
    if (last && last.band === day.mark.band) last.days.push(day);
    else runs.push({ band: day.mark.band, tint: tintHex(day.mark.tint), days: [day] });
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="min-h-12 pr-4 text-left text-sm"
          onClick={() => onCursor(addMonths(cursor, -1))}
        >
          {formatMonthName(addMonths(cursor, -1))}
        </button>
        <button
          type="button"
          className="min-h-12 pl-4 text-right text-sm"
          onClick={() => onCursor(addMonths(cursor, 1))}
        >
          {formatMonthName(addMonths(cursor, 1))}
        </button>
      </div>
      <h2 className="font-serif text-[2.6rem] leading-none capitalize min-[900px]:text-6xl">
        {formatMonth(cursor)}
      </h2>
      {caption ? (
        <p className="mt-3 max-w-xl text-sm leading-snug min-[900px]:text-base">
          {caption}
        </p>
      ) : null}
      {layout === "weeks" ? (
        <div className="mt-6">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.14em] text-ink/60 min-[900px]:gap-2">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
              <span key={day} className="py-2">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-1 grid gap-1 min-[900px]:gap-2">
            {monthWeeks(cursor).map((week, index) => (
              <div key={index} className="grid grid-cols-7 gap-1 min-[900px]:gap-2">
                {week.map((date, cell) =>
                  date ? (
                    <DayButton
                      key={iso(date)}
                      date={date}
                      tint={tintHex(dayMark(profile, date, logs[iso(date)]).tint)}
                      filled={dayMark(profile, date, logs[iso(date)]).tint !== "paper"}
                      band={dayMark(profile, date, logs[iso(date)]).band}
                      selected={selected === iso(date)}
                      today={iso(date) === todayIso}
                      hasLog={Boolean(logs[iso(date)])}
                      onSelect={onSelect}
                      tall
                    />
                  ) : (
                    <span key={`empty-${index}-${cell}`} />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 min-[900px]:gap-4">
          {runs.map((run) => (
            <section
              key={`${run.band}-${run.days[0].key}`}
              className="px-1 py-3 min-[900px]:px-3 min-[900px]:py-5"
              style={{
                background: `color-mix(in srgb, ${run.tint} 16%, var(--paper))`,
              }}
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3
                  className="font-serif text-2xl min-[900px]:text-4xl"
                  style={{ color: run.tint }}
                >
                  {run.band}
                </h3>
                <p className="text-xs tracking-wide">
                  {formatDay(run.days[0].date)}–{formatDay(run.days[run.days.length - 1].date)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 min-[900px]:gap-2">
                {run.days.map((day) => (
                  <DayButton
                    key={day.key}
                    date={day.date}
                    tint={run.tint}
                    filled={false}
                    band={day.mark.band}
                    selected={selected === day.key}
                    today={day.key === todayIso}
                    hasLog={day.hasLog}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="sr-only">{formatLong(today)}</p>
    </section>
  );
}

function DayButton({
  date,
  tint,
  filled,
  band,
  selected,
  today,
  hasLog,
  tall,
  onSelect,
}: {
  date: Date;
  tint: string;
  filled: boolean;
  band: string;
  selected: boolean;
  today: boolean;
  hasLog: boolean;
  tall?: boolean;
  onSelect: (date: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={today ? "date" : undefined}
      aria-pressed={selected}
      aria-label={`${formatLong(date)}${band ? `, ${band}` : ""}`}
      onClick={() => onSelect(iso(date))}
      className={`flex flex-col items-center justify-center ${tall ? "min-h-16 min-[900px]:min-h-28" : "min-h-14 w-[calc((100%-1.875rem)/7)] min-[900px]:min-h-24"}`}
      style={{
        background: selected
          ? "var(--paper)"
          : filled
            ? `color-mix(in srgb, ${tint} 24%, transparent)`
            : "transparent",
        outline: selected ? "1px solid var(--ink)" : "none",
        boxShadow: today ? "inset 0 -2px 0 var(--ink)" : undefined,
      }}
    >
      <span className="text-[10px] uppercase tracking-wide text-ink/60">
        {today ? "heute" : formatWeekday(date)}
      </span>
      <span className={today ? "font-serif text-lg min-[900px]:text-2xl" : "text-base min-[900px]:text-xl"}>
        {date.getDate()}
      </span>
      <span className={`mt-1 h-px w-3 ${hasLog ? "bg-ink" : "bg-transparent"}`} />
    </button>
  );
}
