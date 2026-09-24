"use client";

import { useState } from "react";
import type { Persona, Profile } from "@/lib/types";
import { iso } from "@/lib/dates";
import { PERSONAS } from "@/lib/voice";

type Draft = {
  persona: Persona | null;
  lastPeriodStart: string;
  cycleLength: string;
  periodLength: string;
  lutealLength: string;
  packLength: string;
};

const QUESTIONS: Record<Persona, string> = {
  rhythm: "Wann hat deine letzte Blutung angefangen?",
  pill: "Wann hat die Blutung angefangen, die du wirklich hast?",
  pain: "Wann hat die letzte Blutung angefangen?",
  menopause: "Wann war die letzte Blutung, wenn du sie noch weißt?",
};

export function Onboarding({
  initial,
  allowCancel,
  busy,
  error,
  onCancel,
  onSave,
}: {
  initial?: Profile | null;
  allowCancel: boolean;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (profile: Profile) => void;
}) {
  const [step, setStep] = useState<"persona" | "questions">(
    initial ? "persona" : "persona",
  );
  const [draft, setDraft] = useState<Draft>({
    persona: initial?.persona ?? null,
    lastPeriodStart: initial?.lastPeriodStart ?? "",
    cycleLength: String(initial?.cycleLength ?? 28),
    periodLength: String(initial?.periodLength ?? 5),
    lutealLength: String(initial?.lutealLength ?? 14),
    packLength: String(initial?.packLength ?? 28),
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const today = iso(new Date());

  function choose(persona: Persona) {
    setDraft((current) => ({ ...current, persona }));
    setLocalError(null);
    setStep("questions");
  }

  function save(skipDate = false) {
    if (!draft.persona) return;
    const persona = draft.persona;
    const date = skipDate ? "" : draft.lastPeriodStart;
    if (persona !== "menopause" && !date) {
      setLocalError("Das Datum fehlt noch.");
      return;
    }
    if (date && date > today) {
      setLocalError("Das Datum liegt noch vor dir.");
      return;
    }
    const period = Number(draft.periodLength);
    const cycle = Number(draft.cycleLength);
    const luteal = Number(draft.lutealLength);
    const pack = Number(draft.packLength);

    if (persona === "rhythm") {
      if (cycle < 21 || cycle > 45 || period < 2 || period > 10 || luteal < 8 || luteal > 20 || period >= cycle) {
        setLocalError("Diese Längen passen nicht in einen Zyklus.");
        return;
      }
      onSave({
        persona,
        lastPeriodStart: date,
        cycleLength: cycle,
        periodLength: period,
        lutealLength: luteal,
      });
      return;
    }
    if (persona === "pill") {
      if (pack < 21 || pack > 35 || period < 1 || period > 10 || period >= pack) {
        setLocalError("Blutung und Packlänge passen so nicht zusammen.");
        return;
      }
      onSave({
        persona,
        lastPeriodStart: date,
        periodLength: period,
        packLength: pack,
      });
      return;
    }
    if (persona === "pain") {
      if (cycle < 21 || cycle > 45 || period < 2 || period > 10 || period >= cycle) {
        setLocalError("Ungefähr reicht. So ungefähr ist es nicht.");
        return;
      }
      onSave({
        persona,
        lastPeriodStart: date,
        cycleLength: cycle,
        periodLength: period,
      });
      return;
    }
    onSave({
      persona,
      ...(date ? { lastPeriodStart: date } : {}),
    });
  }

  const message = localError ?? error;

  if (step === "persona" || !draft.persona) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] min-[900px]:grid min-[900px]:grid-cols-[0.85fr_1.15fr] min-[900px]:items-center min-[900px]:gap-16 min-[900px]:px-12">
        <div>
          {allowCancel ? (
            <button type="button" className="min-h-12 text-sm" onClick={onCancel}>
              Zurück zum Kalender
            </button>
          ) : (
            <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
          )}
          <h1 className="mt-8 font-serif text-4xl leading-[1.05] min-[900px]:text-6xl">
            Wofür soll dieser Kalender da sein?
          </h1>
        </div>
        <div className="mt-8 grid gap-3 min-[900px]:mt-0 min-[900px]:grid-cols-2">
          {PERSONAS.map((persona) => {
            const selected = draft.persona === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => choose(persona.id)}
                className={`min-h-28 px-4 py-4 text-left min-[900px]:min-h-40 ${selected ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}
              >
                <span className="block font-serif text-2xl min-[900px]:text-3xl">
                  {persona.title}
                </span>
                <span className="mt-2 block text-sm leading-snug min-[900px]:text-base">
                  {persona.line}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  const persona = draft.persona;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:items-center min-[900px]:gap-16 min-[900px]:px-12 min-[900px]:py-16">
      <div>
        <button
          type="button"
          className="min-h-12 text-sm"
          onClick={() => setStep("persona")}
        >
          Andere Ausrichtung
        </button>
        <p className="mt-6 text-xs uppercase tracking-[0.16em]">
          {PERSONAS.find((item) => item.id === persona)?.title}
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-[1.05] min-[900px]:text-6xl">
          {QUESTIONS[persona]}
        </h1>
        {persona === "pain" ? (
          <p className="mt-6 max-w-md text-base leading-snug">
            Nur als Rahmen. Der Tag richtet sich nach dem Schmerz.
          </p>
        ) : null}
        {persona === "menopause" ? (
          <p className="mt-6 max-w-md text-base leading-snug">
            Daraus rechnen wir keinen Zyklus.
          </p>
        ) : null}
      </div>
      <form
        className="mt-8 flex flex-1 flex-col min-[900px]:mt-0"
        onSubmit={(event) => {
          event.preventDefault();
          save(false);
        }}
      >
        <label className="block">
          <span className="sr-only">{QUESTIONS[persona]}</span>
          <input
            type="date"
            max={today}
            value={draft.lastPeriodStart}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lastPeriodStart: event.target.value,
              }))
            }
            className="w-full border-b border-ink/30 bg-transparent py-3 font-serif text-3xl"
          />
        </label>
        {persona === "rhythm" || persona === "pain" ? (
          <NumberField
            label={persona === "pain" ? "Zykluslänge, ungefähr" : "Zykluslänge"}
            suffix="Tage"
            value={draft.cycleLength}
            onChange={(cycleLength) =>
              setDraft((current) => ({ ...current, cycleLength }))
            }
          />
        ) : null}
        {persona !== "menopause" ? (
          <NumberField
            label={
              persona === "pain"
                ? "Wie viele Tage blutet es meistens?"
                : "Wie viele Tage blutet es?"
            }
            suffix="Tage"
            value={draft.periodLength}
            onChange={(periodLength) =>
              setDraft((current) => ({ ...current, periodLength }))
            }
          />
        ) : null}
        {persona === "rhythm" ? (
          <NumberField
            label="Lutealphase"
            hint="Tage vom Eisprung bis zur nächsten Blutung."
            suffix="Tage"
            value={draft.lutealLength}
            onChange={(lutealLength) =>
              setDraft((current) => ({ ...current, lutealLength }))
            }
          />
        ) : null}
        {persona === "pill" ? (
          <NumberField
            label="Wie lang ist ein Pack, Pause inklusive?"
            suffix="Tage"
            value={draft.packLength}
            onChange={(packLength) =>
              setDraft((current) => ({ ...current, packLength }))
            }
          />
        ) : null}
        {message ? <p className="mt-6 text-sm">{message}</p> : null}
        <div className="mt-auto grid gap-3 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] min-[900px]:mt-10">
          <button
            type="submit"
            disabled={busy}
            className="min-h-14 bg-ink text-paper disabled:opacity-50"
          >
            Stimmt so
          </button>
          {persona === "menopause" ? (
            <button
              type="button"
              disabled={busy}
              className="min-h-12 text-sm"
              onClick={() => save(true)}
            >
              Weiß ich nicht
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}

function NumberField({
  label,
  hint,
  suffix,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-8 block">
      <span className="text-sm">{label}</span>
      {hint ? <span className="mt-1 block text-sm text-ink/70">{hint}</span> : null}
      <span className="mt-2 flex items-baseline gap-3 border-b border-ink/30">
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))}
          className="w-full bg-transparent py-2 font-serif text-4xl outline-none"
        />
        <span className="text-sm">{suffix}</span>
      </span>
    </label>
  );
}
