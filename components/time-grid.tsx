"use client";

import { useEffect, useRef } from "react";
import { formatWeekday, iso } from "@/lib/dates";
import { clockOf, endOf, gridBounds, minutesOf, placeTimed, snapQuarter } from "@/lib/clock";
import type { DayEvent, DayLog, DayTodo, Profile } from "@/lib/types";
import { dayMark, solidHex } from "@/lib/voice";
import { useLang } from "@/components/lang";

const HOUR = 64;

export function TimeGrid({
  days,
  events,
  todos,
  profile,
  logs,
  today,
  onSlot,
  onOpen,
  onMove,
  onToggleTodo,
}: {
  days: Date[];
  events: DayEvent[];
  todos: DayTodo[];
  profile: Profile;
  logs: Record<string, DayLog>;
  today: string;
  onSlot: (date: string, time: string) => void;
  onOpen: (event: DayEvent) => void;
  onMove: (event: DayEvent, date: string, time: string) => void;
  onToggleTodo: (id: string) => void;
}) {
  const { lang, t } = useLang();
  const bounds = gridBounds(events);
  const hours: number[] = [];
  for (let minute = bounds.start; minute < bounds.end; minute += 60) hours.push(minute);
  const total = Math.max(60, bounds.end - bounds.start);
  const scroller = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const moved = useRef(false);
  const single = days.length === 1;

  useEffect(() => {
    const node = scroller.current?.querySelector("[data-now='true']");
    node?.scrollIntoView({ block: "center" });
  }, [days.length, today]);

  function timeAt(clientY: number, column: HTMLElement) {
    const rect = column.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return clockOf(snapQuarter(bounds.start + ratio * total));
  }

  return (
    <div ref={scroller} className="min-h-0 overflow-y-auto bg-paper min-[900px]:flex-1">
      {single ? (
        <DayHead
          date={days[0]}
          profile={profile}
          log={logs[iso(days[0])]}
          today={today}
          lang={lang}
          todayWord={t("todayWord")}
          large
          events={events}
          todos={todos}
          onOpen={onOpen}
          onToggleTodo={onToggleTodo}
        />
      ) : null}
      <div className="grid bg-paper" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {single
          ? <div />
          : days.map((date) => (
              <DayHead
                key={iso(date)}
                date={date}
                profile={profile}
                log={logs[iso(date)]}
                today={today}
                lang={lang}
                todayWord={t("todayWord")}
                events={events}
                todos={todos}
                onOpen={onOpen}
                onToggleTodo={onToggleTodo}
              />
            ))}
        <div>
          {hours.map((minute) => (
            <div key={minute} className="pr-2 text-right text-sm text-ink/40" style={{ height: HOUR }}>
              {clockOf(minute)}
            </div>
          ))}
        </div>
        {days.map((date) => {
          const key = iso(date);
          const mark = dayMark(profile, date, logs[key]);
          const fill = solidHex(mark.tint);
          const placed = placeTimed(events.filter((event) => event.date === key));
          const showNow = key === today;
          const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
          return (
            <div
              key={`${key}-col`}
              data-day={key}
              className="relative border-l border-ink/10 bg-paper"
              style={{ height: (total / 60) * HOUR }}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("[data-event]")) return;
                onSlot(key, timeAt(event.clientY, event.currentTarget));
              }}
            >
              {hours.map((minute) => (
                <div key={minute} className="border-b border-ink/10" style={{ height: HOUR }} />
              ))}
              {placed.map(({ event, column, columns }) => {
                const start = minutesOf(event.time ?? "00:00");
                const end = minutesOf(endOf(event.time ?? "00:00", event.end));
                const top = ((start - bounds.start) / total) * 100;
                const height = ((end - start) / total) * 100;
                return (
                  <button
                    key={event.id}
                    type="button"
                    data-event="true"
                    className="absolute z-[1] min-h-11 overflow-hidden rounded-[12px] px-2 py-1 text-left text-sm leading-snug text-paper transition-opacity duration-150"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `calc(${(column / columns) * 100}% + 2px)`,
                      width: `calc(${100 / columns}% - 4px)`,
                      background: fill,
                      opacity: dragId.current === event.id ? 0.7 : 1,
                    }}
                    onClick={(click) => {
                      click.stopPropagation();
                      if (moved.current) {
                        moved.current = false;
                        return;
                      }
                      onOpen(event);
                    }}
                    onPointerDown={(pointer) => {
                      if (event.shared || !event.time) return;
                      pointer.currentTarget.setPointerCapture(pointer.pointerId);
                      moved.current = false;
                      dragId.current = event.id;
                    }}
                    onPointerMove={(pointer) => {
                      if (dragId.current !== event.id) return;
                      if (Math.abs(pointer.movementX) + Math.abs(pointer.movementY) > 2) moved.current = true;
                    }}
                    onPointerUp={(pointer) => {
                      if (dragId.current !== event.id) return;
                      dragId.current = null;
                      if (!moved.current || !event.time) return;
                      const columnNode = document.elementFromPoint(pointer.clientX, pointer.clientY)?.closest("[data-day]");
                      const nextDate = columnNode?.getAttribute("data-day") ?? key;
                      const host = (columnNode as HTMLElement | null) ?? pointer.currentTarget.parentElement;
                      if (!host) return;
                      onMove(event, nextDate, timeAt(pointer.clientY, host));
                    }}
                  >
                    <span className="font-medium">{event.title}</span>
                    <span className="mt-0.5 block">
                      {event.time}–{endOf(event.time ?? "00:00", event.end)}
                    </span>
                  </button>
                );
              })}
              {showNow && nowMinutes >= bounds.start && nowMinutes <= bounds.end ? (
                <div data-now="true" className="pointer-events-none absolute right-0 left-0 z-20 h-px bg-ink" style={{ top: `${((nowMinutes - bounds.start) / total) * 100}%` }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayHead({
  date,
  profile,
  log,
  today,
  lang,
  todayWord,
  large,
  events,
  todos,
  onOpen,
  onToggleTodo,
}: {
  date: Date;
  profile: Profile;
  log?: DayLog;
  today: string;
  lang: string;
  todayWord: string;
  large?: boolean;
  events: DayEvent[];
  todos: DayTodo[];
  onOpen: (event: DayEvent) => void;
  onToggleTodo: (id: string) => void;
}) {
  const key = iso(date);
  const mark = dayMark(profile, date, log);
  const fill = solidHex(mark.tint);
  const isToday = key === today;
  const allDay = events.filter((event) => event.date === key && !event.time);
  const dayTodos = todos.filter((todo) => todo.date === key);
  return (
    <div className="border-b border-ink/10 bg-paper px-1 py-2">
      <p className="text-sm text-ink/70">{isToday ? todayWord : formatWeekday(date, lang)}</p>
      <p
        className={large ? "font-serif text-[40px] leading-none min-[900px]:text-6xl" : "font-serif text-[1.75rem] leading-none min-[900px]:text-[40px]"}
        style={isToday ? { color: fill } : undefined}
      >
        {date.getDate()}
      </p>
      {mark.band ? (
        <p className="mt-1 text-sm" style={{ color: fill }}>{mark.band}</p>
      ) : null}
      {allDay.length > 0 || dayTodos.length > 0 ? (
        <div className="mt-2 grid gap-1">
          {allDay.map((event) => (
            <button
              key={event.id}
              type="button"
              className="min-h-11 rounded-[12px] px-2 text-left text-sm text-paper transition-opacity duration-150"
              style={{ background: fill }}
              onClick={() => onOpen(event)}
            >
              {event.title}
            </button>
          ))}
          {dayTodos.map((todo) => (
            <button
              key={todo.id}
              type="button"
              className={`min-h-11 text-left text-sm ${todo.done ? "line-through" : ""}`}
              onClick={() => onToggleTodo(todo.id)}
            >
              {todo.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
