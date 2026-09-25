"use client";

import Link from "next/link";
import { useState } from "react";
import { iso, parseISODate } from "@/lib/dates";
import { FINE_WEEK, WEEK_CHIPS, WEEK_QUESTION, weekPlacement, type Consequence, type Proposal, type WeekPlan } from "@/lib/plan";
import type { DayEvent, DayLog, Profile } from "@/lib/types";
import { dayMark, solidHex } from "@/lib/voice";

export function WeekAsk({
  profile,
  today,
  logs,
  intent,
  busy,
  failed,
  onIntent,
  onTake,
  onOne,
}: {
  profile: Profile;
  today: Date;
  logs: Record<string, DayLog>;
  intent: string | null;
  busy: boolean;
  failed: boolean;
  onIntent: (text: string) => void;
  onTake: (proposals: Proposal[]) => void;
  onOne: (proposal: Proposal) => void;
}) {
  const [which, setWhich] = useState(0);
  const [seen, setSeen] = useState(intent);
  if (intent !== seen) {
    setSeen(intent);
    setWhich(0);
  }
  const answer = intent ? weekPlacement(intent, profile, today, logs) : null;
  const plan = answer && answer.plans.length > 0 ? answer.plans[Math.min(which, answer.plans.length - 1)] : null;
  const first = plan?.proposals[0];
  const other = answer && answer.plans.length > 1 ? answer.plans[which === 0 ? 1 : 0].proposals[0] : undefined;
  const color = first ? tone(profile, first.date, logs[first.date]) : "#1c1917";

  if (!answer) {
    return (
      <div data-decision="ask">
        <p className="font-serif text-[1.75rem] leading-tight min-[900px]:text-4xl">{WEEK_QUESTION}</p>
        <Chips onIntent={onIntent} />
      </div>
    );
  }

  return (
    <div data-decision={first ? "answer" : "unfit"}>
      <p className="font-serif text-[2rem] leading-tight min-[900px]:text-5xl">{answer.sentence}</p>
      {answer.phase ? (
        <p className="mt-2 text-sm" style={{ color }}>
          {answer.phase}
        </p>
      ) : null}
      {plan && first ? (
        <>
          <WeekStrip plan={plan} today={today} profile={profile} logs={logs} />
          <button
            type="button"
            className="mt-8 min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
            disabled={busy}
            onClick={() => onTake(plan.proposals)}
          >
            Woche übernehmen
          </button>
          {other ? (
            <button type="button" className="mt-2 block min-h-11 px-1 text-left" disabled={busy} onClick={() => setWhich(which === 0 ? 1 : 0)}>
              {whenLine(other.date, other.time)}
            </button>
          ) : null}
          <button type="button" className="mt-2 block min-h-11 px-1 text-left" disabled={busy} onClick={() => onOne(first)}>
            Nur den einen Termin
          </button>
        </>
      ) : (
        <Chips onIntent={onIntent} />
      )}
      {failed ? <p className="mt-2 text-sm">Das hat nicht geklappt.</p> : null}
    </div>
  );
}

export function ConsequenceLead({
  profile,
  note,
  event,
  logs,
  busy,
  failed,
  onMove,
  onLeave,
}: {
  profile: Profile;
  note: Consequence;
  event?: DayEvent;
  logs: Record<string, DayLog>;
  busy: boolean;
  failed: boolean;
  onMove: (date: string) => void;
  onLeave: () => void;
}) {
  const color = event ? tone(profile, event.date, logs[event.date]) : "#1c1917";
  const target = note.action === "move" ? note.targets[0] : undefined;
  const other = note.action === "move" ? note.targets[1] : undefined;

  return (
    <div data-decision="poor">
      <p className="font-serif text-[1.75rem] leading-tight min-[900px]:text-4xl">{note.sentence}</p>
      {note.phase ? (
        <p className="mt-2 text-sm" style={{ color }}>
          {note.phase}
        </p>
      ) : null}
      {target ? (
        <button
          type="button"
          className="mt-8 min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
          disabled={busy}
          onClick={() => onMove(target.date)}
        >
          Verschieben
        </button>
      ) : null}
      {other ? (
        <button
          type="button"
          className="mt-2 block min-h-11 px-1 text-left"
          disabled={busy}
          onClick={() => onMove(other.date)}
        >
          {whenLine(other.date)}
        </button>
      ) : null}
      <button type="button" className={`${target ? "mt-2" : "mt-8"} block min-h-11 px-1 text-left`} disabled={busy} onClick={onLeave}>
        So lassen
      </button>
      {failed ? <p className="mt-2 text-sm">Das hat nicht geklappt.</p> : null}
    </div>
  );
}

