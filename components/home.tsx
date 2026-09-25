"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DayBoard } from "@/components/day-board";
import { DayCheckin } from "@/components/day-checkin";
import { useLang } from "@/components/lang";
import { MonthStage } from "@/components/month-stage";
import type { useJournal } from "@/components/use-journal";
import { VoiceBox } from "@/components/voice-box";
import { Wash } from "@/components/wash";
import { WeekStage } from "@/components/week-stage";
import { YearStage } from "@/components/year-stage";
import { iso, parseISODate, startOfMonth } from "@/lib/dates";
import { PERSONA_LINE, stanceFor, tintHex } from "@/lib/voice";

export function Home({ journal }: { journal: ReturnType<typeof useJournal> }) {
  const { signOut } = useClerk();
  const { lang, say, t } = useLang();
  const profile = journal.profile;
  const today = useMemo(() => new Date(), []);
  const todayIso = iso(today);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(todayIso);
  const [sheet, setSheet] = useState(false);
  const [view, setView] = useState<"month" | "week" | "year">("month");
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of journal.events) map[event.date] = (map[event.date] ?? 0) + 1;
    for (const todo of journal.todos) map[todo.date] = (map[todo.date] ?? 0) + 1;
    return map;
  }, [journal.events, journal.todos]);

  useEffect(() => {
    if (!journal.focus) return;
    setSelected(journal.focus);
    setCursor(startOfMonth(parseISODate(journal.focus)));
    setView("month");
  }, [journal.focus]);

  if (!profile) return null;
  const stance = say(stanceFor(profile, today, journal.logs[todayIso]));
  const color = tintHex(stance.tint);
  const openDate = selected || todayIso;
  const hello = profile.displayName
    ? lang === "de"
      ? `Hallo ${profile.displayName}, schön dass du da bist.`
      : profile.displayName
    : null;

  function selectDay(date: string) {
    setSelected(date);
    if (window.matchMedia("(max-width: 899px)").matches) setSheet(true);
  }

  return (
    <>
      <Wash color={color} />
      <div className="mx-auto min-h-dvh w-full max-w-[1400px] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-28 min-[900px]:px-10 min-[900px]:py-10 min-[900px]:pb-10">
        {journal.offer ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
            <p className="max-w-md text-sm">{t("takeBody")}</p>
            <div className="flex gap-3">
              <button type="button" className="min-h-12 bg-ink px-4 text-paper" onClick={() => void journal.takeDevice()}>{t("takeYes")}</button>
              <button type="button" className="min-h-12 px-3" onClick={journal.dismissOffer}>{t("leave")}</button>
            </div>
          </div>
        ) : null}
        <div className="min-[900px]:grid min-[900px]:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-x-16 xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] xl:gap-x-24">
          <header className="min-[900px]:sticky min-[900px]:top-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
              <div className="flex items-center gap-4 text-sm">
                <button type="button" className="min-h-12" onClick={() => journal.setRevising(true)}>{t("revise")}</button>
                <Link href="/settings" className="inline-flex min-h-12 items-center">{t("settings")}</Link>
                {journal.guestMode ? null : (
                  <button type="button" className="min-h-12" onClick={() => signOut({ redirectUrl: "/" })}>{t("signOut")}</button>
                )}
              </div>
            </div>
            {journal.guestMode ? <p className="mt-3 text-sm">{t("guestNote")}</p> : null}
            {hello ? <p className="mt-6 font-serif text-2xl">{hello}</p> : null}
            <p className="mt-6 text-sm min-[900px]:mt-8">{PERSONA_LINE[profile.persona]}</p>
            <h1 className="mt-3 font-serif text-5xl leading-none min-[900px]:text-6xl" style={{ color }}>{stance.kicker}</h1>
            {stance.detail ? (
              <p className={stance.detailTone === "strong" ? "mt-3 font-serif text-2xl min-[900px]:text-3xl" : "mt-3 max-w-sm text-sm leading-snug text-ink/80"}>
                {stance.detail}
              </p>
            ) : null}
            <p className="mt-8 font-serif text-[1.65rem] leading-tight min-[900px]:text-[2.15rem]">{stance.lines[0]}</p>
            <p className="mt-2 font-serif text-[1.65rem] leading-tight min-[900px]:text-[2.15rem]">{stance.lines[1]}</p>
            <div className="mt-8 grid gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em]">{t("food")}</p>
                <p className="mt-1 text-base leading-snug">{stance.food}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em]">{t("move")}</p>
                <p className="mt-1 text-base leading-snug">{stance.move}</p>
              </div>
            </div>
            <div className="mt-10 hidden min-[900px]:block">
              <DayCheckin
                profile={profile}
                date={openDate}
                existing={journal.logs[openDate]}
                busy={journal.busy}
                fullscreen={false}
                onClose={() => undefined}
                onSave={(log) => void journal.saveDay(log)}
              />
              <DayBoard date={openDate} journal={journal} />
              <VoiceBox date={openDate} existing={journal.logs[openDate]} journal={journal} />
            </div>
          </header>
          <div className="mt-10 min-[900px]:mt-0">
            <div className="mb-4 flex gap-4 text-sm">
              {(["month", "week", "year"] as const).map((item) => (
                <button key={item} type="button" className={`min-h-12 ${view === item ? "border-b border-ink" : ""}`} onClick={() => setView(item)}>
                  {t(item)}
                </button>
              ))}
            </div>
            {view === "month" ? (
              <MonthStage
                profile={profile}
                cursor={cursor}
                today={today}
                logs={journal.logs}
                selected={selected}
                counts={counts}
                onCursor={setCursor}
                onSelect={selectDay}
              />
            ) : null}
            {view === "week" ? (
              <WeekStage
                profile={profile}
                cursor={cursor}
                today={today}
                logs={journal.logs}
                selected={selected}
                counts={counts}
                onCursor={setCursor}
                onSelect={selectDay}
              />
            ) : null}
            {view === "year" ? (
              <YearStage
                profile={profile}
                year={cursor.getFullYear()}
                logs={journal.logs}
                onYear={(year) => setCursor(new Date(year, cursor.getMonth(), 1))}
                onOpenMonth={(month) => {
                  setCursor(new Date(cursor.getFullYear(), month, 1));
                  setView("month");
                }}
              />
            ) : null}
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
          {journal.logs[todayIso] ? t("seeToday") : t("checkin")}
        </button>
      </div>
      {sheet ? (
        <div className="fixed inset-0 z-30 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] min-[900px]:hidden" style={{ background: `radial-gradient(80% 40% at 0% 0%, color-mix(in srgb, ${color} 34%, transparent), transparent 70%), var(--paper)` }}>
          <DayCheckin
            profile={profile}
            date={openDate}
            existing={journal.logs[openDate]}
            busy={journal.busy}
            fullscreen
            onClose={() => setSheet(false)}
            onSave={(log) => {
              void journal.saveDay(log).then(() => setSheet(false));
            }}
          />
          <DayBoard date={openDate} journal={journal} />
          <VoiceBox date={openDate} existing={journal.logs[openDate]} journal={journal} />
        </div>
      ) : null}
    </>
  );
}
