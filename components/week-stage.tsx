"use client";

import { addDays, formatLong, formatWeekday, iso, weekDates } from "@/lib/dates";
import type { DayLog, Profile } from "@/lib/types";
import { dayMark, tintHex } from "@/lib/voice";
import { useLang } from "@/components/lang";

export function WeekStage({
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
  selected: string;
  counts: Record<string, number>;
  onCursor: (next: Date) => void;
  onSelect: (date: string) => void;
}) {
  const { lang, t } = useLang();
  const days = weekDates(cursor);
  return (
    <section>
      <div className="flex items-center justify-between">
        <button type="button" className="min-h-12 text-sm" onClick={() => onCursor(addDays(cursor, -7))}>
          {formatWeekday(addDays(cursor, -7), lang)}
        </button>
        <button type="button" className="min-h-12 text-sm" onClick={() => onCursor(addDays(cursor, 7))}>
          {formatWeekday(addDays(days[6], 7), lang)}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 min-[900px]:grid-cols-7">
        {days.map((date) => {
          const key = iso(date);
          const mark = dayMark(profile, date, logs[key]);
          const tint = tintHex(mark.tint);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="min-h-28 px-2 py-3 text-left"
              style={{
                background: `color-mix(in srgb, ${tint} 16%, var(--paper))`,
                outline: selected === key ? "1px solid var(--ink)" : "none",
              }}
            >
              <span className="text-[11px] uppercase tracking-wide">
                {key === iso(today) ? t("todayWord") : formatWeekday(date, lang)} {date.getDate()}
              </span>
              <span className="mt-2 block font-serif text-xl" style={{ color: tint }}>
                {mark.band}
              </span>
              {counts[key] ? <span className="mt-2 block text-sm">{counts[key]}</span> : null}
              <span className="sr-only">{formatLong(date, lang)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