export function FineWeek({
  profile,
  today,
  logs,
  events,
  checkin,
  settings,
  onCalendar,
  onCheckin,
  onOpen,
}: {
  profile: Profile;
  today: Date;
  logs: Record<string, DayLog>;
  events: DayEvent[];
  checkin: string;
  settings: string;
  onCalendar: () => void;
  onCheckin: () => void;
  onOpen: (date: string) => void;
}) {
  const todayIso = iso(today);
  const mark = dayMark(profile, today, profile.persona === "pain" ? logs[todayIso] : undefined);
  const phase = profile.persona === "menopause" ? "Schätzung" : mark.band;
  const rows = [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title));

  return (
    <div data-decision="fine">
      <p className="font-serif text-[1.75rem] leading-tight min-[900px]:text-4xl">{FINE_WEEK}</p>
      {phase ? (
        <p className="mt-2 text-sm" style={{ color: solidHex(mark.tint) }}>
          {phase}
        </p>
      ) : null}
      <div className="mt-8 grid">
        {rows.map((event) => (
          <button key={event.id} type="button" className="block min-h-11 py-2 text-left" onClick={() => onOpen(event.date)}>
            <span className="block text-sm">{event.date === todayIso ? `Heute, ${parseISODate(event.date).getDate()}.` : whenLine(event.date)}</span>
            <span className="mt-1 block text-base">
              {event.time ? `${event.time} ` : ""}
              {event.title}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex flex-col">
        <button type="button" className="min-h-11 text-left" onClick={onCalendar}>
          Kalender
        </button>
        <button type="button" className="min-h-11 text-left" onClick={onCheckin}>
          {checkin}
        </button>
        <Link href="/settings" className="inline-flex min-h-11 items-center">
          {settings}
        </Link>
      </div>
    </div>
  );
}

function WeekStrip({
  plan,
  today,
  profile,
  logs,
}: {
  plan: WeekPlan;
  today: Date;
  profile: Profile;
  logs: Record<string, DayLog>;
}) {
  const todayIso = iso(today);
  const hasToday = plan.days.includes(todayIso);
  return (
    <div className="mt-8 grid grid-cols-7 gap-1" data-week>
      {plan.days.map((date) => {
        const blocks = plan.proposals.filter((item) => item.date === date);
        const mark = dayMark(profile, parseISODate(date), profile.persona === "pain" ? logs[date] : undefined);
        const color = solidHex(mark.tint);
        const isToday = date === todayIso;
        return (
          <div key={date} className="min-w-0" data-today={isToday ? "1" : undefined}>
            {hasToday ? <p className={`text-center text-[10px] leading-none ${isToday ? "" : "invisible"}`}>Heute</p> : null}
            <p className="mt-1 text-center text-[11px]">{shortDay(date)}</p>
            <p className={`text-center font-serif text-xl leading-none ${isToday ? "underline decoration-2 underline-offset-4" : ""}`}>
              {parseISODate(date).getDate()}
            </p>
            {blocks.map((block) => (
              <p
                key={`${block.date}-${block.title}`}
                className="mt-1 rounded-[12px] px-0.5 py-1.5 text-center text-[10px] leading-tight text-paper"
                style={{ backgroundColor: color }}
              >
                <span className="block">{block.title}</span>
                {block.time ? <span className="block">{block.time}</span> : null}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function shortDay(date: string) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(parseISODate(date)).replace(".", "");
}

function Chips({ onIntent }: { onIntent: (text: string) => void }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {WEEK_CHIPS.map((chip) => (
        <button key={chip} type="button" className="min-h-11 border border-ink/20 px-4 text-base" onClick={() => onIntent(chip)}>
          {chip}
        </button>
      ))}
    </div>
  );
}

function tone(profile: Profile, date: string, log?: DayLog) {
  return solidHex(dayMark(profile, parseISODate(date), profile.persona === "pain" ? log : undefined).tint);
}

function whenLine(date: string, time?: string) {
  const value = parseISODate(date);
  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(value);
  const name = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = `${name}, ${value.getDate()}.`;
  return time ? `${day} ${time}` : day;
}
