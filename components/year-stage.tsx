"use client";

import { formatMonthName, iso } from "@/lib/dates";
import type { DayLog, Profile } from "@/lib/types";
import { dayMark, tintHex } from "@/lib/voice";
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
      <div className="mt-6 grid grid-cols-2 gap-3 min-[900px]:grid-cols-3">
        {Array.from({ length: 12 }, (_, month) => {
          const mid = new Date(year, month, 15);
          const mark = dayMark(profile, mid, logs[iso(mid)]);
          const tint = tintHex(mark.tint);
          return (
            <button
              key={month}
              type="button"
              onClick={() => onOpenMonth(month)}
              className="min-h-24 px-3 py-4 text-left"
              style={{ background: `color-mix(in srgb, ${tint} 18%, var(--paper))` }}
            >
              <span className="font-serif text-2xl capitalize">{formatMonthName(mid, lang)}</span>
              {mark.band ? (
                <span className="mt-2 block text-sm" style={{ color: tint }}>{mark.band}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
