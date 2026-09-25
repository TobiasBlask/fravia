"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/lang";
import type { CopyKey } from "@/lib/copy";
import { formatLong, parseISODate } from "@/lib/dates";
import type { Bleeding, DayLog, Heat, Mood, Pain, Sleep } from "@/lib/types";
import { dayMark } from "@/lib/voice";
import type { Profile } from "@/lib/types";

const BLEEDING: Bleeding[] = ["none", "light", "medium", "heavy"];
const SYMPTOMS = ["cramp", "head", "breast", "skin", "tired", "appetite"] as const;

const PAIN: Array<{ id: Pain; label: CopyKey }> = [
  { id: "none", label: "painNone" },
  { id: "light", label: "painLight" },
  { id: "strong", label: "painStrong" },
  { id: "out", label: "painOut" },
];

const MOOD: Array<{ id: Mood; label: CopyKey }> = [
  { id: "even", label: "moodEven" },
  { id: "thin", label: "moodThin" },
  { id: "raw", label: "moodRaw" },
];

const HEAT: Array<{ id: Heat; label: CopyKey }> = [
  { id: "none", label: "heatNone" },
  { id: "warm", label: "heatWarm" },
  { id: "hot", label: "heatHot" },
];

const SLEEP: Array<{ id: Sleep; label: CopyKey }> = [
  { id: "steady", label: "sleepSteady" },
  { id: "broken", label: "sleepBroken" },
  { id: "short", label: "sleepShort" },
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
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [ovulation, setOvulation] = useState(Boolean(existing?.ovulation));
  const [hint, setHint] = useState<string | null>(null);
  const { lang, t } = useLang();

  useEffect(() => {
    setBleeding(existing?.bleeding);
    setEnergy(existing?.energy);
    setNote(existing?.note ?? "");
    setPain(existing?.pain);
    setMood(existing?.mood);
    setHeat(existing?.heat);
    setSleep(existing?.sleep);
    setSymptoms(existing?.symptoms ?? []);
    setOvulation(Boolean(existing?.ovulation));
    setHint(null);
  }, [date, existing]);

  const persona = profile.persona;
  const mark = dayMark(profile, parseISODate(date), existing);
  function save() {
    if ((persona === "rhythm" || persona === "pill" || persona === "pain") && !energy) {
      setHint(t("needEnergy"));
      return;
    }
    if (persona === "pain" && !pain) {
      setHint(t("needPain"));
      return;
    }
    if (persona === "menopause" && !sleep && !heat && !mood) {
      setHint(t("needFeel"));
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
      ...(symptoms.length ? { symptoms } : {}),
      ...(persona === "rhythm" ? { ovulation } : {}),
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
            {formatLong(parseISODate(date), lang)}
          </h2>
        </div>
        {fullscreen ? (
          <button type="button" className="min-h-12 shrink-0 text-sm" onClick={onClose}>
            {t("back")}
          </button>
        ) : null}
      </div>
      <div className="mt-8 grid gap-6">
        {persona === "pain" ? (
          <Choices label={t("pain")} value={pain} options={PAIN.map((item) => ({ id: item.id, label: t(item.label) }))} onChange={setPain} />
        ) : null}
        {persona === "menopause" ? (
          <>
            <Choices label={t("sleep")} value={sleep} options={SLEEP.map((item) => ({ id: item.id, label: t(item.label) }))} onChange={setSleep} />
            <Choices label={t("heat")} value={heat} options={HEAT.map((item) => ({ id: item.id, label: t(item.label) }))} onChange={setHeat} />
            <Choices label={t("mood")} value={mood} options={MOOD.map((item) => ({ id: item.id, label: t(item.label) }))} onChange={setMood} />
          </>
        ) : null}
        {persona !== "menopause" ? (
          <Choices
            label={t("bleed")}
            value={bleeding}
            options={BLEEDING.map((id) => ({ id, label: t(id === "none" ? "none" : id === "light" ? "light" : id === "medium" ? "medium" : "heavy") }))}
            onChange={setBleeding}
          />
        ) : (
          <Choices
            label={t("bleedMaybe")}
            value={bleeding}
            options={BLEEDING.map((id) => ({ id, label: t(id === "none" ? "none" : id === "light" ? "light" : id === "medium" ? "medium" : "heavy") }))}
            onChange={setBleeding}
          />
        )}
        {persona === "pill" ? (
          <Choices label={t("mood")} value={mood} options={MOOD.map((item) => ({ id: item.id, label: t(item.label) }))} onChange={setMood} />
        ) : null}
        {persona === "rhythm" ? (
          <button type="button" aria-pressed={ovulation} onClick={() => setOvulation((value) => !value)} className={`min-h-12 ${ovulation ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}>
            {t("ovulation")}
          </button>
        ) : null}
        <fieldset>
          <legend className="mb-2 text-[11px] uppercase tracking-[0.16em]">{t("symptoms")}</legend>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((id) => {
              const on = symptoms.includes(id);
              const label = id === "cramp" ? t("symCramp") : id === "head" ? t("symHead") : id === "breast" ? t("symBreast") : id === "skin" ? t("symSkin") : id === "tired" ? t("symTired") : t("symAppetite");
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSymptoms((current) => on ? current.filter((item) => item !== id) : [...current, id])}
                  className={`min-h-10 px-3 text-sm ${on ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
        {persona !== "menopause" ? (
          <fieldset>
            <legend className="mb-2 text-[11px] uppercase tracking-[0.16em]">
              {t("energy")}
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
              <span>{t("low")}</span>
              <span>{t("high")}</span>
            </div>
          </fieldset>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.16em]">
            {t("note")}
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
          {busy ? t("saving") : t("save")}
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
