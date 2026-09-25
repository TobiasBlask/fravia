"use client";

import { useClerk } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { DayBoard } from "@/components/day-board";
import { DayCheckin } from "@/components/day-checkin";
import { EventSheet } from "@/components/event-sheet";
import { ConsequenceLead, FineWeek, WeekAsk } from "@/components/first-screen";
import { useLang } from "@/components/lang";
import { MonthStage } from "@/components/month-stage";
import { TimeGrid } from "@/components/time-grid";
import type { useJournal } from "@/components/use-journal";
import { VoiceBox } from "@/components/voice-box";
import { Wash } from "@/components/wash";
import { Workbook } from "@/components/workbook";
import { YearStage } from "@/components/year-stage";
import { clockOf, dueReminders, endOf, minutesOf, nextQuarter, reminderLine } from "@/lib/clock";
import { addDays, formatWeekday, iso, parseISODate, startOfMonth, weekDates } from "@/lib/dates";
import { consequence, type Proposal } from "@/lib/plan";
import type { DayEvent } from "@/lib/types";
import { stanceFor, tintHex } from "@/lib/voice";

const VIEWS = ["day", "week", "month", "year"] as const;

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
  const [quick, setQuick] = useState<{ date: string; time: string } | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [intent, setIntent] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<DayEvent[] | null>(null);
  const [googleTick, setGoogleTick] = useState(0);
  const [googleNote, setGoogleNote] = useState<string | null>(null);
  const googleStatus = useQuery(api.google.status);
  const listGoogle = useAction(api.googleApi.events);
  const createGoogle = useAction(api.googleApi.create);
  const moveGoogle = useAction(api.googleApi.move);
  const stageRef = useRef<HTMLDivElement>(null);
  const view = picked ?? (wide ? "week" : "day");
  const shown = useMemo(() => {
    if (!googleEvents) return journal.events;
    const limit = iso(addDays(today, 14));
    const kept = journal.events.filter((event) => event.date < todayIso || event.date >= limit);
    return [...kept, ...googleEvents];
  }, [googleEvents, journal.events, today, todayIso]);
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of shown) map[event.date] = (map[event.date] ?? 0) + 1;
    for (const todo of journal.todos) map[todo.date] = (map[todo.date] ?? 0) + 1;
    return map;
  }, [shown, journal.todos]);

  useEffect(() => {
    if (!googleStatus?.connected) {
      setGoogleEvents(null);
      setGoogleNote(null);
      return;
    }
    let cancel = false;
    void listGoogle({ today: todayIso })
      .then((result) => {
        if (cancel) return;
        if (!result.connected || result.failed) {
          setGoogleEvents(null);
          setGoogleNote(result.failed ? "Google hat nicht geantwortet." : null);
          return;
        }
        setGoogleNote(null);
        setGoogleEvents(result.events);
      })
      .catch(() => {
        if (!cancel) {
          setGoogleEvents(null);
          setGoogleNote("Google hat nicht geantwortet.");
        }
      });
    return () => {
      cancel = true;
    };
  }, [googleStatus?.connected, googleTick, listGoogle, todayIso]);

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

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    function down(event: PointerEvent) {
      if (window.innerWidth >= 900) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-event], input, textarea, button, a, select, [data-decision]")) return;
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    }
    function up(event: PointerEvent) {
      if (!tracking) return;
      tracking = false;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
      const next = iso(addDays(parseISODate(selected), dx < 0 ? 1 : -1));
      setSelected(next);
      setCursor(parseISODate(next));
    }
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointerup", up);
    return () => {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointerup", up);
    };
  }, [profile, selected]);

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
    setTalk(false);
  }

  function openQuick(date: string, time?: string) {
    setEditor(null);
    setQuickTitle("");
    setQuick({ date, time: time ?? nextQuarter() });
  }

  async function commitQuick(event: FormEvent) {
    event.preventDefault();
    if (!quick || !quickTitle.trim()) return;
    const start = quick.time;
    const end = clockOf(Math.min(minutesOf(start) + 60, 23 * 60 + 59));
    if (googleStatus?.connected) {
      try {
        const result = await createGoogle({ title: quickTitle.trim(), date: quick.date, time: start, end });
        if (!result.ok) {
          setFailed(true);
          return;
        }
      } catch {
        setFailed(true);
        return;
      }
      setGoogleTick((current) => current + 1);
    } else {
      await journal.addEvent({
        title: quickTitle.trim(),
        kind: "termin",
        date: quick.date,
        time: start,
        end,
        freq: "none",
      });
    }
    setSelected(quick.date);
    setCursor(parseISODate(quick.date));
    setQuick(null);
    setQuickTitle("");
  }

  async function commitNamed(proposal: Proposal) {
    setPlacing(true);
    setFailed(false);
    try {
      if (proposal.kind === "todo") {
        await journal.addTodo({ title: proposal.title, date: proposal.date, freq: "none" });
      } else if (googleStatus?.connected) {
        const result = await createGoogle({
          title: proposal.title,
          date: proposal.date,
          ...(proposal.time ? { time: proposal.time } : {}),
          ...(proposal.end ? { end: proposal.end } : {}),
          ...(proposal.note ? { note: proposal.note } : {}),
        });
        if (!result.ok) throw new Error("google");
        setGoogleTick((current) => current + 1);
      } else {
        await journal.addEvent({
          title: proposal.title,
          kind: proposal.kind,
          date: proposal.date,
          freq: "none",
          ...(proposal.time ? { time: proposal.time } : {}),
          ...(proposal.end ? { end: proposal.end } : {}),
          ...(proposal.note ? { note: proposal.note } : {}),
        });
      }
      setIntent(null);
      setSettled(true);
      placed(proposal.date);
    } catch {
      setFailed(true);
    } finally {
      setPlacing(false);
    }
  }

  async function shiftEvent(id: string, date: string) {
    setPlacing(true);
    setFailed(false);
    try {
      if (id.startsWith("gcal:")) {
        const result = await moveGoogle({ id, date });
        if (!result.ok) throw new Error("google");
        setGoogleTick((current) => current + 1);
      } else {
        await journal.moveEvent(id, date);
      }
      setSettled(true);
      placed(date);
    } catch {
      setFailed(true);
    } finally {
      setPlacing(false);
    }
  }

  function jumpToday() {
    setSelected(todayIso);
    setCursor(today);
    setPicked(wide ? "week" : "day");
  }

  const horizon = iso(addDays(today, 14));
  const waiting = Boolean(googleStatus?.connected) && googleEvents === null && !googleNote;
  const soon = shown.filter((event) => event.date >= todayIso && event.date < horizon);
  const lead = !waiting && soon.some((event) => !event.shared) ? consequence(profile, today, shown, journal.logs, skipped) : null;
  const leadEvent = lead ? shown.find((event) => event.id === lead.eventId) : undefined;
  const reminders = dueReminders(shown, today).filter((event) => !hiddenReminders.includes(event.id));
  const needle = query.trim().toLowerCase();
  const hits = needle
    ? shown.filter((event) => [event.title, event.location, event.note].some((value) => value?.toLowerCase().includes(needle))).slice(0, 8)
    : [];
  const anchor = parseISODate(selected);
  const gridDays = view === "week" ? weekDates(anchor) : [anchor];
  const rangeKeys = new Set(gridDays.map((date) => iso(date)));
  const inRange = shown.filter((event) => rangeKeys.has(event.date));
  const todosInRange = journal.todos.filter((todo) => rangeKeys.has(todo.date));
  const emptyRange = (view === "day" || view === "week") && inRange.length === 0 && todosInRange.length === 0;
  const timedHere = inRange.some((event) => event.time);
  const nowMs = today.getTime();
  const upcoming = !timedHere && (view === "day" || view === "week")
    ? shown
        .filter((event) => {
          if (!event.time) return false;
          const [hour, minute] = event.time.split(":").map(Number);
          const when = parseISODate(event.date);
          when.setHours(hour ?? 0, minute ?? 0, 0, 0);
          const floor = Math.max(nowMs - 15 * 60_000, parseISODate(selected).getTime());
          return when.getTime() >= floor;
        })
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
        .slice(0, 3)
    : [];

  if (!settled) {
    const frame = "mx-auto min-h-dvh w-full max-w-xl px-5 pt-[max(2.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]";
    return (
      <>
        <Wash color={color} />
        <main className={frame}>
          {waiting ? (
            <p className="font-serif text-2xl leading-tight">{t("loading")}</p>
          ) : soon.length === 0 ? (
            <WeekAsk
              profile={profile}
              today={today}
              logs={journal.logs}
              intent={intent}
              busy={placing}
              failed={failed}
              onIntent={setIntent}
              onCommit={(proposal) => void commitNamed(proposal)}
            />
          ) : lead ? (
            <ConsequenceLead
              profile={profile}
              note={lead}
              event={leadEvent}
              logs={journal.logs}
              busy={placing}
              failed={failed}
              onMove={(date) => void shiftEvent(lead.eventId, date)}
              onLeave={() => {
                setSkipped((current) => [...current, lead.eventId]);
                setSettled(true);
                if (leadEvent) placed(leadEvent.date);
              }}
            />
          ) : (
            <FineWeek
              profile={profile}
              today={today}
              logs={journal.logs}
              events={soon}
              checkin={t("checkin")}
              settings={t("settings")}
              onCalendar={() => {
                setSettled(true);
                placed(todayIso);
              }}
              onCheckin={() => {
                setSettled(true);
                setSelected(todayIso);
                setSheet(true);
              }}
              onOpen={(date) => {
                setSettled(true);
                placed(date);
              }}
            />
          )}
        </main>
      </>
    );
  }

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
          <div className="flex items-center justify-between gap-4">
            <p className="font-serif text-3xl leading-none min-[900px]:text-4xl">Fravia</p>
            <button
              type="button"
              aria-label="Eintragen"
              className="hidden h-12 w-12 place-items-center rounded-full bg-ink font-sans text-2xl leading-none text-paper transition-opacity duration-150 min-[900px]:grid"
              onClick={() => openQuick(selected)}
            >
              +
            </button>
          </div>
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
          <button type="button" className="min-h-11 text-sm" onClick={() => setSheet(true)}>{t("checkin")}</button>
          <button type="button" className="hidden min-h-11 text-sm min-[900px]:inline" onClick={() => setTalk(true)}>Dialog</button>
          <button type="button" className="min-h-11 text-sm" onClick={() => journal.setRevising(true)}>{t("revise")}</button>
          <Link href="/settings" className="inline-flex min-h-11 items-center text-sm">{t("settings")}</Link>
          {journal.guestMode ? null : (
            <button type="button" className="min-h-11 text-sm" onClick={() => signOut({ redirectUrl: "/" })}>{t("signOut")}</button>
          )}
        </div>
        {journal.guestMode ? <p className="mt-2 text-sm">{t("guestNote")}</p> : null}
        <div className={`mt-6 ${talk && wide ? "min-[900px]:grid min-[900px]:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-x-8" : ""}`}>
          {talk && wide ? (
            <aside>
              <button type="button" className="min-h-11 text-sm" onClick={() => setTalk(false)}>Schließen</button>
              <Workbook journal={journal} today={today} onPlaced={placed} />
            </aside>
          ) : null}
          <div ref={stageRef} className="min-[900px]:flex min-[900px]:h-[calc(100dvh-7.5rem)] min-[900px]:min-h-0 min-[900px]:flex-col min-[900px]:overflow-hidden min-[900px]:bg-paper">
            {googleNote ? <p className="mb-3 text-sm">{googleNote}</p> : null}
            {waiting ? <p className="font-serif text-2xl leading-tight">{t("loading")}</p> : null}
            {failed ? <p className="mb-3 text-sm">Das hat nicht geklappt.</p> : null}
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
            {waiting ? null : <>
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
                  days={emptyRange ? [anchor] : gridDays}
                  events={shown}
                  todos={journal.todos}
                  profile={profile}
                  logs={journal.logs}
                  today={todayIso}
                  showHours={timedHere}
                  onSlot={(date, slot) => openQuick(date, slot)}
                  onOpen={(event) => { setQuick(null); setEditor({ event, date: event.date }); }}
                  onMove={(event, date, slot) => {
                    if (!event.time) return;
                    if (event.id.startsWith("gcal:")) {
                      void moveGoogle({ id: event.id, date }).then((result) => {
                        if (!result.ok) return;
                        setGoogleTick((current) => current + 1);
                        setSelected(date);
                      });
                      return;
                    }
                    const duration = minutesOf(endOf(event.time, event.end)) - minutesOf(event.time);
                    void journal.moveEvent(event.id, date, { time: slot, end: clockOf(minutesOf(slot) + duration) });
                    setSelected(date);
                  }}
                  onToggleTodo={(id) => void journal.toggleTodo(id)}
                />
                {emptyRange || upcoming.length > 0 ? (
                  <div className="mt-6">
                    {emptyRange ? <p className="font-serif text-2xl leading-tight">{t("emptyDay")}</p> : null}
                    {upcoming.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="mt-3 block min-h-11 text-left"
                        onClick={() => selectDay(event.date)}
                      >
                        <span className="font-serif text-2xl">{formatWeekday(parseISODate(event.date), lang)} {parseISODate(event.date).getDate()}.</span>
                        <span className="mt-1 block text-base">{event.time ? `${event.time} ` : ""}{event.title}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
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
            </>}
          </div>
        </div>
      </div>
      {quick ? (
        <form
          className="fixed inset-x-0 bottom-[4.75rem] z-30 border-t border-ink/15 bg-paper px-4 py-3 min-[900px]:bottom-0"
          onSubmit={(event) => void commitQuick(event)}
        >
          <label className="sr-only" htmlFor="quick-title">{t("title")}</label>
          <p className="text-sm text-ink/50">{quick.time}</p>
          <input
            id="quick-title"
            value={quickTitle}
            autoFocus
            onChange={(event) => setQuickTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuick(null);
            }}
            placeholder={t("title")}
            className="min-h-11 w-full bg-transparent font-serif text-3xl outline-none"
          />
        </form>
      ) : null}
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
          onClick={() => openQuick(selected)}
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
        <div className="fixed inset-0 z-30 overflow-y-auto bg-paper px-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
