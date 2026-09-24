"use client";

import { useEffect, useState } from "react";
import { formatLong, parseISODate } from "@/lib/dates";
import type { Bleeding, DayLog, Heat, Mood, Pain, Persona, Sleep } from "@/lib/types";
import { dayMark } from "@/lib/voice";
import type { Profile } from "@/lib/types";

const BLEEDING: Array<{ id: Bleeding; label: string }> = [
  { id: "none", label: "keine" },
  { id: "light", label: "leicht" },
  { id: "medium", label: "mittel" },
  { id: "heavy", label: "stark" },
];

const PAIN: Array<{ id: Pain; label: string }> = [
  { id: "none", label: "keiner" },
  { id: "light", label: "spürbar" },
  { id: "strong", label: "stark" },
  { id: "out", label: "geht nicht" },
];

const MOOD: Array<{ id: Mood; label: string }> = [
  { id: "even", label: "tragbar" },
  { id: "thin", label: "dünn" },
  { id: "raw", label: "roh" },
];

const HEAT: Array<{ id: Heat; label: string }> = [
  { id: "none", label: "keine" },
  { id: "warm", label: "warm" },
  { id: "hot", label: "heiß" },
];

const SLEEP: Array<{ id: Sleep; label: string }> = [
  { id: "steady", label: "ruhig" },
  { id: "broken", label: "gebrochen" },
  { id: "short", label: "kurz" },
];

export function DayCheckin({
  profile,
  date,
  existing,
  busy,
  fullscreen,
  onClose,
  onSave,
}: {
  profile: Profile;
  date: string;
  existing?: DayLog;
  busy: boolean;
  fullscreen: boolean;
  onClose: () => void;
  onSave: (log: DayLog) => void;
}) {
  const [bleeding, setBleeding] = useState<Bleeding | undefined>(existing?.bleeding);
  const [energy, setEnergy] = useState<number | undefined>(existing?.energy);
  const [note, setNote] = useState(existing?.note ?? "");
  const [pain, setPain] = useState<Pain | undefined>(existing?.pain);
  const [mood, setMood] = useState<Mood | undefined>(existing?.mood);
  const [heat, setHeat] = useState<Heat | undefined>(existing?.heat);
  const [sleep, setSleep] = useState<Sleep | undefined>(existing?.sleep);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setBleeding(existing?.bleeding);
    setEnergy(existing?.energy);
    setNote(existing?.note ?? "");
    setPain(existing?.pain);
    setMood(existing?.mood);
    setHeat(existing?.heat);
    setSleep(existing?.sleep);
    setHint(null);
  }, [date, existing]);

  const persona = profile.persona;
  const mark = dayMark(profile, parseISODate(date), existing);
  const notePrompt =
    persona === "pain"
      ? "Was heute ging. Oder nicht."
      : persona === "menopause"
        ? "Ein Satz zum Tag, wenn einer bleibt."
        : persona === "pill"
          ? "Stimmung in einem Satz, wenn du willst."
          : "Ein Satz, wenn einer bleibt.";

  function save() {
    if ((persona === "rhythm" || persona === "pill" || persona === "pain") && !energy) {
      setHint("Noch die Energie.");
      return;
    }
    if (persona === "pain" && !pain) {
      setHint("Tippe den Schmerz, auch wenn keiner da ist.");
      return;
    }
    if (persona === "menopause" && !sleep && !heat && !mood) {
      setHint("Tippe, wie der Tag sich anfühlt.");
      return;
    }
    onSave({
      date,
      bleeding: bleeding ?? "none",
      note: note.trim(),
      ...(energy ? { energy } : {}),
      ...(pain ? { pain } : {}),
      ...(mood ? { mood } : {}),
      ...(heat ? { heat } : {}),
      ...(sleep ? { sleep } : {}),
    });
  }

  return (
    <section className={fullscreen ? "flex min-h-dvh flex-col" : ""}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em]">
            {mark.band || "Dieser Tag"}
          </p>
          <h2 className="mt-2 font-serif text-3xl leading-none min-[900px]:text-4xl">
            {formatLong(parseISODate(date))}
          </h2>
        </div>
        {fullscreen ? (
          <button type="button" className="min-h-12 shrink-0 text-sm" onClick={onClose}>
            Zurück
          </button>
        ) : null}
      </div>
      <div className="mt-8 grid gap-6">
        {persona === "pain" ? (
          <Choices label="Schmerz" value={pain} options={PAIN} onChange={setPain} />
        ) : null}
        {persona === "menopause" ? (
          <>
            <Choices label="Schlaf" value={sleep} options={SLEEP} onChange={setSleep} />
            <Choices label="Hitze" value={heat} options={HEAT} onChange={setHeat} />
            <Choices label="Stimmung" value={mood} options={MOOD} onChange={setMood} />
          </>
        ) : null}
        {persona !== "menopause" ? (
          <Choices
            label="Blutung"
            value={bleeding}
            options={BLEEDING}
            onChange={setBleeding}
          />
        ) : (
          <Choices
            label="Blutung, falls sie da ist"
            value={bleeding}
            options={BLEEDING}
            onChange={setBleeding}
          />
        )}
        {persona === "pill" ? (
          <Choices label="Stimmung" value={mood} options={MOOD} onChange={setMood} />
        ) : null}
        {persona !== "menopause" ? (
          <fieldset>
            <legend className="mb-2 text-[11px] uppercase tracking-[0.16em]">
              Energie
            </legend>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={energy === value}
                  onClick={() => setEnergy(value)}
                  className={`min-h-14 text-lg ${energy === value ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.14em] text-ink/60">
              <span>wenig</span>
              <span>viel</span>
            </div>
          </fieldset>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.16em]">
            {notePrompt}
          </span>
          <textarea
            value={note}
            maxLength={280}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            className="w-full resize-none border-b border-ink/30 bg-transparent py-2 text-base outline-none"
          />
        </label>
      </div>
      {hint ? <p className="mt-4 text-sm">{hint}</p> : null}
      <div className={fullscreen ? "mt-auto pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]" : "mt-6"}>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="min-h-14 w-full bg-ink text-paper disabled:opacity-50"
        >
          {busy ? "Wird abgelegt" : "Ablegen"}
        </button>
      </div>
    </section>
  );
}

function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] uppercase tracking-[0.16em]">{label}</legend>
      <div className={`grid gap-2 ${options.length > 3 ? "grid-cols-2" : "grid-cols-3"}`}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`min-h-12 px-2 text-sm ${value === option.id ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
