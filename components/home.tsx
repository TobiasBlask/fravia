"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DayBoard } from "@/components/day-board";
import { DayCheckin } from "@/components/day-checkin";
import { EventSheet } from "@/components/event-sheet";
import { useLang } from "@/components/lang";
import { MonthStage } from "@/components/month-stage";
import { TimeGrid } from "@/components/time-grid";
import type { useJournal } from "@/components/use-journal";
import { VoiceBox } from "@/components/voice-box";
import { Wash } from "@/components/wash";
import { Workbook } from "@/components/workbook";
import { YearStage } from "@/components/year-stage";
import { clockOf, dueReminders, endOf, minutesOf, reminderLine } from "@/lib/clock";
import { addDays, iso, parseISODate, startOfMonth, weekDates } from "@/lib/dates";
import { openingLine } from "@/lib/plan";
import type { DayEvent } from "@/lib/types";
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
  const [talk, setTalk] = useState(false);
  const [wide, setWide] = useState(false);
  const [picked, setPicked] = useState<"day" | "week" | "month" | "year" | null>(null);
  const [query, setQuery] = useState("");
  const [hiddenReminders, setHiddenReminders] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ event?: DayEvent; date: string; time?: string } | null>(null);
  const view = picked ?? (wide ? "week" : "day");
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of journal.events) map[event.date] = (map[event.date] ?? 0) + 1;
    for (const todo of journal.todos) map[todo.date] = (map[todo.date] ?? 0) + 1;
    return map;
  }, [journal.events, journal.todos]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!journal.focus) return;
    setSelected(journal.focus);
    setCursor(parseISODate(journal.focus));
    setPicked(window.matchMedia("(min-width: 900px)").matches ? "week" : "day");
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
    setCursor(parseISODate(date));
    if (window.matchMedia("(max-width: 899px)").matches) setPicked("day");
  }

  function placed(date: string) {
    setSelected(date);
    setCursor(parseISODate(date));
    setPicked(window.matchMedia("(min-width: 900px)").matches ? "week" : "day");
  }

  function jumpToday() {
    setSelected(todayIso);
    setCursor(today);
    setPicked(wide ? "week" : "day");
  }

  const reminders = dueReminders(journal.events, today).filter((event) => !hiddenReminders.includes(event.id));
  const needle = query.trim().toLowerCase();
  const hits = needle
    ? journal.events.filter((event) => [event.title, event.location, event.note].some((value) => value?.toLowerCase().includes(needle))).slice(0, 8)
    : [];
  const anchor = parseISODate(selected);
  const gridDays = view === "week" ? weekDates(anchor) : [anchor];

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
            <p className="mt-6 font-serif text-[1.65rem] leading-tight min-[900px]:hidden">
              {openingLine(profile, today, journal.logs)}
            </p>
            <div className="mt-8 hidden min-[900px]:block">
              <Workbook journal={journal} today={today} onPlaced={placed} />
            </div>
            <details className="mt-8 hidden min-[900px]:block">
              <summary className="min-h-12 cursor-pointer text-sm">Heute ablegen</summary>
              <div className="mt-6">
                <p className="font-serif text-4xl leading-none" style={{ color }}>{stance.kicker}</p>
                {stance.detail ? (
                  <p className={stance.detailTone === "strong" ? "mt-3 font-serif text-2xl" : "mt-3 max-w-sm text-sm leading-snug text-ink/80"}>
                    {stance.detail}
                  </p>
                ) : null}
                <p className="mt-4 font-serif text-xl leading-tight">{stance.lines[0]}</p>
                <p className="mt-1 font-serif text-xl leading-tight">{stance.lines[1]}</p>
                <div className="mt-6 grid gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em]">{t("food")}</p>
                    <p className="mt-1 text-base leading-snug">{stance.food}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em]">{t("move")}</p>
                    <p className="mt-1 text-base leading-snug">{stance.move}</p>
                  </div>
                </div>
                <div className="mt-8">
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
              </div>
            </details>
          </header>
          <div className="mt-6 min-[900px]:mt-0 min-[900px]:h-[calc(100dvh-5rem)] min-[900px]:overflow-hidden">
            {reminders.length > 0 ? (
              <div className="mb-3 grid gap-2">
                {reminders.map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-3 border-b border-ink/15 pb-2">
                    <p className="text-sm">{reminderLine(event, today)}</p>
                    <button type="button" className="min-h-10 shrink-0 text-sm" onClick={() => setHiddenReminders((current) => [...current, event.id])}>
                      {t("done")}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {(["day", "week", "month", "year"] as const).map((item) => (
                <button key={item} type="button" className={`min-h-12 ${view === item ? "border-b border-ink" : ""}`} onClick={() => setPicked(item)}>
                  {item === "day" ? t("dayView") : t(item)}
                </button>
              ))}
              <button type="button" className="min-h-12" onClick={jumpToday}>{t("todayJump")}</button>
              <input
                type="date"
                aria-label={t("todayJump")}
                className="min-h-12 bg-transparent"
                value={selected}
                onChange={(event) => {
                  if (!event.target.value) return;
                  selectDay(event.target.value);
                }}
              />
            </div>
            <label className="mb-3 block">
              <span className="sr-only">{t("search")}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("search")}
                className="min-h-12 w-full border-b border-ink/30 bg-transparent"
              />
            </label>
            {needle && hits.length === 0 ? <p className="mb-3 text-sm">{t("searchEmpty")}</p> : null}
            {hits.length > 0 ? (
              <ul className="mb-3 grid gap-1">
                {hits.map((event) => (
                  <li key={event.id}>
                    <button type="button" className="min-h-10 text-left text-sm" onClick={() => { selectDay(event.date); setQuery(""); setEditor({ event, date: event.date }); }}>
                      {event.date} {event.time ? `${event.time} ` : ""}{event.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {view === "day" || view === "week" ? (
              <div className="min-[900px]:h-[calc(100dvh-14rem)]">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <button type="button" className="min-h-12 px-3" onClick={() => selectDay(iso(addDays(parseISODate(selected), view === "week" ? -7 : -1)))} aria-label={t("back")}>
                    ‹
                  </button>
                  <button type="button" className="min-h-12 px-3" onClick={() => selectDay(iso(addDays(parseISODate(selected), view === "week" ? 7 : 1)))} aria-label={t("dayView")}>
                    ›
                  </button>
                </div>
                <TimeGrid
                  days={gridDays}
                  events={journal.events}
                  todos={journal.todos}
                  profile={profile}
                  logs={journal.logs}
                  today={todayIso}
                  onSlot={(date, slot) => setEditor({ date, time: slot })}
                  onOpen={(event) => setEditor({ event, date: event.date })}
                  onMove={(event, date, slot) => {
                    if (!event.time) return;
                    const duration = minutesOf(endOf(event.time, event.end)) - minutesOf(event.time);
                    void journal.moveEvent(event.id, date, { time: slot, end: clockOf(minutesOf(slot) + duration) });
                    setSelected(date);
                  }}
                  onToggleTodo={(id) => void journal.toggleTodo(id)}
                />
              </div>
            ) : null}
            {view === "month" ? (
              <MonthStage
                profile={profile}
                cursor={startOfMonth(cursor)}
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
                  setPicked("month");
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-ink/10 bg-paper/92 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[900px]:hidden">
        <button type="button" className="min-h-14 flex-1 bg-ink text-paper" onClick={() => setTalk(true)}>
          Mit Fravia planen
        </button>
        <button
          type="button"
          className="min-h-14 px-4"
          onClick={() => {
            setSelected(todayIso);
            setSheet(true);
          }}
        >
          Heute
        </button>
      </div>
      {editor ? (
        <EventSheet
          journal={journal}
          date={editor.date}
          event={editor.event}
          time={editor.time}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {talk ? (
        <div className="fixed inset-0 z-40 bg-paper min-[900px]:hidden">
          <Workbook journal={journal} today={today} onPlaced={placed} onClose={() => setTalk(false)} />
        </div>
      ) : null}
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
