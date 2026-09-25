"use client";

import { useState } from "react";
import { useLang } from "@/components/lang";
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

const QUESTION_KEY = {
  rhythm: "questionRhythm",
  pill: "questionPill",
  pain: "questionPain",
  menopause: "questionMeno",
} as const;

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
  const [step, setStep] = useState<"persona" | "questions">("persona");
  const [draft, setDraft] = useState<Draft>({
    persona: initial?.persona ?? null,
    lastPeriodStart: initial?.lastPeriodStart ?? "",
    cycleLength: String(initial?.cycleLength ?? 28),
    periodLength: String(initial?.periodLength ?? 5),
    lutealLength: String(initial?.lutealLength ?? 14),
    packLength: String(initial?.packLength ?? 28),
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const { t } = useLang();
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
      setLocalError(t("dateMissing"));
      return;
    }
    if (date && date > today) {
      setLocalError(t("dateFuture"));
      return;
    }
    const period = Number(draft.periodLength);
    const cycle = Number(draft.cycleLength);
    const luteal = Number(draft.lutealLength);
    const pack = Number(draft.packLength);

    if (persona === "rhythm") {
      if (cycle < 21 || cycle > 45 || period < 2 || period > 10 || luteal < 8 || luteal > 20 || period >= cycle) {
        setLocalError(t("lengths"));
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
        setLocalError(t("lengths"));
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
        setLocalError(t("lengths"));
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
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {allowCancel ? (
          <button type="button" className="min-h-11 self-start text-sm" onClick={onCancel}>
            {t("backCal")}
          </button>
        ) : (
          <p className="font-serif text-3xl leading-none">Fravia</p>
        )}
        <h1 className="mt-10 font-serif text-4xl leading-[1.05] min-[900px]:text-6xl">{t("meet")}</h1>
        <div className="mt-8 flex flex-col">
          {PERSONAS.map((persona) => {
            const selected = draft.persona === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => choose(persona.id)}
                className={`min-h-16 py-4 text-left transition-colors duration-150 ${selected ? "bg-ink px-4 text-paper" : ""}`}
              >
                <span className="block font-serif text-3xl leading-tight min-[900px]:text-5xl">{persona.title}</span>
                <span className={`mt-1 block text-base leading-snug ${selected ? "text-paper/80" : "text-ink/75"}`}>
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
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <button type="button" className="min-h-11 self-start text-sm" onClick={() => setStep("persona")}>
        {t("other")}
      </button>
      <h1 className="mt-8 font-serif text-4xl leading-[1.05] min-[900px]:text-6xl">{t(QUESTION_KEY[persona])}</h1>
      <form
        className="mt-10 flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          save(persona === "menopause" && !draft.lastPeriodStart);
        }}
      >
        <label className="block">
          <span className="sr-only">{t(QUESTION_KEY[persona])}</span>
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
            className="min-h-14 w-full border-b border-ink/30 bg-transparent font-serif text-3xl"
          />
        </label>
        {message ? <p className="mt-6 text-base">{message}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-10 min-h-14 bg-ink text-paper transition-opacity duration-150 disabled:opacity-50"
        >
          {t("know")}
        </button>
      </form>
    </main>
  );
}
