"use client";

import { useState, type FormEvent } from "react";
import { parseISODate } from "@/lib/dates";
import { WEEK_CHIPS, WEEK_QUESTION, weekPlacement, type Consequence, type Proposal } from "@/lib/plan";
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
  onClear,
  onCommit,
}: {
  profile: Profile;
  today: Date;
  logs: Record<string, DayLog>;
  intent: string | null;
  busy: boolean;
  failed: boolean;
  onIntent: (text: string) => void;
  onClear: () => void;
  onCommit: (proposal: Proposal) => void;
}) {
  const [draft, setDraft] = useState("");
  const answer = intent ? weekPlacement(intent, profile, today, logs) : null;

  function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onIntent(text);
    setDraft("");
  }

  if (!answer) {
    return (
      <div data-decision>
        <p className="font-serif text-[1.75rem] leading-tight min-[900px]:text-4xl">{WEEK_QUESTION}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {WEEK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="min-h-11 border border-ink/20 px-4 text-base"
              onClick={() => onIntent(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
        <form className="mt-6 flex items-end gap-2" onSubmit={send}>
          <label className="sr-only" htmlFor="week-title">
            Titel
          </label>
          <input
            id="week-title"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Titel"
            autoComplete="off"
            className="min-h-11 w-full border-b border-ink/30 bg-transparent"
          />
          <button type="submit" className="min-h-11 shrink-0 px-3">
            Senden
          </button>
        </form>
      </div>
    );
  }

  const first = answer.proposals[0];
  const color = first ? tone(profile, first.date, logs[first.date]) : "#1c1917";

  return (
    <div data-decision>
      <p className="font-serif text-[1.75rem] leading-tight min-[900px]:text-4xl">{answer.sentence}</p>
      {answer.phase ? (
        <p className="mt-2 text-sm" style={{ color }}>
          {answer.phase}
        </p>
      ) : null}
      {answer.proposals.length > 1 ? (
        <div className="mt-8 grid gap-3">
          {answer.proposals.map((proposal) => {
            const when = dayParts(proposal.date);
            return (
              <div key={proposal.date} className="rounded-[12px] border border-ink/15 bg-paper px-4 py-4">
                <p className="font-serif text-3xl leading-none">{when.weekday}</p>
                <p className="mt-2 font-serif text-5xl leading-none">{when.day}.</p>
                <button
                  type="button"
                  className="mt-4 min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => onCommit(proposal)}
                >
                  Eintragen
                </button>
              </div>
            );
          })}
        </div>
      ) : first ? (
        <button
          type="button"
          className="mt-8 min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
          disabled={busy}
          onClick={() => onCommit(first)}
        >
          Eintragen
        </button>
      ) : null}
      <button type="button" className="mt-2 min-h-11 px-1" onClick={onClear}>
        Anders
      </button>
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
  onMove,
  onLeave,
}: {
  profile: Profile;
  note: Consequence;
  event?: DayEvent;
  logs: Record<string, DayLog>;
  busy: boolean;
  onMove: (date: string) => void;
  onLeave: () => void;
}) {
  const color = event ? tone(profile, event.date, logs[event.date]) : "#1c1917";
  const many = note.action === "move" && note.targets.length > 1;

  return (
    <div data-decision className="mb-8">
      <p className="font-serif text-[1.75rem] leading-tight min-[900px]:text-4xl">{note.sentence}</p>
      {note.phase ? (
        <p className="mt-2 text-sm" style={{ color }}>
          {note.phase}
        </p>
      ) : null}
      {many ? (
        <div className="mt-8 grid gap-3">
          {note.targets.map((target) => {
            const when = dayParts(target.date);
            return (
              <div key={target.date} className="rounded-[12px] border border-ink/15 bg-paper px-4 py-4">
                <p className="font-serif text-3xl leading-none">{when.weekday}</p>
                <p className="mt-2 font-serif text-5xl leading-none">{when.day}.</p>
                <button
                  type="button"
                  className="mt-4 min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => onMove(target.date)}
                >
                  Verschieben
                </button>
              </div>
            );
          })}
          <button type="button" className="min-h-11 px-1 text-left" disabled={busy} onClick={onLeave}>
            So lassen
          </button>
        </div>
      ) : note.action === "move" && note.targets[0] ? (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
            disabled={busy}
            onClick={() => onMove(note.targets[0].date)}
          >
            Verschieben
          </button>
          <button type="button" className="min-h-11 px-3" disabled={busy} onClick={onLeave}>
            So lassen
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-8 min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
          disabled={busy}
          onClick={onLeave}
        >
          So lassen
        </button>
      )}
    </div>
  );
}

function tone(profile: Profile, date: string, log?: DayLog) {
  return solidHex(dayMark(profile, parseISODate(date), profile.persona === "pain" ? log : undefined).tint);
}

function dayParts(date: string) {
  const value = parseISODate(date);
  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(value);
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), day: value.getDate() };
}
