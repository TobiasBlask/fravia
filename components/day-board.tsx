"use client";

import { useState } from "react";
import { useLang } from "@/components/lang";
import type { useJournal } from "@/components/use-journal";
import type { EventKind, SeriesFreq } from "@/lib/types";

const KINDS: EventKind[] = ["termin", "mahlzeit", "sport", "geburtstag"];
const FREQS: SeriesFreq[] = [
  "none",
  "daily",
  "weekdays",
  "weekdays-sat",
  "weekly",
  "monthly",
  "quarterly",
  "halfyearly",
  "yearly",
];

export function DayBoard({
  date,
  journal,
}: {
  date: string;
  journal: ReturnType<typeof useJournal>;
}) {
  const { t } = useLang();
  const events = journal.events.filter((item) => item.date === date);
  const todos = journal.todos.filter((item) => item.date === date);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("termin");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [freq, setFreq] = useState<SeriesFreq>("none");
  const [until, setUntil] = useState("");
  const [task, setTask] = useState("");
  const [taskFreq, setTaskFreq] = useState<SeriesFreq>("none");
  const [effort, setEffort] = useState(2);
  const [flexible, setFlexible] = useState(false);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState(date);

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

  return (
    <section className="mt-8 border-t border-ink/10 pt-6">
      <p className="text-[11px] uppercase tracking-[0.16em]">{t("day")}</p>
      {events.length === 0 && todos.length === 0 ? (
        <p className="mt-3 text-sm leading-snug">{t("emptyDay")}</p>
      ) : null}
      <ul className="mt-3 grid gap-2">
        {events.map((event) => (
          <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p>
                {event.time ? `${event.time} ` : ""}
                {event.title}
              </p>
              <p className="text-ink/60">
                {kindLabel[event.kind]}
                {event.shared ? ` · ${t("shared")}` : ""}
                {event.freq !== "none" ? ` · ${freqLabel[event.freq as SeriesFreq] ?? event.freq}` : ""}
              </p>
            </div>
            {event.shared ? null : (
              <div className="flex shrink-0 gap-3">
                <button type="button" className="min-h-10" onClick={() => setMoveId(event.id)}>
                  {t("moveDay")}
                </button>
                <button type="button" className="min-h-10" onClick={() => journal.deleteEvent(event.id, false)}>
                  {t("onlyThis")}
                </button>
                {event.freq !== "none" ? (
                  <button type="button" className="min-h-10" onClick={() => journal.deleteEvent(event.id, true)}>
                    {t("wholeSeries")}
                  </button>
                ) : null}
              </div>
            )}
          </li>
        ))}
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-start justify-between gap-3 text-sm">
            <button type="button" className="min-h-10 text-left" onClick={() => journal.toggleTodo(todo.id)}>
              <span className={todo.done ? "line-through" : ""}>{todo.title}</span>
              <span className="mt-1 block text-ink/60">
                {t("task")}
                {todo.flexible ? ` · ${t("flexible")}` : ""}
                {todo.energy ? ` · ${t("effort")} ${todo.energy}` : ""}
              </span>
            </button>
            <button type="button" className="min-h-10 shrink-0" onClick={() => journal.deleteTodo(todo.id, todo.freq !== "none")}>
              {todo.freq !== "none" ? t("wholeSeries") : t("onlyThis")}
            </button>
          </li>
        ))}
      </ul>
      {moveId ? (
        <form
          className="mt-4 flex items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void journal.moveEvent(moveId, moveDate);
            setMoveId(null);
          }}
        >
          <input type="date" value={moveDate} onChange={(event) => setMoveDate(event.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent" />
          <button type="submit" className="min-h-12">{t("save")}</button>
        </form>
      ) : null}
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void journal.addEvent({
            title,
            kind,
            date,
            freq,
            ...(time ? { time } : {}),
            ...(note ? { note } : {}),
            ...(until ? { until } : {}),
          });
          setTitle("");
          setNote("");
        }}
      >
        <div className="flex flex-wrap gap-2">
          {KINDS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKind(item)}
              className={`min-h-10 px-3 text-sm ${kind === item ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}
            >
              {kindLabel[item]}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("title")}
          className="min-h-12 border-b border-ink/30 bg-transparent"
        />
        <div className="flex flex-wrap gap-3">
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent" />
          <select value={freq} onChange={(event) => setFreq(event.target.value as SeriesFreq)} className="min-h-12 bg-transparent">
            {FREQS.map((item) => (
              <option key={item} value={item}>{freqLabel[item]}</option>
            ))}
          </select>
          {freq !== "none" ? (
            <input type="date" value={until} onChange={(event) => setUntil(event.target.value)} aria-label={t("until")} className="min-h-12 border-b border-ink/30 bg-transparent" />
          ) : null}
        </div>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("note")} className="min-h-12 border-b border-ink/30 bg-transparent" />
        <button type="submit" className="min-h-12 bg-ink text-paper">{t("add")}</button>
      </form>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void journal.addTodo({
            title: task,
            date,
            freq: taskFreq,
            energy: effort,
            flexible,
            ...(until ? { until } : {}),
          });
          setTask("");
        }}
      >
        <input value={task} onChange={(event) => setTask(event.target.value)} placeholder={t("task")} className="min-h-12 border-b border-ink/30 bg-transparent" />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select value={taskFreq} onChange={(event) => setTaskFreq(event.target.value as SeriesFreq)} className="min-h-12 bg-transparent">
            {FREQS.map((item) => (
              <option key={item} value={item}>{freqLabel[item]}</option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            {t("effort")}
            <input type="number" min={1} max={5} value={effort} onChange={(event) => setEffort(Number(event.target.value))} className="w-14 bg-transparent" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flexible} onChange={(event) => setFlexible(event.target.checked)} />
            {t("flexible")}
          </label>
        </div>
        <button type="submit" className="min-h-12 ring-1 ring-ink/25">{t("task")}</button>
      </form>
    </section>
  );
}
