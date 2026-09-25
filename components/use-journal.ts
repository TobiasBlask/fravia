"use client";

import { useAuth } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { clearGuest, guestOn, readGuest, setGuestOn, writeGuest, type GuestStore } from "@/lib/guest";
import { seriesDates } from "@/lib/series";
import { iso, startOfMonth } from "@/lib/dates";
import type { DayEvent, DayLog, DayTodo, EventKind, Profile, SeriesFreq } from "@/lib/types";

const blank = (): GuestStore => ({
  profile: null,
  logs: [],
  events: [],
  todos: [],
  feedback: [],
});

export function useJournal() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const saveProfileMut = useMutation(api.journal.saveProfile);
  const saveDayMut = useMutation(api.journal.saveDay);
  const addEventMut = useMutation(api.life.addEvent);
  const deleteEventMut = useMutation(api.life.deleteEvent);
  const moveEventMut = useMutation(api.life.moveEvent);
  const addTodoMut = useMutation(api.life.addTodo);
  const toggleTodoMut = useMutation(api.life.toggleTodo);
  const deleteTodoMut = useMutation(api.life.deleteTodo);
  const patchTodoMut = useMutation(api.life.patchTodo);
  const createShareMut = useMutation(api.life.createShare);
  const saveFeedbackMut = useMutation(api.life.saveFeedback);
  const savePushMut = useMutation(api.life.savePush);
  const clearPushMut = useMutation(api.life.clearPush);
  const ensureFeedMut = useMutation(api.life.ensureFeed);
  const patchDetailsMut = useMutation(api.life.patchDetails);
  const interpret = useAction(api.life.interpret);
  const viewer = useQuery(api.journal.viewer, isAuthenticated ? {} : "skip");
  const shares = useQuery(api.life.myShares, isAuthenticated ? {} : "skip");
  const adjustments = useQuery(api.life.adjustments, isAuthenticated ? {} : "skip");
  const ensured = useRef(false);
  const [failed, setFailed] = useState(false);
  const [guestFlag, setGuestFlag] = useState(false);
  const [booted, setBooted] = useState(false);
  const [device, setDevice] = useState<GuestStore>(blank);
  const [revising, setRevising] = useState(false);
  const [optimistic, setOptimistic] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<Record<string, DayLog>>({});
  const [offer, setOffer] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const month = startOfMonth(today);
  const rangeStart = iso(new Date(month.getFullYear(), month.getMonth() - 6, 1));
  const rangeEnd = iso(new Date(month.getFullYear(), month.getMonth() + 7, 0));

  useEffect(() => {
    setGuestFlag(guestOn());
    setDevice(readGuest());
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      ensured.current = false;
      return;
    }
    if (ensured.current) return;
    ensured.current = true;
    ensureUser().catch(() => {
      ensured.current = false;
      setFailed(true);
    });
  }, [ensureUser, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const stored = readGuest();
    if (stored.logs.length || stored.events.length || stored.todos.length) setOffer(true);
  }, [isAuthenticated]);

  const guestMode = booted && !isSignedIn && guestFlag;
  const remoteLogs = useQuery(
    api.journal.daysInRange,
    isAuthenticated ? { start: rangeStart, end: rangeEnd } : "skip",
  );
  const span = useQuery(
    api.life.span,
    isAuthenticated ? { start: rangeStart, end: rangeEnd } : "skip",
  );

  const serverProfile: Profile | null =
    viewer?.state === "ready"
      ? {
          persona: viewer.profile.persona,
          lastPeriodStart: viewer.profile.lastPeriodStart,
          cycleLength: viewer.profile.cycleLength,
          periodLength: viewer.profile.periodLength,
          lutealLength: viewer.profile.lutealLength,
          packLength: viewer.profile.packLength,
          feedToken: viewer.profile.feedToken,
          diet: viewer.profile.diet,
          movement: viewer.profile.movement,
          referral: viewer.profile.referral,
          displayName: viewer.profile.displayName,
          irregular: viewer.profile.irregular,
          endo: viewer.profile.endo,
        }
      : null;

  const profile = guestMode ? device.profile : (optimistic ?? serverProfile);

  const logs = useMemo(() => {
    const merged: Record<string, DayLog> = {};
    if (guestMode) {
      for (const log of device.logs) merged[log.date] = log;
      return merged;
    }
    for (const log of remoteLogs ?? []) {
      merged[log.date] = {
        date: log.date,
        bleeding: log.bleeding,
        energy: log.energy,
        note: log.note,
        pain: log.pain,
        mood: log.mood,
        heat: log.heat,
        sleep: log.sleep,
        symptoms: log.symptoms,
        ovulation: log.ovulation,
      };
    }
    return { ...merged, ...localLogs };
  }, [device.logs, guestMode, localLogs, remoteLogs]);

  const events: DayEvent[] = guestMode
    ? device.events
    : [
        ...(span?.events ?? []).map(mapEvent),
        ...(span?.shared ?? []).map((row) => ({ ...mapShared(row), shared: true })),
      ];
  const todos: DayTodo[] = guestMode ? device.todos : (span?.todos ?? []).map(mapTodo);

  function commit(next: GuestStore) {
    writeGuest(next);
    setDevice(next);
  }

  async function saveProfile(next: Profile) {
    setBusy(true);
    setError(null);
    try {
      if (guestMode) {
        commit({ ...device, profile: { ...device.profile, ...next } });
        setRevising(false);
        return;
      }
      await saveProfileMut({
        persona: next.persona,
        ...(next.lastPeriodStart ? { lastPeriodStart: next.lastPeriodStart } : {}),
        ...(next.cycleLength ? { cycleLength: next.cycleLength } : {}),
        ...(next.periodLength ? { periodLength: next.periodLength } : {}),
        ...(next.lutealLength ? { lutealLength: next.lutealLength } : {}),
        ...(next.packLength ? { packLength: next.packLength } : {}),
        ...(next.irregular !== undefined ? { irregular: next.irregular } : {}),
      });
      setOptimistic({ ...(profile ?? next), ...next });
      setRevising(false);
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }

  async function saveDay(log: DayLog) {
    setBusy(true);
    try {
      if (guestMode) {
        commit({
          ...device,
          logs: [...device.logs.filter((item) => item.date !== log.date), log],
        });
        return;
      }
      setLocalLogs((current) => ({ ...current, [log.date]: log }));
      await saveDayMut(log);
    } finally {
      setBusy(false);
    }
  }

  async function addEvent(input: {
    title: string;
    kind: EventKind;
    date: string;
    time?: string;
    note?: string;
    freq: SeriesFreq;
    until?: string;
  }) {
    if (!input.title.trim()) return;
    if (guestMode) {
      const seriesId = crypto.randomUUID();
      const freq = input.freq;
      const rows = seriesDates(input.date, freq, input.until).map((date) => ({
        id: crypto.randomUUID(),
        title: input.title.trim(),
        kind: input.kind,
        date,
        freq,
        seriesId,
        ...(input.time ? { time: input.time } : {}),
        ...(input.note ? { note: input.note } : {}),
      }));
      commit({ ...device, events: [...device.events, ...rows] });
      return;
    }
    await addEventMut(input);
  }

  async function deleteEvent(id: string, series: boolean) {
    if (guestMode) {
      const row = device.events.find((item) => item.id === id);
      commit({
        ...device,
        events: device.events.filter((item) =>
          series && row ? item.seriesId !== row.seriesId : item.id !== id,
        ),
      });
      return;
    }
    await deleteEventMut({ id: id as Id<"events">, series });
  }

  async function moveEvent(id: string, date: string) {
    if (guestMode) {
      commit({
        ...device,
        events: device.events.map((item) => (item.id === id ? { ...item, date } : item)),
      });
      return;
    }
    await moveEventMut({ id: id as Id<"events">, date });
  }

  async function addTodo(input: {
    title: string;
    date: string;
    freq: SeriesFreq;
    until?: string;
    energy?: number;
    flexible?: boolean;
  }) {
    if (!input.title.trim()) return;
    if (guestMode) {
      const seriesId = crypto.randomUUID();
      const rows = seriesDates(input.date, input.freq, input.until).map((date) => ({
        id: crypto.randomUUID(),
        title: input.title.trim(),
        date,
        done: false,
        freq: input.freq,
        seriesId,
        ...(input.energy ? { energy: input.energy } : {}),
        ...(input.flexible ? { flexible: true } : {}),
      }));
      commit({ ...device, todos: [...device.todos, ...rows] });
      return;
    }
    await addTodoMut(input);
  }

  async function toggleTodo(id: string) {
    if (guestMode) {
      commit({
        ...device,
        todos: device.todos.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item,
        ),
      });
      return;
    }
    await toggleTodoMut({ id: id as Id<"todos"> });
  }

  async function deleteTodo(id: string, series: boolean) {
    if (guestMode) {
      const row = device.todos.find((item) => item.id === id);
      commit({
        ...device,
        todos: device.todos.filter((item) =>
          series && row ? item.seriesId !== row.seriesId : item.id !== id,
        ),
      });
      return;
    }
    await deleteTodoMut({ id: id as Id<"todos">, series });
  }

  async function patchTodo(id: string, patch: { title?: string; energy?: number; flexible?: boolean }) {
    if (guestMode) {
      commit({
        ...device,
        todos: device.todos.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      });
      return;
    }
    await patchTodoMut({ id: id as Id<"todos">, ...patch });
  }

  async function createShare(hidePhase: boolean) {
    if (guestMode) return null;
    return await createShareMut({ hidePhase });
  }

  async function saveFeedback(message: string, category: string) {
    if (!message.trim()) return;
    if (guestMode) {
      commit({
        ...device,
        feedback: [...device.feedback, { message, category }],
      });
      return;
    }
    await saveFeedbackMut({ message, category });
  }

  async function patchDetails(patch: {
    diet?: string;
    movement?: string;
    referral?: string;
    displayName?: string;
    irregular?: boolean;
    endo?: Profile["endo"];
  }) {
    if (guestMode && device.profile) {
      commit({ ...device, profile: { ...device.profile, ...patch } });
      return;
    }
    await patchDetailsMut(patch);
    if (profile) setOptimistic({ ...profile, ...patch });
  }

  async function ensureFeed() {
    if (guestMode) return null;
    return await ensureFeedMut({});
  }

  async function savePush(endpoint: string, keys?: string) {
    if (guestMode) return;
    await savePushMut({ endpoint, ...(keys ? { keys } : {}) });
  }

  async function clearPush() {
    if (guestMode) return;
    await clearPushMut({});
  }

  async function hear(transcript: string) {
    if (guestMode) return { mode: "local" as const, transcript };
    return await interpret({ transcript });
  }

  async function takeDevice() {
    const stored = readGuest();
    for (const log of stored.logs) await saveDayMut(log);
    for (const event of stored.events) {
      await addEventMut({
        title: event.title,
        kind: event.kind,
        date: event.date,
        freq: "none",
        ...(event.time ? { time: event.time } : {}),
        ...(event.note ? { note: event.note } : {}),
      });
    }
    for (const todo of stored.todos) {
      await addTodoMut({
        title: todo.title,
        date: todo.date,
        freq: "none",
        ...(todo.energy ? { energy: todo.energy } : {}),
        ...(todo.flexible ? { flexible: true } : {}),
        ...(todo.done ? { done: true } : {}),
      });
    }
    for (const note of stored.feedback) {
      await saveFeedbackMut(note);
    }
    clearGuest();
    setDevice(blank());
    setOffer(false);
  }

  function enterGuest() {
    setGuestOn(true);
    setGuestFlag(true);
  }

  function wipeGuest() {
    clearGuest();
    setDevice(blank());
    setGuestFlag(false);
  }

  let status: "loading" | "gate" | "failed" | "onboarding" | "ready" = "loading";
  if (!isLoaded || !booted) status = "loading";
  else if (!isSignedIn && !guestMode) status = "gate";
  else if (guestMode && (revising || !profile)) status = "onboarding";
  else if (guestMode && profile) status = "ready";
  else if (isSignedIn && (isLoading || viewer === undefined || viewer.state === "pending")) status = "loading";
  else if (failed || (!isLoading && !isAuthenticated) || !viewer || viewer.state === "signed-out") status = "failed";
  else if (revising || !profile) status = "onboarding";
  else status = "ready";

  return {
    status,
    guestMode,
    profile,
    logs,
    events,
    todos,
    shares: shares ?? [],
    adjustments: adjustments ?? [],
    busy,
    error,
    offer,
    focus,
    setFocus,
    setRevising,
    saveProfile,
    saveDay,
    addEvent,
    deleteEvent,
    moveEvent,
    addTodo,
    toggleTodo,
    deleteTodo,
    patchTodo,
    createShare,
    saveFeedback,
    patchDetails,
    ensureFeed,
    savePush,
    clearPush,
    hear,
    takeDevice,
    dismissOffer: () => setOffer(false),
    enterGuest,
    wipeGuest,
  };
}

function mapEvent(row: {
  _id: string;
  title: string;
  kind: EventKind;
  date: string;
  time?: string;
  note?: string;
  freq: string;
  seriesId: string;
}): DayEvent {
  return {
    id: row._id,
    title: row.title,
    kind: row.kind,
    date: row.date,
    time: row.time,
    note: row.note,
    freq: row.freq,
    seriesId: row.seriesId,
  };
}

function mapShared(row: {
  _id: string;
  title: string;
  kind: EventKind;
  date: string;
  time?: string;
  note?: string;
  freq: string;
  seriesId: string;
}): DayEvent {
  return mapEvent(row);
}

function mapTodo(row: {
  _id: string;
  title: string;
  date: string;
  done: boolean;
  freq: string;
  seriesId: string;
  energy?: number;
  flexible?: boolean;
}): DayTodo {
  return {
    id: row._id,
    title: row.title,
    date: row.date,
    done: row.done,
    freq: row.freq,
    seriesId: row.seriesId,
    energy: row.energy,
    flexible: row.flexible,
  };
}
