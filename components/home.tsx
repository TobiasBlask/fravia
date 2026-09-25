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
import type { DayEvent } from "@/lib/types";
import { stanceFor, tintHex } from "@/lib/voice";

const VIEWS = ["day", "week", "month", "year"] as const;

export function Home({ journal }: { journal: ReturnType<typeof useJournal> }) {
  const { signOut } = useClerk();
  const { say, t } = useLang();
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
      <div className="mx-auto min-h-dvh w-full max-w-[1400px] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-28 min-[900px]:px-8 min-[900px]:py-8 min-[900px]:pb-8">
        {journal.offer ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
            <p className="max-w-md text-sm">{t("takeBody")}</p>
            <div className="flex gap-3">
              <button type="button" className="min-h-11 bg-ink px-4 text-paper" onClick={() => void journal.takeDevice()}>{t("takeYes")}</button>
              <button type="button" className="min-h-11 px-3" onClick={journal.dismissOffer}>{t("leave")}</button>
            </div>
          </div>
        ) : null}
        <header className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <p className="font-serif text-3xl leading-none min-[900px]:text-4xl">Fravia</p>
          <div className="flex rounded-[12px] border border-ink/20 p-1" role="tablist" aria-label="Ansicht">
            {VIEWS.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={view === item}
                className={`min-h-11 flex-1 px-3 text-sm transition-colors duration-150 min-[900px]:flex-none min-[900px]:px-4 ${view === item ? "rounded-[8px] bg-ink text-paper" : ""}`}
                onClick={() => setPicked(item)}
              >
                {item === "day" ? t("dayView") : t(item)}
              </button>
            ))}
          </div>
        </header>
        <div className="mt-2 flex flex-wrap items-center gap-x-4">
          <button type="button" className="min-h-11 text-sm min-[900px]:hidden" onClick={() => setSheet(true)}>{t("checkin")}</button>
          <button type="button" className="min-h-11 text-sm" onClick={() => journal.setRevising(true)}>{t("revise")}</button>
          <Link href="/settings" className="inline-flex min-h-11 items-center text-sm">{t("settings")}</Link>
          {journal.guestMode ? null : (
            <button type="button" className="min-h-11 text-sm" onClick={() => signOut({ redirectUrl: "/" })}>{t("signOut")}</button>
          )}
        </div>
        {journal.guestMode ? <p className="mt-2 text-sm">{t("guestNote")}</p> : null}
        <div className="mt-6 min-[900px]:grid min-[900px]:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-x-8">
          <aside className="hidden min-[900px]:block">
            <Workbook journal={journal} today={today} onPlaced={placed} />
            <details className="mt-10">
              <summary className="min-h-11 cursor-pointer text-sm">{t("checkin")}</summary>
              <div className="mt-6 bg-paper">
                <p className="font-serif text-4xl leading-none" style={{ color }}>{stance.kicker}</p>
                {stance.detail ? (
                  <p className={stance.detailTone === "strong" ? "mt-3 font-serif text-2xl" : "mt-3 max-w-sm text-base leading-snug"}>
                    {stance.detail}
                  </p>
                ) : null}
                <p className="mt-4 font-serif text-xl leading-tight">{stance.lines[0]}</p>
                <p className="mt-1 font-serif text-xl leading-tight">{stance.lines[1]}</p>
                <div className="mt-6 grid gap-4">
                  <div>
                    <p className="text-sm text-ink/60">{t("food")}</p>
                    <p className="mt-1 text-base leading-snug">{stance.food}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink/60">{t("move")}</p>
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
          </aside>
          <div className="min-[900px]:flex min-[900px]:h-[calc(100dvh-7.5rem)] min-[900px]:min-h-0 min-[900px]:flex-col min-[900px]:overflow-hidden min-[900px]:bg-paper">
            {reminders.length > 0 ? (
              <div className="mb-3 grid gap-2">
                {reminders.map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-3 border-b border-ink/15 pb-2">
                    <p className="text-sm">{reminderLine(event, today)}</p>
                    <button type="button" className="min-h-11 shrink-0 text-sm" onClick={() => setHiddenReminders((current) => [...current, event.id])}>
                      {t("done")}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <input
                type="date"
                aria-label={t("todayJump")}
                className="min-h-11 bg-transparent"
                value={selected}
                onChange={(event) => {
                  if (!event.target.value) return;
                  selectDay(event.target.value);
                }}
              />
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t("search")}</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("search")}
                  className="min-h-11 w-full border-b border-ink/30 bg-transparent"
                />
              </label>
            </div>
            {needle && hits.length === 0 ? <p className="mb-3 text-sm">{t("searchEmpty")}</p> : null}
            {hits.length > 0 ? (
              <ul className="mb-3 grid">
                {hits.map((event) => (
                  <li key={event.id}>
                    <button type="button" className="min-h-11 text-left text-sm" onClick={() => { selectDay(event.date); setQuery(""); setEditor({ event, date: event.date }); }}>
                      {event.date} {event.time ? `${event.time} ` : ""}{event.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {view === "day" || view === "week" ? (
              <div className="min-[900px]:flex min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:flex-col">
                <div className="mb-1 flex items-center justify-between">
                  <button type="button" className="min-h-11 min-w-11 text-lg" onClick={() => selectDay(iso(addDays(parseISODate(selected), view === "week" ? -7 : -1)))} aria-label={t("back")}>
                    ‹
                  </button>
                  <button type="button" className="min-h-11 min-w-11 text-lg" onClick={() => selectDay(iso(addDays(parseISODate(selected), view === "week" ? 7 : 1)))} aria-label={t("dayView")}>
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
              <div className="bg-paper">
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
              </div>
            ) : null}
            {view === "year" ? (
              <div className="bg-paper">
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-ink/10 bg-paper px-5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] min-[900px]:hidden">
        <button type="button" className="min-h-11 px-2 text-base" onClick={jumpToday}>
          {t("todayJump")}
        </button>
        <button type="button" className="min-h-11 px-2 text-base" onClick={() => setTalk(true)}>
          Dialog
        </button>
        <button
          type="button"
          aria-label="Eintragen"
          className="grid h-12 w-12 place-items-center rounded-full bg-ink font-sans text-2xl leading-none text-paper transition-opacity duration-150"
          onClick={() => setEditor({ date: selected })}
        >
          +
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
        <div className="fixed inset-0 z-30 overflow-y-auto bg-paper px-4 pt-[max(1rem,env(safe-area-inset-top))] min-[900px]:hidden">
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
