"use client";

import { useMemo, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { DayCheckin } from "@/components/day-checkin";
import { MonthStage } from "@/components/month-stage";
import { Wash } from "@/components/wash";
import { iso, startOfMonth } from "@/lib/dates";
import type { DayLog, Profile } from "@/lib/types";
import { PERSONA_LINE, stanceFor, tintHex } from "@/lib/voice";

export function Home({
  profile,
  logs,
  busy,
  onRevise,
  onSaveDay,
}: {
  profile: Profile;
  logs: Record<string, DayLog>;
  busy: boolean;
  onRevise: () => void;
  onSaveDay: (log: DayLog) => Promise<void>;
}) {
  const { signOut } = useClerk();
  const today = useMemo(() => new Date(), []);
  const todayIso = iso(today);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(todayIso);
  const [sheet, setSheet] = useState(false);
  const stance = stanceFor(profile, today, logs[todayIso]);
  const color = tintHex(stance.tint);
  const openDate = selected || todayIso;

  function selectDay(date: string) {
    setSelected(date);
    if (window.matchMedia("(max-width: 899px)").matches) setSheet(true);
  }

  return (
    <>
      <Wash color={color} />
      <div className="mx-auto min-h-dvh w-full max-w-[1400px] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-28 min-[900px]:px-10 min-[900px]:py-10 min-[900px]:pb-10">
        <div className="min-[900px]:grid min-[900px]:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-x-16 xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] xl:gap-x-24">
          <header className="min-[900px]:sticky min-[900px]:top-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
              <div className="flex items-center gap-4 text-sm">
                <button type="button" className="min-h-12" onClick={onRevise}>
                  Ausrichtung
                </button>
                <button
                  type="button"
                  className="min-h-12"
                  onClick={() => signOut({ redirectUrl: "/" })}
                >
                  Abmelden
                </button>
              </div>
            </div>
            <p className="mt-6 text-sm min-[900px]:mt-10 min-[900px]:text-base">
              {PERSONA_LINE[profile.persona]}
            </p>
            <h1
              className="mt-3 font-serif text-5xl leading-none min-[900px]:text-6xl"
              style={{ color }}
            >
              {stance.kicker}
            </h1>
            {stance.detail ? (
              <p
                className={
                  stance.detailTone === "strong"
                    ? "mt-3 font-serif text-2xl min-[900px]:text-3xl"
                    : "mt-3 max-w-sm text-sm leading-snug text-ink/80"
                }
              >
                {stance.detail}
              </p>
            ) : null}
            <p className="mt-8 font-serif text-[1.65rem] leading-tight min-[900px]:text-[2.15rem]">
              {stance.lines[0]}
            </p>
            <p className="mt-2 font-serif text-[1.65rem] leading-tight min-[900px]:text-[2.15rem]">
              {stance.lines[1]}
            </p>
            <div className="mt-8 grid gap-5 min-[900px]:mt-10">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em]">Heute ist für</p>
                <p className="mt-1 text-base leading-snug min-[900px]:text-lg">
                  {stance.forLine}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em]">
                  Heute ist nicht für
                </p>
                <p className="mt-1 text-base leading-snug min-[900px]:text-lg">
                  {stance.notLine}
                </p>
              </div>
            </div>
            <div className="mt-10 hidden min-[900px]:block">
              <DayCheckin
                profile={profile}
                date={openDate}
                existing={logs[openDate]}
                busy={busy}
                fullscreen={false}
                onClose={() => undefined}
                onSave={onSaveDay}
              />
            </div>
          </header>
          <div className="mt-10 min-[900px]:mt-0">
            <MonthStage
              profile={profile}
              cursor={cursor}
              today={today}
              logs={logs}
              selected={selected}
              onCursor={setCursor}
              onSelect={selectDay}
            />
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-paper/92 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[900px]:hidden">
        <button
          type="button"
          className="min-h-14 w-full bg-ink text-paper"
          onClick={() => {
            setSelected(todayIso);
            setSheet(true);
          }}
        >
          Heute ablegen
        </button>
      </div>
      {sheet ? (
        <div
          className="fixed inset-0 z-30 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] min-[900px]:hidden"
          style={{
            background: `radial-gradient(80% 40% at 0% 0%, color-mix(in srgb, ${color} 34%, transparent), transparent 70%), var(--paper)`,
          }}
        >
          <DayCheckin
            profile={profile}
            date={openDate}
            existing={logs[openDate]}
            busy={busy}
            fullscreen
            onClose={() => setSheet(false)}
            onSave={(log) => {
              void onSaveDay(log)
                .then(() => setSheet(false))
                .catch(() => undefined);
            }}
          />
        </div>
      ) : null}
    </>
  );
}
