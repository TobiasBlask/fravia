"use client";

import { formatMonthName, iso } from "@/lib/dates";
import type { DayLog, Profile } from "@/lib/types";
import { dayMark, solidHex } from "@/lib/voice";
import { useLang } from "@/components/lang";

export function YearStage({
  profile,
  year,
  logs,
  onYear,
  onOpenMonth,
}: {
  profile: Profile;
  year: number;
  logs: Record<string, DayLog>;
  onYear: (year: number) => void;
  onOpenMonth: (month: number) => void;
}) {
  const { lang } = useLang();
  return (
    <section>
      <div className="flex items-center justify-between">
        <button type="button" className="min-h-12" onClick={() => onYear(year - 1)}>{year - 1}</button>
        <h2 className="font-serif text-5xl">{year}</h2>
        <button type="button" className="min-h-12" onClick={() => onYear(year + 1)}>{year + 1}</button>
      </div>
      <div className="mt-6 grid bg-paper">
        {Array.from({ length: 12 }, (_, month) => {
          const mid = new Date(year, month, 15);
          const mark = dayMark(profile, mid, logs[iso(mid)]);
          const tint = solidHex(mark.tint);
          return (
            <button
              key={month}
              type="button"
              onClick={() => onOpenMonth(month)}
              className="flex min-h-14 items-baseline justify-between gap-4 border-b border-ink/10 py-2 text-left"
            >
              <span className="font-serif text-3xl capitalize min-[900px]:text-4xl">{formatMonthName(mid, lang)}</span>
              {mark.band ? (
                <span className="text-sm" style={{ color: tint }}>{mark.band}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
