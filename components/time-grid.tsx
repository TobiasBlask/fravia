"use client";

import { useEffect, useRef } from "react";
import { formatWeekday, iso } from "@/lib/dates";
import { clockOf, endOf, gridBounds, minutesOf, placeTimed, snapQuarter } from "@/lib/clock";
import type { DayEvent, DayLog, DayTodo, Profile } from "@/lib/types";
import { dayMark, tintHex } from "@/lib/voice";
import { useLang } from "@/components/lang";

const HOUR = 52;

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
    <div ref={scroller} className="min-h-0 overflow-y-auto">
      <div className="grid" style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((date) => {
          const key = iso(date);
          const mark = dayMark(profile, date, logs[key]);
          const tint = tintHex(mark.tint);
          const allDay = events.filter((event) => event.date === key && !event.time);
          const dayTodos = todos.filter((todo) => todo.date === key);
          return (
            <div key={key} className="min-h-16 border-b border-ink/10 px-1 py-1" style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)` }}>
              <p className="text-[11px] uppercase tracking-wide">
                {key === today ? t("todayWord") : formatWeekday(date, lang)} {date.getDate()}
              </p>
              <p className="text-[11px]" style={{ color: tint }}>{mark.band}</p>
              <div className="mt-1 grid gap-1">
                {allDay.map((event) => (
                  <button key={event.id} type="button" className="truncate px-1 text-left text-xs" style={{ background: `color-mix(in srgb, ${tint} 45%, var(--paper))` }} onClick={() => onOpen(event)}>
                    {event.title}
                  </button>
                ))}
                {dayTodos.map((todo) => (
                  <button key={todo.id} type="button" className={`truncate px-1 text-left text-xs ${todo.done ? "line-through" : ""}`} onClick={() => onToggleTodo(todo.id)}>
                    {todo.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div>
          {hours.map((minute) => (
            <div key={minute} className="pr-1 text-right text-[11px] text-ink/60" style={{ height: HOUR }}>
              {clockOf(minute)}
            </div>
          ))}
        </div>
        {days.map((date) => {
          const key = iso(date);
          const mark = dayMark(profile, date, logs[key]);
          const tint = tintHex(mark.tint);
          const placed = placeTimed(events.filter((event) => event.date === key));
          const showNow = key === today;
          const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
          return (
            <div
              key={`${key}-col`}
              data-day={key}
              className="relative border-l border-ink/10"
              style={{ height: (total / 60) * HOUR, background: `color-mix(in srgb, ${tint} 10%, transparent)` }}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("[data-event]")) return;
                onSlot(key, timeAt(event.clientY, event.currentTarget));
              }}
            >
              {hours.map((minute) => (
                <div key={minute} className="border-b border-ink/10" style={{ height: HOUR }} />
              ))}
              {showNow && nowMinutes >= bounds.start && nowMinutes <= bounds.end ? (
                <div data-now="true" className="absolute right-0 left-0 z-10 h-px bg-ink" style={{ top: `${((nowMinutes - bounds.start) / total) * 100}%` }} />
              ) : null}
              {placed.map(({ event, column, columns }) => {
                const start = minutesOf(event.time ?? "00:00");
                const end = minutesOf(endOf(event.time ?? "00:00", event.end));
                const top = ((start - bounds.start) / total) * 100;
                const height = Math.max(8, ((end - start) / total) * 100);
                return (
                  <button
                    key={event.id}
                    type="button"
                    data-event="true"
                    className="absolute overflow-hidden px-1 text-left text-xs leading-tight"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${(column / columns) * 100}%`,
                      width: `${100 / columns}%`,
                      background: `color-mix(in srgb, ${tint} 62%, var(--paper))`,
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
                      const date = columnNode?.getAttribute("data-day") ?? key;
                      const host = (columnNode as HTMLElement | null) ?? pointer.currentTarget.parentElement;
                      if (!host) return;
                      const next = timeAt(pointer.clientY, host);
                      onMove(event, date, next);
                    }}
                  >
                    <span className="block truncate font-medium">{event.title}</span>
                    <span className="block truncate">{event.time}–{endOf(event.time ?? "00:00", event.end)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
