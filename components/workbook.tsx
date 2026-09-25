"use client";

import { useMemo, useState } from "react";
import type { useJournal } from "@/components/use-journal";
import { parseISODate } from "@/lib/dates";
import { openingLine, planSentence, type Proposal } from "@/lib/plan";

type Turn = { who: "fravia" | "du"; text: string };

export function Workbook({
  journal,
  today,
  onPlaced,
  onClose,
}: {
  journal: ReturnType<typeof useJournal>;
  today: Date;
  onPlaced: (date: string) => void;
  onClose?: () => void;
}) {
  const profile = journal.profile;
  const live = useMemo(
    () => (profile ? openingLine(profile, today, journal.logs) : ""),
    [profile, today, journal.logs],
  );
  const [frozen, setFrozen] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [carry, setCarry] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [placing, setPlacing] = useState<string | null>(null);
  const opening = frozen ?? live;
  const fieldId = onClose ? "plan-line-screen" : "plan-line";
  const fravia = [...turns].reverse().find((turn) => turn.who === "fravia")?.text ?? opening;
  const mine = [...turns].reverse().find((turn) => turn.who === "du")?.text;

  if (!profile || !opening) return null;

  function speak(sentence: string, fresh = false) {
    const text = sentence.trim();
    if (!text || !profile) return;
    setFrozen((current) => current ?? opening);
    const combined = !fresh && carry ? `${carry} ${text}` : text;
    const reply = planSentence(combined, profile, today, journal.logs);
    setCarry(reply.ask ? combined : "");
    setProposals(reply.proposals);
    setTurns((current) => [...current, { who: "du", text }, { who: "fravia", text: reply.text }]);
    setDraft("");
  }

  async function place(proposal: Proposal) {
    const key = `${proposal.date}-${proposal.title}`;
    setPlacing(key);
    try {
      if (proposal.kind === "todo") {
        await journal.addTodo({ title: proposal.title, date: proposal.date, freq: "none" });
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
      const name = dayName(proposal.date);
      setTurns((current) => [...current, { who: "fravia", text: `${proposal.title} liegt auf ${name}.` }]);
      setProposals([]);
      setCarry("");
      onPlaced(proposal.date);
      onClose?.();
    } catch {
      setTurns((current) => [...current, { who: "fravia", text: "Das hat nicht geklappt. Sag es noch einmal." }]);
    } finally {
      setPlacing(null);
    }
  }

  function decline() {
    setProposals([]);
    setTurns((current) => [...current, { who: "fravia", text: "Gut. Es bleibt offen." }]);
  }

  return (
    <section className={onClose ? "flex h-dvh min-h-0 flex-col bg-paper" : "flex flex-col"}>
      {onClose ? (
        <div className="flex items-center justify-between gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="font-serif text-3xl leading-none">Fravia</p>
          <button type="button" className="min-h-11 px-2" onClick={onClose}>
            Schließen
          </button>
        </div>
      ) : null}
      <div className={onClose ? "flex min-h-0 flex-1 flex-col px-4 py-8" : "flex flex-col"}>
        <p className="font-serif text-[1.75rem] leading-tight min-[900px]:text-4xl">{fravia}</p>
        {mine ? <p className="mt-4 text-base leading-snug text-ink/75">{mine}</p> : null}
        {proposals.length > 0 ? (
          <div className="mt-8 grid gap-3">
            {proposals.slice(0, 1).map((proposal) => {
              const when = proposalWhen(proposal.date);
              return (
                <div key={`${proposal.date}-${proposal.title}`} className="rounded-[12px] border border-ink/15 bg-paper px-4 py-4">
                  <p className="font-serif text-3xl leading-none min-[900px]:text-4xl">{when.weekday}</p>
                  <p className="mt-2 font-serif text-5xl leading-none">{when.day}.</p>
                  <p className="mt-3 text-base leading-snug">{reasonLine(fravia)}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      className="min-h-11 bg-ink px-4 text-paper transition-opacity duration-150 disabled:opacity-50"
                      disabled={placing !== null}
                      onClick={() => void place(proposal)}
                    >
                      Eintragen
                    </button>
                    <button type="button" className="min-h-11 px-3" disabled={placing !== null} onClick={decline}>
                      Nicht jetzt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <form
        className={onClose ? "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "mt-8"}
        onSubmit={(event) => {
          event.preventDefault();
          speak(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor={fieldId}>
            Was du vorhast
          </label>
          <input
            id={fieldId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ein Satz reicht."
            autoComplete="off"
            className="min-h-11 w-full border-b border-ink/30 bg-transparent"
          />
          <button type="submit" className="min-h-11 shrink-0 px-3">
            Senden
          </button>
        </div>
      </form>
    </section>
  );
}

function dayName(date: string) {
  const name = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(parseISODate(date));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function proposalWhen(date: string) {
  const value = parseISODate(date);
  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(value);
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), day: value.getDate() };
}

function reasonLine(text: string) {
  const parts = text
    .split(/(?<=[.!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !/^soll ich\b/i.test(part) && !/^welchen tag\b/i.test(part));
  const named = parts.find((part) => /phase|ovulation|menstruation|schmerz|schätzung|energie|pause/i.test(part));
  return named ?? parts[0] ?? text;
}
