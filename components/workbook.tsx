"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { useJournal } from "@/components/use-journal";
import { parseISODate } from "@/lib/dates";
import { CHIPS, openingLine, planSentence, type Proposal } from "@/lib/plan";

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
  const scroller = useRef<HTMLDivElement>(null);
  const opening = frozen ?? live;
  const fieldId = onClose ? "plan-line-screen" : "plan-line";

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight });
  }, [turns, proposals, opening]);

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
    } catch {
      setTurns((current) => [...current, { who: "fravia", text: "Das hat nicht gehalten. Sag es noch einmal." }]);
    } finally {
      setPlacing(null);
    }
  }

  function decline() {
    setProposals([]);
    setTurns((current) => [...current, { who: "fravia", text: "Gut. Es bleibt offen." }]);
  }

  return (
    <section className={onClose ? "flex h-dvh min-h-0 flex-col" : "flex max-h-[calc(100dvh-8rem)] min-h-[24rem] flex-col"}>
      {onClose ? (
        <div className="flex items-center justify-between gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
          <button type="button" className="min-h-12" onClick={onClose}>
            Schließen
          </button>
        </div>
      ) : null}
      <div ref={scroller} className={`min-h-0 flex-1 space-y-5 overflow-y-auto ${onClose ? "px-4 py-6" : "py-1 pr-1"}`}>
        <p className="font-serif text-[1.65rem] leading-tight">{opening}</p>
        {turns.map((turn, index) =>
          turn.who === "du" ? (
            <p key={`${turn.who}-${index}`} className="text-base leading-snug text-ink/70">
              {turn.text}
            </p>
          ) : (
            <p key={`${turn.who}-${index}`} className="font-serif text-2xl leading-tight">
              {turn.text}
            </p>
          ),
        )}
        {proposals.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {proposals.map((proposal) => (
              <button
                key={`${proposal.date}-${proposal.title}`}
                type="button"
                className="min-h-12 bg-ink px-4 text-paper disabled:opacity-50"
                disabled={placing !== null}
                onClick={() => void place(proposal)}
              >
                Ja, {dayName(proposal.date)}
              </button>
            ))}
            <button type="button" className="min-h-12 px-3" disabled={placing !== null} onClick={decline}>
              Noch nicht
            </button>
          </div>
        ) : null}
      </div>
      <form
        className={onClose ? "border-t border-ink/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "border-t border-ink/10 pt-3"}
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
            className="min-h-12 w-full border-b border-ink/30 bg-transparent"
          />
          <button type="submit" className="min-h-12 shrink-0 px-3">
            Senden
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 pb-1">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="min-h-10 border border-ink/20 px-3 text-left text-sm"
              onClick={() => speak(chip, true)}
            >
              {chip}
            </button>
          ))}
        </div>
      </form>
    </section>
  );
}

function dayName(date: string) {
  const name = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(parseISODate(date));
  return name.charAt(0).toUpperCase() + name.slice(1);
}
