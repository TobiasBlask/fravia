"use client";

import { useLang } from "@/components/lang";
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
import { dayMark, monthCaption, solidHex } from "@/lib/voice";

export function MonthStage({
  profile,
  cursor,
  today,
  logs,
  selected,
  counts,
  onCursor,
  onSelect,
}: {
  profile: Profile;
  cursor: Date;
  today: Date;
  logs: Record<string, DayLog>;
  selected: string | null;
  counts?: Record<string, number>;
  onCursor: (next: Date) => void;
  onSelect: (date: string) => void;
}) {
  const { lang, t } = useLang();
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
    else runs.push({ band: day.mark.band, tint: solidHex(day.mark.tint), days: [day] });
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="min-h-12 pr-4 text-left text-sm"
          onClick={() => onCursor(addMonths(cursor, -1))}
        >
          {formatMonthName(addMonths(cursor, -1), lang)}
        </button>
        <button
          type="button"
          className="min-h-12 pl-4 text-right text-sm"
          onClick={() => onCursor(addMonths(cursor, 1))}
        >
          {formatMonthName(addMonths(cursor, 1), lang)}
        </button>
      </div>
      <h2 className="font-serif text-[2.6rem] leading-none capitalize min-[900px]:text-6xl">
        {formatMonth(cursor, lang)}
      </h2>
      {caption ? (
        <p className="mt-3 max-w-xl text-sm leading-snug min-[900px]:text-base">
          {caption}
        </p>
      ) : null}
      {layout === "weeks" ? (
        <div className="mt-6">
          <div className="grid grid-cols-7 gap-1 text-center text-sm text-ink/50 min-[900px]:gap-2">
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
                      tint={solidHex(dayMark(profile, date, logs[iso(date)]).tint)}
                      band={dayMark(profile, date, logs[iso(date)]).band}
                      selected={selected === iso(date)}
                      today={iso(date) === todayIso}
                      todayWord={t("todayWord")}
                      count={counts?.[iso(date)] ?? 0}
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
              className="bg-paper px-1 py-3 min-[900px]:px-3 min-[900px]:py-5"
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3
                  className="font-serif text-2xl min-[900px]:text-4xl"
                  style={{ color: run.tint }}
                >
                  {run.band}
                </h3>
                <p className="text-sm">
                  {formatDay(run.days[0].date)}–{formatDay(run.days[run.days.length - 1].date)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 min-[900px]:gap-2">
                {run.days.map((day) => (
                  <DayButton
                    key={day.key}
                    date={day.date}
                    tint={run.tint}
                    band={day.mark.band}
                    selected={selected === day.key}
                    today={day.key === todayIso}
                    todayWord={t("todayWord")}
                    count={counts?.[day.key] ?? 0}
                    hasLog={day.hasLog}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="sr-only">{formatLong(today, lang)}</p>
    </section>
  );
}

function DayButton({
  date,
  tint,
  band,
  selected,
  today,
  todayWord,
  count,
  hasLog,
  tall,
  onSelect,
}: {
  date: Date;
  tint: string;
  band: string;
  selected: boolean;
  today: boolean;
  todayWord: string;
  count: number;
  hasLog: boolean;
  tall?: boolean;
  onSelect: (date: string) => void;
}) {
  const { lang } = useLang();
  return (
    <button
      type="button"
      aria-current={today ? "date" : undefined}
      aria-pressed={selected}
      aria-label={`${formatLong(date, lang)}${band ? `, ${band}` : ""}`}
      onClick={() => onSelect(iso(date))}
      className={`flex flex-col items-center justify-center ${tall ? "min-h-16 min-[900px]:min-h-28" : "min-h-14 w-[calc((100%-1.875rem)/7)] min-[900px]:min-h-24"} ${selected ? "border-b border-ink" : ""}`}
    >
      <span className="text-sm text-ink/60">
        {today ? todayWord : formatWeekday(date, lang)}
      </span>
      <span
        className={today ? "font-serif text-3xl leading-none min-[900px]:text-4xl" : "font-serif text-xl leading-none min-[900px]:text-2xl"}
        style={today ? { color: tint } : undefined}
      >
        {date.getDate()}
      </span>
      <span className={`mt-1 h-px w-3 ${hasLog ? "bg-ink" : "bg-transparent"}`} />
      {count > 0 ? <span className="text-sm">{count}</span> : null}
    </button>
  );
}
