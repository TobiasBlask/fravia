"use client";

import { useState } from "react";
import { useLang } from "@/components/lang";
import type { useJournal } from "@/components/use-journal";
import { endOf } from "@/lib/clock";
import type { DayEvent, EventKind, SeriesFreq } from "@/lib/types";

const KINDS: EventKind[] = ["termin", "mahlzeit", "sport", "geburtstag"];
const FREQS: SeriesFreq[] = ["none", "daily", "weekdays", "weekdays-sat", "weekly", "monthly", "quarterly", "halfyearly", "yearly"];
const REMINDERS = [0, 10, 30, 60, 1440];

export function EventSheet({
  journal,
  date,
  event,
  time,
  onClose,
}: {
  journal: ReturnType<typeof useJournal>;
  date: string;
  event?: DayEvent;
  time?: string;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [title, setTitle] = useState(event?.title ?? "");
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "termin");
  const [when, setWhen] = useState(event?.date ?? date);
  const [allDay, setAllDay] = useState(!event?.time && !time);
  const [start, setStart] = useState(event?.time ?? time ?? "09:00");
  const [end, setEnd] = useState(event?.end ?? (time ? endOf(time) : "10:00"));
  const [location, setLocation] = useState(event?.location ?? "");
  const [note, setNote] = useState(event?.note ?? "");
  const [remind, setRemind] = useState(event?.remind ?? 0);
  const [freq, setFreq] = useState<SeriesFreq>((event?.freq as SeriesFreq) || "none");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const shared = Boolean(event?.shared);
  const fromGoogle = Boolean(event?.id.startsWith("gcal:"));
  const locked = shared || fromGoogle;

  const kindLabel: Record<EventKind, string> = {
    termin: t("appointment"),
    mahlzeit: t("meal"),
    sport: t("sport"),
    geburtstag: t("birthday"),
  };
  const freqLabel: Record<SeriesFreq, string> = {
    none: t("once"),
    daily: t("daily"),
    weekdays: t("weekdays"),
    "weekdays-sat": t("weekdaysSat"),
    weekly: t("weekly"),
    monthly: t("monthly"),
    quarterly: t("quarterly"),
    halfyearly: t("halfyearly"),
    yearly: t("yearly"),
  };

  async function save(series: boolean) {
    if (!title.trim() || locked) return;
    setBusy(true);
    const clock = allDay ? { time: "", end: "" } : { time: start, end: end > start ? end : endOf(start) };
    try {
      if (!event) {
        await journal.addEvent({
          title,
          kind,
          date: when,
          freq: kind === "geburtstag" && freq === "none" ? "yearly" : freq,
          ...(clock.time ? { time: clock.time, end: clock.end } : {}),
          ...(location ? { location } : {}),
          ...(note ? { note } : {}),
          ...(remind ? { remind } : {}),
          ...(until ? { until } : {}),
        });
      } else {
        await journal.patchEvent({
          id: event.id,
          series,
          title,
          kind,
          date: when,
          time: clock.time,
          end: clock.end,
          location,
          note,
          remind,
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto grid w-full max-w-lg gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
          <button type="button" className="min-h-12" onClick={onClose}>{t("back")}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((item) => (
            <button key={item} type="button" disabled={locked} className={`min-h-10 px-3 text-sm ${kind === item ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`} onClick={() => setKind(item)}>
              {kindLabel[item]}
            </button>
          ))}
        </div>
        <input value={title} disabled={locked} onChange={(input) => setTitle(input.target.value)} placeholder={t("title")} className="min-h-12 border-b border-ink/30 bg-transparent font-serif text-2xl" />
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input type="checkbox" checked={allDay} disabled={locked} onChange={(input) => setAllDay(input.target.checked)} />
          {t("allDay")}
        </label>
        <input type="date" value={when} disabled={locked} onChange={(input) => setWhen(input.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent" />
        {allDay ? null : (
          <div className="flex gap-3">
            <input type="time" aria-label="Von" value={start} disabled={locked} onChange={(input) => setStart(input.target.value)} className="min-h-12 flex-1 border-b border-ink/30 bg-transparent" />
            <input type="time" aria-label={t("until")} value={end} disabled={locked} onChange={(input) => setEnd(input.target.value)} className="min-h-12 flex-1 border-b border-ink/30 bg-transparent" />
          </div>
        )}
        <input value={location} disabled={locked} onChange={(input) => setLocation(input.target.value)} placeholder={t("place")} className="min-h-12 border-b border-ink/30 bg-transparent" />
        <input value={note} disabled={locked} onChange={(input) => setNote(input.target.value)} placeholder={t("note")} className="min-h-12 border-b border-ink/30 bg-transparent" />
        <label className="grid gap-1 text-sm">
          {t("remind")}
          <select value={remind} disabled={locked} onChange={(input) => setRemind(Number(input.target.value))} className="min-h-12 bg-transparent">
            {REMINDERS.map((minutes) => (
              <option key={minutes} value={minutes}>{remindLabel(minutes, t("noRemind"))}</option>
            ))}
          </select>
        </label>
        {event ? null : (
          <div className="flex flex-wrap gap-3">
            <select value={freq} onChange={(input) => setFreq(input.target.value as SeriesFreq)} className="min-h-12 bg-transparent">
              {FREQS.map((item) => (
                <option key={item} value={item}>{freqLabel[item]}</option>
              ))}
            </select>
            {freq !== "none" ? (
              <input type="date" value={until} aria-label={t("until")} onChange={(input) => setUntil(input.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent" />
            ) : null}
          </div>
        )}
        {fromGoogle ? <p className="text-base">Das liegt in Google. Den Tag änderst du mit Verschieben.</p> : null}
        {locked ? null : (
          <div className="grid gap-2">
            <button type="button" disabled={busy} className="min-h-12 bg-ink text-paper" onClick={() => void save(false)}>
              {event && event.freq !== "none" ? t("onlyThis") : t("save")}
            </button>
            {event && event.freq !== "none" ? (
              <button type="button" disabled={busy} className="min-h-12 ring-1 ring-ink/25" onClick={() => void save(true)}>
                {t("wholeSeries")}
              </button>
            ) : null}
            {event ? (
              <button type="button" className="min-h-12" onClick={() => { void journal.deleteEvent(event.id, false); onClose(); }}>
                {t("onlyThis")} löschen
              </button>
            ) : null}
            {event && event.freq !== "none" ? (
              <button type="button" className="min-h-12" onClick={() => { void journal.deleteEvent(event.id, true); onClose(); }}>
                {t("wholeSeries")} löschen
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function remindLabel(minutes: number, none: string) {
  if (minutes === 10) return "10 min";
  if (minutes === 30) return "30 min";
  if (minutes === 60) return "1 h";
  if (minutes === 1440) return "1 Tag";
  return none;
}
